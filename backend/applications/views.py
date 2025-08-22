import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from postgrest.exceptions import APIError as PostgrestAPIError
from applications.supabase_client import supabase
from applications.auto_screening import preprocess_answers, run_auto_screening
from applications.cv_parser import extract_text_from_pdf, extract_text_from_docx, parse_cv_text
from applications.model_utils import get_ai_score

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
            uploaded_files = data.get('uploadedFiles')
            company = data.get('company')

            custom_answers = data.get('custom_answers', {})

            if not all([job_id, name, email]):
                print("[APPLY] Gagal: Data yang dibutuhkan (job_id, name, email) tidak lengkap.")
                return JsonResponse({'error': 'Job ID, name, and email are required.'}, status=400)

            print(f"[APPLY] Memproses lamaran dari '{name}' untuk job ID '{job_id}'.")
            
            try:
                job_data_response = supabase.from_('jobs').select('custom_fields, title').eq('id', job_id).single().execute()
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

            cv_path = None
            for file_path in uploaded_files:
                cv_path = file_path
                break

            cv_text = None
            if cv_path:
                print(f"[APPLY] Mengunduh CV dari Supabase Storage: {cv_path}")
                try:
                    cv_file_path = cv_path.split('/')[-1]
                    res = supabase.storage.from_('candidate-uploads').download(f'{user_id}/{cv_file_path}')
                    
                    if cv_file_path.endswith('.pdf'):
                        cv_text = extract_text_from_pdf(res)
                    elif cv_file_path.endswith('.docx'):
                        cv_text = extract_text_from_docx(res)
                    
                    if cv_text:
                        cv_data = parse_cv_text(cv_text)
                        print(f"[APPLY] Data CV berhasil diekstrak: {cv_data}")
                        
                        # Gabungkan data CV dengan custom answers
                        combined_answers = {**custom_answers, **cv_data}
                        
                        # Dapatkan skor AI
                        ai_score = get_ai_score(cv_data, job_data)
                        print(f"[APPLY] Skor AI: {ai_score}")

                        # Jalankan auto-screening dengan skor AI
                        if job_data.get('custom_fields') and combined_answers:
                            print("[APPLY] Menjalankan auto-screening...")
                            processed_answers = preprocess_answers(job_data['custom_fields'], combined_answers)
                            screening_result = run_auto_screening(job_data['custom_fields'], processed_answers, ai_score['score'])
                            auto_screening_status = screening_result['status']
                            
                            if screening_result['status'] == 'Lolos':
                                applicant_status = 'Shortlisted'
                            elif screening_result['status'] == 'Tidak Lolos':
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
                # Jika tidak ada CV, kita tidak bisa memberikan skor AI
                combined_answers = custom_answers
                screening_result = run_auto_screening(job_data['custom_fields'], combined_answers)
                auto_screening_status = screening_result['status']
                if screening_result['status'] == 'Lolos':
                    applicant_status = 'Shortlisted'
                elif screening_result['status'] == 'Tidak Lolos':
                    applicant_status = 'Rejected'
                else:
                    applicant_status = 'Needs Review'
            
            print(f"[APPLY] Hasil Screening Otomatis: {auto_screening_status}")
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
                # Bulatkan skor AI ke integer terdekat sebelum menyimpan
                'ai_score': int(round(ai_score['score'])) if ai_score and ai_score['score'] is not None else None
            }
            try:
                print("[APPLY] Menyimpan data pelamar ke Supabase...")
                supabase.from_('applicants').insert(insert_data).execute()
                print("[APPLY] Berhasil: Data pelamar berhasil disimpan.")
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

# Fungsi rescreen_applicant juga perlu diperbarui dengan logika yang sama
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
            
            print(f"[RESCREEN] Mengambil data CV untuk rescreening dari: {applicant_data.get('uploaded_files')}")

            cv_path = None
            for file_path in applicant_data['uploaded_files']:
                cv_path = file_path
                break
            
            cv_text = None
            cv_data = {}
            if cv_path:
                try:
                    cv_file_path = cv_path.split('/')[-1]
                    user_id = applicant_data['user_id']
                    res = supabase.storage.from_('candidate-uploads').download(f'{user_id}/{cv_file_path}')
                    
                    if cv_file_path.endswith('.pdf'):
                        cv_text = extract_text_from_pdf(res)
                    elif cv_file_path.endswith('.docx'):
                        cv_text = extract_text_from_docx(res)
                    
                    if cv_text:
                        cv_data = parse_cv_text(cv_text)
                        
                except Exception as e:
                    print(f"[RESCREEN] Peringatan: Gagal memproses CV. {e}")
            
            combined_answers = {**applicant_data['custom_answers'], **cv_data}
            
            print("[RESCREEN] Menjalankan auto-screening ulang...")
            print(f"[RESCREEN] Data yang digunakan untuk screening: {combined_answers}")
            job_response = supabase.from_('jobs').select('custom_fields, title').eq('id', applicant_data['job_id']).single().execute()
            job_data = job_response.data
            if not job_data:
                print(f"[RESCREEN] Gagal: Lowongan dengan ID '{applicant_data['job_id']}' tidak ditemukan.")
                return JsonResponse({'error': 'Job not found.'}, status=404)
            
            # Dapatkan skor AI untuk rescreening
            ai_score = get_ai_score(cv_data, job_data)
            
            screening_result = run_auto_screening(job_data['custom_fields'], combined_answers, ai_score['score'])
            
            new_status = screening_result['status']
            if new_status == 'Lolos':
                applicant_status = 'Shortlisted'
            elif new_status == 'Tidak Lolos':
                applicant_status = 'Rejected'
            else:
                applicant_status = 'Needs Review'
            
            try:
                print(f"[RESCREEN] Memperbarui status pelamar menjadi '{new_status}' di Supabase...")
                supabase.from_('applicants').update({
                    'auto_screening_status': new_status,
                    'auto_screening_log': screening_result['log'],
                    # Bulatkan skor AI ke integer terdekat sebelum menyimpan
                    'ai_score': int(round(ai_score['score']))
                }).eq('id', applicant_id).execute()
                print("[RESCREEN] Berhasil: Status pelamar berhasil diperbarui.")
            except PostgrestAPIError as e:
                print(f"[RESCREEN] Gagal: Error saat memperbarui status di Supabase. {e.message}")
                return JsonResponse({'error': f'Failed to update applicant status: {e.message}'}, status=500)
                
            print("[RESCREEN] Rescreening berhasil diproses.")
            return JsonResponse({'message': 'Auto-screening completed successfully.', 'new_status': new_status, 'ai_score': int(round(ai_score['score']))})
        
        except Exception as e:
            print(f"[RESCREEN] Terjadi kesalahan tak terduga: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    return HttpResponse(status=405)