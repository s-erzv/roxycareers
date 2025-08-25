# backend/applications/gemini_client.py
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Muat environment variables dari file .env
load_dotenv()

# Konfigurasi API key
# Pastikan Anda sudah membuat file .env di direktori backend/
# dengan baris GEMINI_API_KEY="YOUR_API_KEY_DI_SINI"
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_gemini_score(cv_text, job_description, ml_score):
    """
    Mengirim data CV, lowongan, dan skor ML ke Gemini untuk mendapatkan skor dan alasan.
    """
    # Gunakan model generatif yang sesuai
    model = genai.GenerativeModel('gemini-1.5-flash')

    # Prompt yang dimodifikasi untuk menyertakan skor ML
    prompt = f"""
Lakukan analisis mendalam terhadap CV berikut dan berikan penilaian (skor 1-100) serta alasan detail mengapa kandidat ini cocok atau tidak cocok untuk lowongan pekerjaan yang diberikan.
Sebagai tambahan, skor awal dari model Machine Learning kami adalah {ml_score}. Gunakan skor ini sebagai salah satu pertimbangan Anda.

Data CV:
{cv_text}

Lowongan Pekerjaan:
{job_description}

Pertimbangkan hal berikut dalam analisis Anda:
- Relevansi keterampilan dan pengalaman kandidat dengan deskripsi pekerjaan.
- Konsistensi riwayat pekerjaan.
- Skor awal dari model Machine Learning ({ml_score}).

Format jawaban yang diharapkan (sertakan hanya skor numerik dan alasan detail):
Skor: [skor_numerik]
Alasan: [penjelasan_detail_dan_terstruktur]
"""

    try:
        # Panggil Gemini API
        response = model.generate_content(prompt)
        # Dapatkan teks dari respons
        raw_text = response.text
        
        # Parsing skor dan alasan dari teks respons
        score_line = next((line for line in raw_text.split('\n') if "Skor:" in line), None)
        reason_line_start = raw_text.find("Alasan:")
        
        if score_line and reason_line_start != -1:
            score = int(''.join(filter(str.isdigit, score_line)))
            reason = raw_text[reason_line_start + len("Alasan:"):].strip()
            return score, reason
        else:
            return None, "Gagal mendapatkan skor dan alasan dari Gemini."

    except Exception as e:
        print(f"Error saat memanggil Gemini API: {e}")
        return None, "Terjadi kesalahan saat menghubungi server AI."