import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import SchedulingForm from './SchedulingForm';

const statusFlow = {
  'Applied': ['Shortlisted', 'Rejected'],
  'Shortlisted': ['scheduled', 'Rejected'],
  'Assessment - Completed': ['Lolos Assessment', 'Gagal Assessment'],
  'Assessment - Needs Review': ['Lolos Assessment', 'Gagal Assessment'],
  'Lolos Assessment': ['scheduled', 'Rejected'],
  'Gagal Assessment': ['Rejected'],
  'scheduled': ['Interviewed', 'Hired', 'Rejected'],
  'Interviewed': ['Hired', 'Rejected'],
  'Hired': [],
  'Rejected': [],
  'Needs Review': ['Shortlisted', 'Rejected'],
};

// Fungsi untuk memberikan deskripsi status bagi admin
const getAdminStatusDescription = (status) => {
  switch (status) {
    case 'Applied':
      return 'Pelamar baru saja mengirimkan lamaran. Perlu dilakukan screening awal.';
    case 'Shortlisted':
      return 'Pelamar telah lolos seleksi berkas awal dan siap untuk tahap asesmen atau wawancara.';
    case 'Rejected':
      return 'Pelamar tidak lolos pada tahap ini. Lamaran sudah ditolak.';
    case 'Needs Review':
      return 'Lamaran pelamar tidak dapat diproses otomatis dan membutuhkan tinjauan manual oleh admin.';
    case 'Assessment - Completed':
      return 'Pelamar telah menyelesaikan asesmen. Semua jawaban sudah dinilai secara otomatis.';
    case 'Assessment - Needs Review':
      return 'Pelamar telah menyelesaikan asesmen, tetapi ada jawaban (misal: esai atau unggahan file) yang membutuhkan tinjauan manual.';
    case 'Lolos Assessment':
      return 'Pelamar berhasil menyelesaikan asesmen dan lolos. Siap untuk dijadwalkan wawancara.';
    case 'Gagal Assessment':
      return 'Pelamar tidak lolos pada tahap asesmen.';
    case 'scheduled':
      return 'Pelamar sudah dijadwalkan untuk wawancara. Detail jadwal sudah ada.';
    case 'Interviewed':
      return 'Wawancara telah selesai. Admin dapat mengubah status menjadi "Hired" atau "Rejected".';
    case 'Hired':
      return 'Pelamar telah diterima bekerja. Proses rekrutmen selesai.';
    default:
      return 'Status lamaran tidak dapat dikenali.';
  }
};

