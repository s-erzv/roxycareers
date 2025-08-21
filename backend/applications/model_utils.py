import joblib
import pandas as pd
import os
import numpy as np

# Tentukan jalur file model secara relatif
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(BASE_DIR, 'auto_screening_model.joblib')
VECTORIZER_FILE = os.path.join(BASE_DIR, 'tfidf_vectorizer.joblib')

# Muat objek yang sudah disimpan
try:
    TFIDF_VECTORIZER = joblib.load(VECTORIZER_FILE)
    MODEL = joblib.load(MODEL_FILE)
    
    # Ambil nama fitur yang diharapkan oleh model
    # Ini memastikan urutan kolom yang benar saat prediksi
    if hasattr(MODEL, 'feature_names_in_'):
        MODEL_FEATURE_NAMES = MODEL.feature_names_in_.tolist()
    else:
        # Fallback: jika model tidak memiliki fitur ini,
        # kita harus membuat daftar fitur secara manual berdasarkan data pelatihan.
        print("Peringatan: Model tidak memiliki 'feature_names_in_'. Membangun daftar fitur secara manual.")
        
        # Contoh: berdasarkan AI_Resume_Screening.csv
        numerical_features = ['Experience (Years)', 'Projects Count']
        ohe_features = [
            'Education_B.Sc', 'Education_B.Tech', 'Education_MBA', 'Education_M.Tech', 'Education_PhD',
            'Certifications_AWS Certified', 'Certifications_Deep Learning Specialization', 'Certifications_Google ML', 'Certifications_None',
            'Job Role_AI Researcher', 'Job Role_Cybersecurity Analyst', 'Job Role_Data Scientist', 'Job Role_Software Engineer'
        ]
        tfidf_features = TFIDF_VECTORIZER.get_feature_names_out().tolist()
        MODEL_FEATURE_NAMES = numerical_features + ohe_features + tfidf_features
    
    print(f"Model berhasil dimuat. Total fitur yang diharapkan: {len(MODEL_FEATURE_NAMES)}")
    
except FileNotFoundError:
    print("Peringatan: File model tidak ditemukan. Pastikan Anda telah melatih dan menyimpan model.")
    TFIDF_VECTORIZER = None
    MODEL = None
    MODEL_FEATURE_NAMES = None

def get_ai_score(applicant_data, job_data):
    """
    Menghitung skor AI untuk pelamar berdasarkan data CV dan data job.
    """
    if not MODEL or not TFIDF_VECTORIZER or not MODEL_FEATURE_NAMES:
        return calculate_fallback_score(applicant_data, job_data)
    
    try:
        # Buat DataFrame dengan semua fitur yang diharapkan dan inisialisasi dengan nol
        df_predict = pd.DataFrame(0, index=[0], columns=MODEL_FEATURE_NAMES)
        
        # Isi data yang tersedia
        df_predict['Experience (Years)'] = applicant_data.get('experience_years', 0)
        df_predict['Projects Count'] = applicant_data.get('projects_count', 0)
        
        # Isi fitur One-Hot Encoding
        education_val = applicant_data.get('education')
        if education_val:
            col_name = f'Education_{education_val}'
            if col_name in df_predict.columns:
                df_predict[col_name] = 1
                
        # Catatan: cv_parser.py tidak mengekstrak certifications, jadi kita asumsikan 'None'
        cert_val = applicant_data.get('certifications', 'None')
        col_name = f'Certifications_{cert_val}'
        if col_name in df_predict.columns:
            df_predict[col_name] = 1
        
        job_role_val = job_data.get('title')
        if job_role_val:
            col_name = f'Job Role_{job_role_val}'
            if col_name in df_predict.columns:
                df_predict[col_name] = 1
                
        # Isi fitur TF-IDF
        skills_text = ' '.join(applicant_data.get('skills', []))
        if skills_text.strip():
            skills_tfidf_matrix = TFIDF_VECTORIZER.transform([skills_text])
            skills_df = pd.DataFrame(skills_tfidf_matrix.toarray(), columns=TFIDF_VECTORIZER.get_feature_names_out())
            
            # Update DataFrame prediksi dengan nilai TF-IDF
            for col in skills_df.columns:
                if col in df_predict.columns:
                    df_predict[col] = skills_df[col]
                    
        # Pastikan urutan kolom sesuai dengan yang diharapkan oleh model
        df_predict = df_predict[MODEL_FEATURE_NAMES]
        
        # Lakukan prediksi
        score = MODEL.predict(df_predict)[0]
        score = max(0, min(100, float(score)))
        
        return {'score': score, 'reason': 'Skor AI berhasil dihitung.'}
    
    except Exception as e:
        print(f"Error dalam prediksi: {e}")
        return calculate_fallback_score(applicant_data, job_data)

def calculate_fallback_score(applicant_data, job_data):
    """
    Metode fallback saat model ML gagal.
    Menghitung skor menggunakan heuristik sederhana.
    """
    try:
        score = 0
        
        # Bobot Skor
        bobot_pengalaman = 30
        bobot_pendidikan = 25
        bobot_keahlian = 25
        bobot_proyek = 20
        
        # Skor Pengalaman
        experience_years = applicant_data.get('experience_years', 0)
        score_pengalaman = min(bobot_pengalaman, experience_years * 3)
        score += score_pengalaman
        
        # Skor Pendidikan
        education = applicant_data.get('education', '')
        education_scores = {'PhD': bobot_pendidikan, 'M.Tech': bobot_pendidikan * 0.8, 'MBA': bobot_pendidikan * 0.8, 'B.Tech': bobot_pendidikan * 0.6, 'B.Sc': bobot_pendidikan * 0.6}
        score += education_scores.get(education, 0)
        
        # Skor Keahlian
        skills = applicant_data.get('skills', [])
        score_keahlian = min(bobot_keahlian, len(skills) * 3)
        score += score_keahlian
        
        # Skor Proyek
        projects_count = applicant_data.get('projects_count', 0)
        score_proyek = min(bobot_proyek, projects_count * 2)
        score += score_proyek
        
        # Normalisasi
        total_bobot = bobot_pengalaman + bobot_pendidikan + bobot_keahlian + bobot_proyek
        final_score = (score / total_bobot) * 100
        
        return {'score': float(final_score), 'reason': 'Skor dihitung menggunakan metode fallback.'}
        
    except Exception as e:
        print(f"Error dalam perhitungan skor fallback: {e}")
        return {'score': 0, 'reason': 'Error dalam perhitungan skor fallback.'}