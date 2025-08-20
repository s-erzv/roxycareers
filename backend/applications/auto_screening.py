# applications/auto_screening.py
import re
import io
import PyPDF2
from docx import Document
import spacy

# Load model spaCy untuk ekstraksi entitas
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading spaCy model 'en_core_web_sm'...")
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def extract_text_from_pdf(pdf_file_bytes):
    text = ""
    try:
        pdf_file = io.BytesIO(pdf_file_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        for page in reader.pages:
            text += page.extract_text()
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None
    return text

def extract_text_from_docx(docx_file_bytes):
    text = ""
    try:
        docx_file = io.BytesIO(docx_file_bytes)
        doc = Document(docx_file)
        for paragraph in doc.paragraphs:
            text += paragraph.text + '\n'
    except Exception as e:
        print(f"Error reading DOCX: {e}")
        return None
    return text

def parse_cv_text(text):
    if not text:
        return {}
    doc = nlp(text)
    parsed_data = {
        "education": [],
        "experience_years": 0,
        "location": None
    }
    experience_pattern = re.compile(r'(\d+)\s+(tahun|year)s?\s+experience', re.IGNORECASE)
    locations_in_text = []
    experience_match = experience_pattern.search(text)
    if experience_match:
        parsed_data['experience_years'] = int(experience_match.group(1))
    for ent in doc.ents:
        if ent.label_ == "GPE":
            locations_in_text.append(ent.text)
    if locations_in_text:
        parsed_data['location'] = locations_in_text[0]
    education_keywords = ["universitas", "institut", "s1", "s2", "master", "sarjana"]
    for sentence in text.split('\n'):
        if any(keyword in sentence.lower() for keyword in education_keywords):
            parsed_data['education'].append(sentence.strip())
    return parsed_data

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

def run_auto_screening(job_custom_fields, applicant_answers):
    log_message = {
        "Lolos": [],
        "Tidak Lolos": [],
        "Review": []
    }
    if not job_custom_fields:
        log_message["Lolos"].append({"reason": "Tidak ada kriteria untuk dicek."})
        return {'status': 'Lolos', 'log': log_message}
    if not applicant_answers or not isinstance(applicant_answers, dict):
        log_message["Tidak Lolos"].append({"reason": "Data jawaban applicant tidak valid."})
        return {'status': 'Tidak Lolos', 'log': log_message}
    for criteria_item in job_custom_fields:
        label = criteria_item['label']
        criteria = criteria_item.get('criteria', '')
        criteria_type = criteria_item['type']
        required = criteria_item.get('required', False)
        applicant_answer = applicant_answers.get(label)
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
        if criteria_type == 'number':
            result = evaluate_number_criteria(applicant_answer, criteria, label)
            if result['status'] == 'pass':
                log_message["Lolos"].append({"reason": result['reason']})
            elif result['status'] == 'fail':
                log_message["Tidak Lolos"].append({"reason": result['reason']})
            elif result['status'] == 'error':
                log_message["Review"].append({"reason": result['reason']})
        elif criteria_type == 'text':
            result = evaluate_text_criteria(applicant_answer, criteria, label)
            if result['status'] == 'pass':
                log_message["Lolos"].append({"reason": result['reason']})
            elif result['status'] == 'fail':
                log_message["Tidak Lolos"].append({"reason": result['reason']})
        elif criteria_type == 'boolean':
            result = evaluate_boolean_criteria(applicant_answer, criteria, label)
            if result['status'] == 'pass':
                log_message["Lolos"].append({"reason": result['reason']})
            elif result['status'] == 'fail':
                log_message["Tidak Lolos"].append({"reason": result['reason']})
    status = 'Lolos' if not log_message["Tidak Lolos"] else 'Tidak Lolos'
    return {'status': status, 'log': log_message}

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