export default function ApplicantDetail({ applicant, onBack, onDownloadFile, onRescreen }) {
  const [showSchedulingForm, setShowSchedulingForm] = useState(false);
  const [currentApplicant, setCurrentApplicant] = useState(applicant);
  const [assessmentDetails, setAssessmentDetails] = useState(null);
  const [loadingAnswers, setLoadingAnswers] = useState(true);

  // Perbaiki URL fetch dengan menambahkan garis miring di akhir
  useEffect(() => {
    const fetchAssessmentAnswers = async () => {
      try {
        setLoadingAnswers(true);
        // Tambahkan garis miring (/) di akhir URL agar sesuai dengan routing Django
        const response = await fetch(`http://localhost:8000/api/applicants/${currentApplicant.id}/review_assessment/`);
        if (!response.ok) {
          throw new Error('Failed to fetch assessment answers');
        }
        const data = await response.json();
        setAssessmentDetails(data);
      } catch (error) {
        console.error('Error fetching assessment answers:', error);
        setAssessmentDetails(null);
      } finally {
        setLoadingAnswers(false);
      }
    };

    fetchAssessmentAnswers();
  }, [currentApplicant.id]);

  const handleUpdateStatus = async (newStatus) => {
    if (newStatus === 'scheduled') {
      setShowSchedulingForm(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('applicants')
        .update({ status: newStatus })
        .eq('id', currentApplicant.id)
        .select();

      if (error) {
        throw error;
      }
      
      setCurrentApplicant(data[0]);
      alert(`Status pelamar berhasil diubah menjadi ${newStatus}.`);

    } catch (error) {
      alert('Gagal memperbarui status pelamar: ' + error.message);
    }
  };

  const handleScheduleComplete = () => {
    setShowSchedulingForm(false);
  };
  
  const handleRescreening = async () => {
    const { message, new_status, applicant_status } = await onRescreen(currentApplicant.id);
    setCurrentApplicant(prev => ({ ...prev, status: applicant_status, auto_screening_status: new_status }));
    alert(message);
  };
  
  const availableStatuses = statusFlow[currentApplicant.status] || [];

  // Tampilkan loading state jika data applicant belum lengkap
  if (!currentApplicant || !currentApplicant.jobs) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Memuat detail pelamar...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke Daftar Pelamar
      </button>

      {showSchedulingForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <SchedulingForm
            applicant={currentApplicant}
            onClose={() => setShowSchedulingForm(false)}
            onScheduleComplete={handleScheduleComplete}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentApplicant.name}</h3>
        <p className="text-sm text-gray-500 mb-4">{currentApplicant.email}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800">Detail Lamaran</h4>
            {/* Menggunakan optional chaining untuk mencegah error jika `jobs` atau `title` tidak ada */}
            <p className="text-sm text-gray-600 mt-2"><strong>Posisi:</strong> {currentApplicant.jobs?.title || 'Tidak diketahui'}</p>
            <div className="mt-2">
              <p className="text-sm text-gray-600"><strong>Status:</strong> {currentApplicant.status}</p>
              <p className="text-xs text-gray-500 mt-1">{getAdminStatusDescription(currentApplicant.status)}</p>
            </div>
            {currentApplicant.auto_screening_status && (
              <p className="text-sm text-gray-600"><strong>Auto Screening:</strong> {currentApplicant.auto_screening_status}</p>
            )}
            {currentApplicant.final_score && (
              <p className="text-sm text-gray-600"><strong>Skor Final:</strong> {currentApplicant.final_score}</p>
            )}
            {currentApplicant.ai_score && (
              <p className="text-sm text-gray-600"><strong>Skor AI:</strong> {currentApplicant.ai_score}</p>
            )}
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800">File & Dokumen</h4>
            {currentApplicant.uploaded_files && currentApplicant.uploaded_files.length > 0 ? (
              <button
                onClick={() => onDownloadFile(currentApplicant.uploaded_files[0])}
                className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Unduh CV/Dokumen
              </button>
            ) : (
              <p className="text-sm text-gray-600 mt-2">Tidak ada file yang diunggah.</p>
            )}
          </div>
        </div>
        
        {currentApplicant.auto_screening_log && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-gray-800">Log Screening Otomatis</h4>
            {Object.keys(currentApplicant.auto_screening_log).map(logType => (
              <div key={logType}>
                <p className="text-sm font-bold mt-2">{logType}</p>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {currentApplicant.auto_screening_log[logType].map((log, index) => (
                    <li key={index}>{log.reason}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        
        {/* Tampilkan Jawaban Asesmen */}
        <div className="mt-6 p-4 bg-white rounded-lg shadow-inner">
          <h4 className="font-semibold text-gray-800 border-b pb-2 mb-4">Jawaban Asesmen</h4>
          {loadingAnswers ? (
            <p className="text-sm text-gray-600">Memuat jawaban asesmen...</p>
          ) : assessmentDetails && assessmentDetails.answers_to_review.length > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-2 font-bold">Jawaban Perlu Tinjauan Manual:</p>
              {assessmentDetails.answers_to_review.map((answer, index) => (
                <div key={index} className="mb-4 p-4 border rounded-md bg-gray-50">
                  <p className="font-medium text-gray-700 mb-2">
                    <span className="font-bold">Pertanyaan:</span> {answer.question_text}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold">Jawaban:</span> {answer.answer}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-bold">Tipe:</span> {answer.type}
                  </p>
                </div>
              ))}
            </div>
          ) : assessmentDetails && assessmentDetails.auto_graded_scores.length > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-2 font-bold">Skor Asesmen Otomatis:</p>
              {assessmentDetails.auto_graded_scores.map((score, index) => (
                <div key={index} className="mb-4 p-4 border rounded-md bg-gray-50">
                  <p className="font-medium text-gray-700 mb-2">
                    <span className="font-bold">Pertanyaan:</span> {score.question_text}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold">Skor:</span> {score.score}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold">Status:</span> {score.is_correct ? 'Benar' : 'Salah'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Tidak ada jawaban asesmen yang ditemukan.</p>
          )}
        </div>

        {/* Dropdown untuk mengubah status */}
        <div className="mt-6 flex items-center space-x-4">
          <label htmlFor="status-dropdown" className="block text-sm font-medium text-gray-700">
            Ubah Status Pelamar:
          </label>
          <div className="relative inline-block text-left">
            <select
              id="status-dropdown"
              onChange={(e) => handleUpdateStatus(e.target.value)}
              // Menetapkan nilai default yang menunjukkan status saat ini
              value={currentApplicant.status}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {/* Menampilkan status saat ini sebagai opsi pertama dan menonaktifkannya */}
              <option value={currentApplicant.status} disabled>{currentApplicant.status}</option>
              {availableStatuses.length > 0 ? (
                availableStatuses.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))
              ) : (
                <option value="" disabled>Tidak ada status yang tersedia.</option>
              )}
            </select>
          </div>

          <button
            onClick={handleRescreening}
            className="text-sm text-yellow-500 hover:text-yellow-700 font-semibold"
          >
            Rescreen
          </button>
        </div>
      </div>
    </div>
  );
}