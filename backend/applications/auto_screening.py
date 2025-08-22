# applications/auto_screening.py
import re

def preprocess_answers(job_custom_fields, raw_answers):
    processed_answers = raw_answers.copy()
    if not job_custom_fields or not raw_answers:
        return processed_answers
    for field in job_custom_fields:
        label = field['label']
        field_type = field['type']
        raw_value = raw_answers.get(label)
        if raw_value is not None and raw_value != '':
            if field_type == 'number':
                try:
                    num_value = float(raw_value)
                    processed_answers[label] = num_value
                except (ValueError, TypeError):
                    pass
            elif field_type == 'text':
                processed_answers[label] = str(raw_value).strip()
    return processed_answers

def run_auto_screening(job_custom_fields, applicant_answers, ai_score=None):
    log_message = {
        "Lolos": [],
        "Tidak Lolos": [],
        "Review": []
    }
    
    final_score = 0
    print("\n[AUTO-SCREENING] Memulai proses screening otomatis...")

    # Dapatkan ambang batas skor AI dari custom fields lowongan
    ai_score_threshold = 70  # Nilai default jika tidak ada di kriteria
    for field in job_custom_fields:
        if field.get('label') == 'ai_score_threshold' and field.get('criteria'):
            try:
                ai_score_threshold = float(field['criteria'])
                break
            except (ValueError, TypeError):
                pass
                
    # Periksa skor AI dan inisialisasi skor akhir
    if ai_score is not None:
        final_score = ai_score
        print(f"[AUTO-SCREENING] Skor AI: {ai_score} (Ambang Batas: {ai_score_threshold})")
        if ai_score < ai_score_threshold:
            log_message["Tidak Lolos"].append({"reason": f"Skor AI ({ai_score}) di bawah ambang batas ({ai_score_threshold})."})
        else:
            log_message["Lolos"].append({"reason": f"Skor AI ({ai_score}) memenuhi ambang batas."})
    else:
        log_message["Review"].append({"reason": "Tidak ada skor AI yang tersedia, tidak dapat mengevaluasi kriteria CV."})

    # Filter kriteria, hanya proses yang memiliki is_auto=True
    screening_criteria = [
        field for field in job_custom_fields
        if field.get('is_auto', False) and field.get('criteria')
    ]
    
    # Hitung nilai poin per kriteria yang terpenuhi
    num_screening_criteria = len(screening_criteria)
    points_per_criteria = 0
    if num_screening_criteria > 0:
      points_per_criteria = 10 / num_screening_criteria

    # Lanjutkan dengan logika evaluasi kriteria lainnya dan tambahkan poin
    for criteria_item in screening_criteria:
        label = criteria_item['label']
        criteria = criteria_item.get('criteria', '')
        criteria_type = criteria_item['type']
        required = criteria_item.get('required', False)
        applicant_answer = applicant_answers.get(label)
        
        # Lewati kriteria AI Score Threshold
        if label == 'ai_score_threshold':
            continue

        print(f"[AUTO-SCREENING] Mengevaluasi kriteria: {label}")

        is_passed = False
        
        if required and (applicant_answer is None or applicant_answer == ''):
            log_message["Tidak Lolos"].append({
                "reason": f"Jawaban untuk {label} tidak ditemukan atau kosong."
            })
            continue
        if applicant_answer is None and not required:
            continue
        if not criteria.strip():
            log_message["Review"].append({
                "reason": f"Kriteria untuk {label} tidak didefinisikan."
            })
            continue

        # Logika untuk kriteria 'number'
        if criteria_type == 'number':
            result = evaluate_number_criteria(applicant_answer, criteria, label)
            if result['status'] == 'pass':
                log_message["Lolos"].append({"reason": result['reason']})
                is_passed = True
            elif result['status'] == 'fail':
                log_message["Tidak Lolos"].append({"reason": result['reason']})
            elif result['status'] == 'error':
                log_message["Review"].append({"reason": result['reason']})
        # Logika untuk kriteria 'text' (contoh: lokasi)
        elif criteria_type == 'text':
            result = evaluate_text_criteria(applicant_answer, criteria, label)
            if result['status'] == 'pass':
                log_message["Lolos"].append({"reason": result['reason']})
                is_passed = True
            elif result['status'] == 'fail':
                log_message["Tidak Lolos"].append({"reason": result['reason']})
        # Logika untuk kriteria 'boolean'
        elif criteria_type == 'boolean':
            result = evaluate_boolean_criteria(applicant_answer, criteria, label)
            if result['status'] == 'pass':
                log_message["Lolos"].append({"reason": result['reason']})
                is_passed = True
            elif result['status'] == 'fail':
                log_message["Tidak Lolos"].append({"reason": result['reason']})
    
        if is_passed:
            point_gain = points_per_criteria
            final_score += point_gain
            print(f"[AUTO-SCREENING] Kriteria '{label}' terpenuhi! Menambahkan {point_gain} poin. Skor saat ini: {final_score}")

    # Tentukan status akhir
    if log_message["Tidak Lolos"]:
        status = 'Tidak Lolos'
    elif log_message["Review"]:
        status = 'Needs Review'
    else:
        status = 'Lolos'
        
    print(f"[AUTO-SCREENING] Proses selesai. Status akhir: {status}")
    print(f"[AUTO-SCREENING] Skor total final: {final_score}")

    return {'status': status, 'log': log_message, 'ai_score': ai_score, 'final_score': final_score}

