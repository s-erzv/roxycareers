# applications/cv_parser.py
import PyPDF2
from docx import Document
import spacy
import re
import io

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