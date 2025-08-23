import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from postgrest.exceptions import APIError as PostgrestAPIError
from applications.supabase_client import supabase
from applications.auto_screening import preprocess_answers, run_auto_screening
from applications.cv_parser import extract_text_from_pdf, extract_text_from_docx, parse_cv_text
from applications.model_utils import get_ai_score
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta, date, time
import logging
import pytz
from django.db import transaction
from .models import Job, Applicant, Question, AssessmentAnswer, AssessmentTemplate

logger = logging.getLogger(__name__)

# Daftar jenis pertanyaan yang membutuhkan review manual
MANUAL_REVIEW_TYPES = ['ESSAY', 'FILE_UPLOAD', 'CODING_CHALLENGE', 'TEXT_INPUT']

@csrf_exempt
def apply(request):
    if request.method == 'POST':
        print("\n[APPLY] Menerima permintaan lamaran baru.")
        try:
            data = json.loads(request.body)
            name = data.get('name')
            email = data.get('email')
            job_id = data.get('job_id')
            user_id = data.get('user_id')
            uploaded_files = data.get('uploaded_files')
            company = data.get('company')

            custom_answers = data.get('custom_answers', {})

            if not all([job_id, name, email]):
                print("[APPLY] Gagal: Data yang dibutuhkan (job_id, name, email) tidak lengkap.")
                return JsonResponse({'error': 'Job ID, name, and email are required.'}, status=400)

            print(f"[APPLY] Memproses lamaran dari '{name}' untuk job ID '{job_id}'.")
            
            try:
                job_data_response = supabase.from_('jobs').select('custom_fields, title, recruitment_process_type').eq('id', job_id).single().execute()
                job_data = job_data_response.data
            except PostgrestAPIError as e:
                print(f"[APPLY] Gagal: Error saat mengambil data job. {e.message}")
                return JsonResponse({'error': f'Failed to fetch job: {e.message}'}, status=500)
            
            if not job_data:
                print(f"[APPLY] Gagal: Lowongan dengan ID '{job_id}' tidak ditemukan.")
                return JsonResponse({'error': 'Job not found.'}, status=404)

            screening_result = None
            auto_screening_status = 'Pending'
            applicant_status = 'Applied'
            ai_score = None
            final_score = None

            cv_path = None
            for file_path in uploaded_files:
                cv_path = file_path
                break

            cv_text = None
            if cv_path:
                print(f"[APPLY] Mengunduh CV dari Supabase Storage: {cv_path}")
                try:
                    res = supabase.storage.from_('candidate-uploads').download(cv_path)
                    
                    if cv_path.endswith('.pdf'):
                        cv_text = extract_text_from_pdf(res)
                    elif cv_path.endswith('.docx'):
                        cv_text = extract_text_from_docx(res)
                    
                    if cv_text:
                        cv_data = parse_cv_text(cv_text)
                        print(f"[APPLY] Data CV berhasil diekstrak: {cv_data}")
                        
                        combined_answers = {**custom_answers, **cv_data}
                        
                        ai_score_data = get_ai_score(cv_data, job_data)
                        ai_score = ai_score_data['score']
                        print(f"[APPLY] Skor AI: {ai_score}")

                        if job_data.get('custom_fields') and combined_answers:
                            print("[APPLY] Menjalankan auto-screening...")
                            processed_answers = preprocess_answers(job_data['custom_fields'], combined_answers)
                            screening_result = run_auto_screening(job_data['custom_fields'], processed_answers, ai_score)
                            auto_screening_status = screening_result['status']
                            final_score = screening_result.get('final_score')
                            
                            if auto_screening_status == 'Lolos':
                                applicant_status = 'Shortlisted'
                            elif auto_screening_status == 'Tidak Lolos':
                                applicant_status = 'Rejected'
                            else:
                                applicant_status = 'Needs Review'
                    else:
                        print("[APPLY] Gagal: Tidak bisa mengekstrak teks dari CV.")
                        auto_screening_status = 'Review'
                        screening_result = {'status': 'Review', 'log': {'Review': [{'reason': 'Gagal memproses CV.'}]}}
                    
                except Exception as e:
                    print(f"[APPLY] Peringatan: Gagal memproses CV. {e}")
                    auto_screening_status = 'Review'
                    screening_result = {'status': 'Review', 'log': {'Review': [{'reason': f'Error saat memproses CV: {e}'}]}}

            else:
                combined_answers = custom_answers
                if job_data.get('custom_fields'):
                    screening_result = run_auto_screening(job_data['custom_fields'], combined_answers, ai_score)
                    auto_screening_status = screening_result['status']
                    final_score = screening_result.get('final_score')
                    if auto_screening_status == 'Lolos':
                        applicant_status = 'Shortlisted'
                    elif auto_screening_status == 'Tidak Lolos':
                        applicant_status = 'Rejected'
                    else:
                        applicant_status = 'Needs Review'
            
            print(f"[APPLY] Hasil Screening Otomatis: {auto_screening_status}")
            print(f"[APPLY] Total Skor Final: {final_score}")
            print(f"[APPLY] Detail Log: {screening_result.get('log')}")

            insert_data = {
                'name': name,
                'email': email,
                'job_id': job_id,
                'user_id': user_id,
                'status': applicant_status,
                'uploaded_files': uploaded_files,
                'company': company,
                'custom_answers': custom_answers,
                'auto_screening_status': auto_screening_status,
                'auto_screening_log': screening_result['log'] if screening_result else {},
                'ai_score': int(round(ai_score)) if ai_score is not None else None,
                'final_score': int(round(final_score)) if final_score is not None else None
            }
            try:
                print("[APPLY] Menyimpan data pelamar ke Supabase...")
                insert_response = supabase.from_('applicants').insert(insert_data).execute()
                applicant_id = insert_response.data[0]['id']
                print("[APPLY] Berhasil: Data pelamar berhasil disimpan.")

                if auto_screening_status == 'Lolos':
                    print(f"[APPLY] Status pelamar lolos, memicu penjadwalan otomatis untuk Job ID: {job_id}")
                    auto_schedule_interviews(request, job_id)

            except PostgrestAPIError as e:
                print(f"[APPLY] Gagal: Error saat menyimpan data ke Supabase. {e.message}")
                return JsonResponse({'error': f'Failed to save application: {e.message}'}, status=500)

            print("[APPLY] Lamaran berhasil diproses.")
            return JsonResponse({
                'message': 'Lamaran Anda berhasil dikirim!',
                'screening_result': screening_result,
                'applicant_status': applicant_status
            })

        except Exception as e:
            print(f"[APPLY] Terjadi kesalahan tak terduga: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    return HttpResponse(status=405)

@csrf_exempt
def rescreen_applicant(request):
    if request.method == 'POST':
        print("\n[RESCREEN] Menerima permintaan rescreening.")
        try:
            data = json.loads(request.body)
            applicant_id = data.get('applicant_id')

            if not applicant_id:
                print("[RESCREEN] Gagal: applicant_id tidak ditemukan.")
                return JsonResponse({'error': 'applicant_id is required.'}, status=400)
            
            print(f"[RESCREEN] Memproses rescreening untuk applicant ID: {applicant_id}")

            try:
                applicant_response = supabase.from_('applicants').select('job_id, custom_answers, uploaded_files, user_id').eq('id', applicant_id).single().execute()
                applicant_data = applicant_response.data
            except PostgrestAPIError as e:
                print(f"[RESCREEN] Gagal: Error saat mengambil data pelamar. {e.message}")
                return JsonResponse({'error': f'Failed to fetch applicant: {e.message}'}, status=500)
            
            if not applicant_data:
                print(f"[RESCREEN] Gagal: Pelamar dengan ID '{applicant_id}' tidak ditemukan.")
                return JsonResponse({'error': 'Applicant not found.'}, status=404)
            
            cv_path = None
            if applicant_data.get('uploaded_files'):
                cv_path = applicant_data['uploaded_files'][0]
            
            cv_text = None
            cv_data = {}
            ai_score = None
            final_score = None
            if cv_path:
                try:
                    print(f"[RESCREEN] Mengunduh CV untuk rescreening dari: {cv_path}")
                    res = supabase.storage.from_('candidate-uploads').download(cv_path)
                    
                    if cv_path.endswith('.pdf'):
                        cv_text = extract_text_from_pdf(res)
                    elif cv_path.endswith('.docx'):
                        cv_text = extract_text_from_docx(res)
                    
                    if cv_text:
                        cv_data = parse_cv_text(cv_text)
                        
                except Exception as e:
                    print(f"[RESCREEN] Peringatan: Gagal memproses CV. {e}")
            
            combined_answers = {**applicant_data['custom_answers'], **cv_data}
            
            print("[RESCREEN] Menjalankan auto-screening ulang...")
            print(f"[RESCREEN] Data yang digunakan untuk screening: {combined_answers}")
            job_response = supabase.from_('jobs').select('custom_fields, title, recruitment_process_type').eq('id', applicant_data['job_id']).single().execute()
            job_data = job_response.data
            if not job_data:
                print(f"[RESCREEN] Gagal: Lowongan dengan ID '{applicant_data['job_id']}' tidak ditemukan.")
                return JsonResponse({'error': 'Job not found.'}, status=404)
            
            ai_score_data = get_ai_score(cv_data, job_data)
            ai_score = ai_score_data['score']
            
            if job_data.get('custom_fields') and combined_answers:
                screening_result = run_auto_screening(job_data['custom_fields'], combined_answers, ai_score)
            else:
                screening_result = {'status': 'Needs Review', 'log': {'Review': [{'reason': 'Tidak ada custom fields atau jawaban.'}]}}

            new_status = screening_result['status']
            final_score = screening_result.get('final_score')
            if new_status == 'Lolos':
                applicant_status = 'Shortlisted'
            elif new_status == 'Tidak Lolos':
                applicant_status = 'Rejected'
            else:
                applicant_status = 'Needs Review'
            
            try:
                print(f"[RESCREEN] Memperbarui status pelamar menjadi '{applicant_status}' di Supabase...")
                supabase.from_('applicants').update({
                    'status': applicant_status,
                    'auto_screening_status': new_status,
                    'auto_screening_log': screening_result['log'],
                    'ai_score': int(round(ai_score)) if ai_score is not None else None,
                    'final_score': int(round(final_score)) if final_score is not None else None
                }).eq('id', applicant_id).execute()
                print("[RESCREEN] Berhasil: Status pelamar berhasil diperbarui.")

                if new_status == 'Lolos':
                    print(f"[RESCREEN] Status pelamar lolos, memicu penjadwalan otomatis untuk Job ID: {applicant_data['job_id']}")
                    auto_schedule_interviews(request, applicant_data['job_id'])

            except PostgrestAPIError as e:
                print(f"[RESCREEN] Gagal: Error saat memperbarui status di Supabase. {e.message}")
                return JsonResponse({'error': f'Failed to update applicant status: {e.message}'}, status=500)
                
            print("[RESCREEN] Rescreening berhasil diproses.")
            return JsonResponse({
                'message': 'Auto-screening completed successfully.', 
                'new_status': new_status, 
                'applicant_status': applicant_status,
                'ai_score': int(round(ai_score)), 
                'final_score': int(round(final_score))
            })
        
        except Exception as e:
            print(f"[RESCREEN] Terjadi kesalahan tak terduga: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    return HttpResponse(status=405)

@api_view(['POST'])
def auto_schedule_interviews(request, job_id):
    try:
        job_response = supabase.from_('jobs').select('*').eq('id', job_id).single().execute()
        job_data = job_response.data
        
        if not job_data:
            return Response({"error": "Lowongan pekerjaan tidak ditemukan di Supabase."}, status=404)

        if not all([
            job_data.get('schedule_start_date'),
            job_data.get('schedule_end_date'),
            job_data.get('daily_start_time'),
            job_data.get('daily_end_time'),
            job_data.get('duration_per_interview_minutes')
        ]):
            return Response({"error": "Parameter penjadwalan pekerjaan tidak diatur sepenuhnya di Supabase."}, status=400)

        existing_schedules_response = supabase.from_('schedules').select('interview_time').eq('job_id', job_id).execute()
        existing_schedules = {datetime.fromisoformat(s['interview_time']): True for s in existing_schedules_response.data}

        applicants_response = supabase.from_('applicants').select('id, name').eq('job_id', job_id).eq('auto_screening_status', 'Lolos').execute()
        applicants_data = applicants_response.data

        if not applicants_data:
            return Response({"message": "Tidak ada kandidat dengan status Lolos."}, status=200)

        # Tambahkan filter untuk mengecualikan pelamar yang sudah memiliki jadwal
        scheduled_applicant_ids_response = supabase.from_('schedules').select('applicant_id').eq('job_id', job_id).execute()
        scheduled_applicant_ids = {s['applicant_id'] for s in scheduled_applicant_ids_response.data}

        applicants_to_schedule = [app for app in applicants_data if app['id'] not in scheduled_applicant_ids]

        if not applicants_to_schedule:
            return Response({"message": "Semua kandidat lolos sudah dijadwalkan."}, status=200)

        wib_tz = pytz.timezone('Asia/Jakarta')
        
        start_date = datetime.strptime(job_data['schedule_start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(job_data['schedule_end_date'], '%Y-%m-%d').date()
        
        daily_start_time_str = job_data['daily_start_time']
        daily_end_time_str = job_data['daily_end_time']
        
        duration = timedelta(minutes=job_data['duration_per_interview_minutes'])

        current_datetime = wib_tz.localize(datetime.combine(start_date, datetime.strptime(daily_start_time_str, '%H:%M:%S').time()))
        end_datetime_boundary = wib_tz.localize(datetime.combine(end_date, datetime.strptime(daily_end_time_str, '%H:%M:%S').time()))

        scheduled_applicants = []
        for applicant in applicants_to_schedule:
            found_slot = False
            while current_datetime <= end_datetime_boundary:
                daily_end_datetime = wib_tz.localize(datetime.combine(current_datetime.date(), datetime.strptime(daily_end_time_str, '%H:%M:%S').time()))
                
                if current_datetime in existing_schedules:
                    current_datetime += duration
                    continue

                if current_datetime + duration <= daily_end_datetime:
                    interview_time_utc = current_datetime.astimezone(pytz.utc)

                    schedule_data = {
                        'applicant_id': applicant['id'],
                        'job_id': job_id,
                        'interview_time': interview_time_utc.isoformat()
                    }
                    supabase.from_('schedules').insert(schedule_data).execute()
                    
                    supabase.from_('applicants').update({'status': 'scheduled'}).eq('id', applicant['id']).execute()
                    
                    scheduled_applicants.append({
                        "name": applicant['name'],
                        "interview_time": current_datetime.isoformat()
                    })

                    current_datetime += duration
                    found_slot = True
                    break
                else:
                    current_datetime = wib_tz.localize(datetime.combine(current_datetime.date() + timedelta(days=1), datetime.strptime(daily_start_time_str, '%H:%M:%S').time()))
            
            if not found_slot:
                logger.warning(f"Tidak ada slot kosong untuk pelamar {applicant['id']}.")

        return Response({"message": "Penjadwalan berhasil.", "schedules": scheduled_applicants}, status=200)

    except PostgrestAPIError as e:
        logger.error(f"Error Supabase saat auto-scheduling: {e.message}")
        return Response({"error": f"Error Supabase: {e.message}"}, status=500)
    except Exception as e:
        logger.error(f"Error tak terduga saat auto-scheduling: {e}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
def reschedule_applicant(request):
    try:
        data = json.loads(request.body)
        schedule_id = data.get('schedule_id')
        new_interview_time_str = data.get('new_interview_time')

        if not all([schedule_id, new_interview_time_str]):
            return Response({"error": "schedule_id dan new_interview_time diperlukan."}, status=400)

        wib_tz = pytz.timezone('Asia/Jakarta')
        new_interview_time = wib_tz.localize(datetime.fromisoformat(new_interview_time_str))

        new_interview_time_utc = new_interview_time.astimezone(pytz.utc)

        update_response = supabase.from_('schedules').update({
            'interview_time': new_interview_time_utc.isoformat()
        }).eq('id', schedule_id).execute()

        if not update_response.data:
            return Response({"error": "Jadwal tidak ditemukan."}, status=404)

        return Response({"message": "Jadwal berhasil diperbarui."}, status=200)

    except Exception as e:
        logger.error(f"Error saat reschedule: {e}")
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
def request_reschedule_applicant(request):
    try:
        data = json.loads(request.body)
        applicant_id = data.get('applicant_id')

        if not applicant_id:
            return Response({"error": "applicant_id diperlukan."}, status=400)

        supabase.from_('schedules').delete().eq('applicant_id', applicant_id).execute()

        supabase.from_('applicants').update({
            'status': 'Shortlisted',
            'auto_screening_status': 'Lolos'
        }).eq('id', applicant_id).execute()

        return Response({"message": "Permintaan penjadwalan ulang berhasil dikirim. Jadwal baru akan segera dibuat."}, status=200)

    except Exception as e:
        logger.error(f"Error saat meminta reschedule: {e}")
        return Response({"error": str(e)}, status=500)

# VIEW BARU: Manajemen Bank Soal (Questions)
@api_view(['POST', 'GET'])
def manage_question_bank(request):
    if request.method == 'POST':
        data = request.data
        question = Question.objects.create(
            text=data.get('text'),
            question_type=data.get('question_type'),
            options=data.get('options'),
            solution=data.get('solution'),
        )
        return Response({"message": "Question created in bank successfully.", "id": question.id}, status=status.HTTP_201_CREATED)
    
    elif request.method == 'GET':
        questions = Question.objects.all().values()
        return Response(list(questions), status=status.HTTP_200_OK)

# VIEW BARU: Manajemen Template
@api_view(['POST', 'GET'])
def manage_assessment_templates(request):
    if request.method == 'POST':
        data = request.data
        template = AssessmentTemplate.objects.create(
            name=data.get('name'),
            description=data.get('description')
        )
        return Response({"message": "Template created successfully.", "id": template.id}, status=status.HTTP_201_CREATED)
    
    elif request.method == 'GET':
        templates = AssessmentTemplate.objects.all().values()
        return Response(list(templates), status=status.HTTP_200_OK)

# VIEW BARU: Mengelola Pertanyaan di dalam Template
@api_view(['POST'])
def add_question_to_template(request, template_id):
    try:
        template = AssessmentTemplate.objects.get(id=template_id)
        question_id = request.data.get('question_id')
        question = Question.objects.get(id=question_id)
        template.questions.add(question)
        return Response({"message": "Question added to template successfully."}, status=status.HTTP_200_OK)
    except (AssessmentTemplate.DoesNotExist, Question.DoesNotExist) as e:
        return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)

# VIEW BARU: Mengambil Pertanyaan untuk Asesmen Job
@api_view(['GET'])
def get_job_assessment_questions(request, job_id):
    try:
        job = Job.objects.get(id=job_id)
        questions = []
        
        if job.assessment_template:
            template_questions = job.assessment_template.questions.all()
            questions.extend(template_questions)
        
        custom_questions = job.custom_questions.all()
        questions.extend(custom_questions)
        
        formatted_questions = [{
            'id': q.id, 
            'text': q.text, 
            'question_type': q.question_type, 
            'options': q.options,
            'solution': q.solution,
        } for q in questions]
        
        return Response(formatted_questions, status=status.HTTP_200_OK)

    except Job.DoesNotExist:
        return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

# Modifikasi fungsi submit_assessment
@api_view(['POST'])
def submit_assessment(request, applicant_id):
    try:
        applicant = Applicant.objects.get(id=applicant_id)
    except Applicant.DoesNotExist:
        return Response({"error": "Applicant not found."}, status=status.HTTP_404_NOT_FOUND)
        
    data = request.data
    answers = data.get('answers', [])
    
    requires_manual_review = False
    total_score = 0
    total_questions = len(answers)

    with transaction.atomic():
        AssessmentAnswer.objects.filter(applicant=applicant).delete()
        
        for answer_data in answers:
            question_id = answer_data.get('question_id')
            answer_text = answer_data.get('answer')
            
            try:
                question = Question.objects.get(id=question_id)
            except Question.DoesNotExist:
                return Response({"error": f"Question with ID {question_id} not found."}, status=status.HTTP_404_NOT_FOUND)

            answer_score = 0
            is_correct = None

            if question.question_type in MANUAL_REVIEW_TYPES:
                requires_manual_review = True
                is_correct = None
            elif question.question_type == 'SINGLE_CHOICE' or question.question_type == 'MULTIPLE_CHOICE':
                if answer_text == question.solution:
                    is_correct = True
                    answer_score = 100
                else:
                    is_correct = False
            elif question.question_type == 'INTEGER_INPUT':
                try:
                    submitted_value = int(answer_text)
                    correct_value = int(question.solution)
                    if submitted_value == correct_value:
                        is_correct = True
                        answer_score = 100
                    else:
                        is_correct = False
                except (ValueError, TypeError):
                    is_correct = False
                    answer_score = 0
            
            total_score += answer_score
            
            AssessmentAnswer.objects.create(
                applicant=applicant,
                question=question,
                answer=answer_text,
                is_correct=is_correct,
                score=answer_score
            )
    
    if requires_manual_review:
        applicant.status = 'Assessment - Needs Review'
    else:
        applicant.status = 'Assessment - Completed'
    
    applicant.save()
    
    return Response({
        "message": "Assessment submitted successfully.",
        "status": applicant.status,
        "total_score_auto_graded": total_score
    }, status=status.HTTP_201_CREATED)

# VIEW BARU: Endpoint untuk admin melihat jawaban dan menilai
@api_view(['GET', 'POST'])
def review_assessment(request, applicant_id):
    try:
        applicant = Applicant.objects.get(id=applicant_id)
    except Applicant.DoesNotExist:
        return Response({"error": "Applicant not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        answers_to_review = AssessmentAnswer.objects.filter(applicant=applicant, question__question_type__in=MANUAL_REVIEW_TYPES)
        auto_graded_answers = AssessmentAnswer.objects.filter(applicant=applicant).exclude(question__question_type__in=MANUAL_REVIEW_TYPES)
        
        data_to_send = {
            'applicant_name': applicant.name,
            'answers_to_review': [
                {
                    'question_id': ans.question.id,
                    'question_text': ans.question.text,
                    'answer': ans.answer,
                    'type': ans.question.question_type,
                } for ans in answers_to_review
            ],
            'auto_graded_scores': [
                {'question_text': ans.question.text, 'score': ans.score, 'is_correct': ans.is_correct} for ans in auto_graded_answers
            ]
        }
        return Response(data_to_send, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        data = request.data
        manual_scores = data.get('scores', {})
        
        with transaction.atomic():
            for question_id, score in manual_scores.items():
                try:
                    answer_obj = AssessmentAnswer.objects.get(applicant=applicant, question_id=question_id)
                    answer_obj.score = score
                    answer_obj.is_correct = (score > 0)
                    answer_obj.save()
                except AssessmentAnswer.DoesNotExist:
                    continue

            all_answers = AssessmentAnswer.objects.filter(applicant=applicant)
            final_score = sum(ans.score for ans in all_answers if ans.score is not None)
            
            applicant.status = 'Assessment - Reviewed'
            applicant.final_score = final_score
            applicant.save()
            
        return Response({"message": "Manual review completed.", "final_score": final_score}, status=status.HTTP_200_OK)