def evaluate_number_criteria(applicant_answer, criteria, label):
    try:
        applicant_value = float(applicant_answer)
    except (ValueError, TypeError):
        return {'status': 'error', 'reason': f"Jawaban '{applicant_answer}' untuk {label} bukan angka yang valid."}
    criteria_str = str(criteria).strip()
    operator = '='
    criteria_value = None
    match = re.match(r'^(>=|<=|>|<|=)?\s*(-?\d+(\.\d+)?)$', criteria_str)
    if match:
        operator = match.group(1) or '='
        criteria_value = float(match.group(2))
    if criteria_value is None:
        return {'status': 'error', 'reason': f"Format kriteria '{criteria}' untuk {label} tidak valid."}
    is_match = False
    epsilon = 0.000001
    if operator == '>=':
        is_match = applicant_value >= criteria_value - epsilon
    elif operator == '>':
        is_match = applicant_value > criteria_value + epsilon
    elif operator == '<=':
        is_match = applicant_value <= criteria_value + epsilon
    elif operator == '<':
        is_match = applicant_value < criteria_value - epsilon
    elif operator == '=':
        is_match = abs(applicant_value - criteria_value) < epsilon
    operator_text_map = {
        '>=': 'minimal', '>': 'lebih dari', '<=': 'maksimal', '<': 'kurang dari', '=': 'sama dengan'
    }
    operator_text = operator_text_map.get(operator, 'sama dengan')
    if is_match:
        return {'status': 'pass', 'reason': f"Jawaban {applicant_answer} untuk {label} memenuhi kriteria {operator_text} {criteria_value}."}
    else:
        return {'status': 'fail', 'reason': f"Jawaban {applicant_answer} untuk {label} tidak memenuhi syarat {operator_text} {criteria_value}."}

def evaluate_text_criteria(applicant_answer, criteria, label):
    criteria_str = str(criteria).strip()
    cleaned_criteria = [s.strip().lower() for s in criteria_str.split(',') if s.strip()]
    cleaned_answer = str(applicant_answer).strip().lower()
    if not cleaned_criteria:
        return {'status': 'error', 'reason': f"Kriteria untuk {label} kosong."}
    is_match = cleaned_answer in cleaned_criteria
    if is_match:
        return {'status': 'pass', 'reason': f"Jawaban '{applicant_answer}' untuk {label} memenuhi kriteria yang diizinkan."}
    else:
        return {'status': 'fail', 'reason': f"Jawaban '{applicant_answer}' untuk {label} tidak ada di daftar yang diizinkan: {', '.join(cleaned_criteria)}."}

def evaluate_boolean_criteria(applicant_answer, criteria, label):
    is_match = applicant_answer == criteria
    if is_match:
        return {'status': 'pass', 'reason': f"Jawaban '{applicant_answer}' untuk {label} memenuhi kriteria yang diizinkan."}
    else:
        return {'status': 'fail', 'reason': f"Jawaban '{applicant_answer}' untuk {label} tidak memenuhi syarat."}