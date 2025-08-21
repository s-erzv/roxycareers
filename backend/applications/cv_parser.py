# applications/cv_parser.py
import PyPDF2
from docx import Document
import spacy
import re
import io
import json
import os
import pdfplumber

# Tentukan jalur file JSON secara relatif
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEYWORDS_FILE = os.path.join(BASE_DIR, 'data', 'keywords.json')

# Muat model spaCy untuk ekstraksi entitas
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading spaCy model 'en_core_web_sm'...")
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

# Muat kata kunci dari file JSON
try:
    with open(KEYWORDS_FILE, 'r') as f:
        keywords_data = json.load(f)
    # Menggunakan 'technical_skills' dari file JSON
    SKILL_KEYWORDS = keywords_data.get('technical_skills', [])
    EDUCATION_KEYWORDS = keywords_data.get('education_keywords', {})
    CERTIFICATION_KEYWORDS = keywords_data.get('certifications', [])
except FileNotFoundError:
    print(f"Error: {KEYWORDS_FILE} tidak ditemukan. Pastikan file berada di tempat yang benar.")
    SKILL_KEYWORDS = []
    EDUCATION_KEYWORDS = {}
    CERTIFICATION_KEYWORDS = []

def extract_text_from_pdf(pdf_file_bytes):
    text = ""
    try:
        # Coba menggunakan PyPDF2
        pdf_file = io.BytesIO(pdf_file_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        for page in reader.pages:
            text += page.extract_text()
        if text:
            print("[EXTRACTOR] Berhasil mengekstrak teks menggunakan PyPDF2.")
            return text
    except Exception as e:
        print(f"[EXTRACTOR] Peringatan: Gagal membaca PDF dengan PyPDF2. Mencoba pdfplumber. {e}")
    
    # Jika PyPDF2 gagal, coba menggunakan pdfplumber
    try:
        pdf_file = io.BytesIO(pdf_file_bytes)
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                text += page.extract_text()
        if text:
            print("[EXTRACTOR] Berhasil mengekstrak teks menggunakan pdfplumber.")
            return text
    except Exception as e:
        print(f"[EXTRACTOR] Gagal membaca PDF dengan pdfplumber. {e}")
        return None
    
    return None

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
        "education": None,
        "experience_years": 0,
        "location": None,
        "skills": [],
        "projects_count": 0,
        "certifications": [] # Ditambahkan untuk menyimpan sertifikasi yang diekstrak
    }
    
    # Ekstraksi Pengalaman Kerja
    experience_pattern = re.compile(r'(\d+)\s+(tahun|year)s?\s+experience', re.IGNORECASE)
    experience_match = experience_pattern.search(text)
    if experience_match:
        parsed_data['experience_years'] = int(experience_match.group(1))

    # Ekstraksi Lokasi
    locations_in_text = [ent.text for ent in doc.ents if ent.label_ == "GPE"]
    if locations_in_text:
        parsed_data['location'] = locations_in_text[0]
        
    # Ekstraksi Pendidikan
    education_match = None
    for keyword, value in EDUCATION_KEYWORDS.items():
        if re.search(r'\b' + keyword + r'\b', text, re.IGNORECASE):
            education_match = value
            break
    if education_match:
        parsed_data['education'] = education_match
        
    # Ekstraksi Skills dan Projects Count
    found_skills = set()
    for keyword in SKILL_KEYWORDS:
        if re.search(r'\b' + keyword + r'\b', text, re.IGNORECASE):
            found_skills.add(keyword)
    parsed_data['skills'] = list(found_skills)
    
    projects_pattern = re.compile(r'(\d+)\s+(project|proyek)s?', re.IGNORECASE)
    projects_match = projects_pattern.search(text)
    if projects_match:
        parsed_data['projects_count'] = int(projects_match.group(1))
    
    # Ditambahkan: Ekstraksi Sertifikasi
    found_certifications = set()
    for keyword in CERTIFICATION_KEYWORDS:
        if re.search(r'\b' + keyword + r'\b', text, re.IGNORECASE):
            found_certifications.add(keyword)
    parsed_data['certifications'] = list(found_certifications)
    
    return parsed_data