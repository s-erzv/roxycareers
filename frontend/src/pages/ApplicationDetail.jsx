import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const getStatusMessage = (status) => {
  switch (status) {
    case 'Applied':
      return {
        title: 'Lamaran Terkirim',
        message: 'Lamaran Anda sudah berhasil kami terima. Kami akan segera memprosesnya dan memberi kabar secepatnya.',
        color: 'bg-blue-100 text-blue-800',
        actionMessage: 'Asesmen akan dimulai setelah Anda mengklik tombol di bawah ini. Pastikan Anda berada di lingkungan yang tenang dan memiliki koneksi internet yang stabil.'
      };
    case 'Shortlisted':
      return {
        title: 'Lolos Seleksi Berkas!',
        message: 'Selamat! Anda telah lolos seleksi berkas. Detail untuk tahap berikutnya sudah tersedia di bawah.',
        color: 'bg-green-100 text-green-800',
        actionMessage: 'Selamat! Anda telah lolos seleksi berkas. Silakan selesaikan asesmen Anda. Asesmen akan dimulai setelah Anda mengklik tombol di bawah ini. Pastikan Anda berada di lingkungan yang tenang dan memiliki koneksi internet yang stabil.'
      };
    case 'scheduled':
      return {
        title: 'Jadwal Interview Telah Ditentukan',
        message: 'Jadwal interview Anda sudah ditentukan. Kami akan segera menghubungi Anda untuk detailnya.',
        color: 'bg-yellow-100 text-yellow-800',
        actionMessage: ''
      };
    case 'Interviewed':
      return {
        title: 'Menunggu Pengumuman',
        message: 'Anda telah menyelesaikan tahap interview. Kami sedang melakukan evaluasi dan akan menginformasikan hasilnya.',
        color: 'bg-indigo-100 text-indigo-800',
        actionMessage: ''
      };
    case 'hired':
      return {
        title: 'Anda Diterima!',
        message: 'Selamat! Anda telah diterima di Roxy Group. Kami akan segera menghubungi Anda untuk proses selanjutnya.',
        color: 'bg-green-500 text-white',
        actionMessage: ''
      };
    case 'Rejected':
      return {
        title: 'Lamaran Ditolak',
        message: 'Mohon maaf, lamaran Anda tidak dapat kami proses lebih lanjut saat ini. Terima kasih atas ketertarikan Anda.',
        color: 'bg-red-500 text-white',
        actionMessage: ''
      };
    case 'Assessment - Completed':
      return {
        title: 'Asesmen Selesai',
        message: 'Anda telah menyelesaikan asesmen. Hasilnya akan segera diulas oleh tim rekrutmen kami.',
        color: 'bg-gray-400 text-white',
        actionMessage: ''
      };
    case 'Assessment - Needs Review':
      return {
        title: 'Asesmen Selesai, Menunggu Tinjauan Manual',
        message: 'Anda telah menyelesaikan asesmen. Karena ada pertanyaan yang membutuhkan tinjauan manual, hasilnya akan diulas oleh tim rekrutmen kami.',
        color: 'bg-orange-400 text-white',
        actionMessage: ''
      };
    case 'Lolos Assessment':
      return {
        title: 'Selamat, Anda Lolos Asesmen!',
        message: 'Anda telah berhasil lolos asesmen. Kami akan menghubungi Anda kembali untuk langkah selanjutnya, yaitu penjadwalan interview.',
        color: 'bg-green-500 text-white',
        actionMessage: ''
      };
    case 'Gagal Assessment':
      return {
        title: 'Mohon Maaf, Anda Gagal Asesmen',
        message: 'Kami mohon maaf, Anda belum berhasil lolos pada tahap asesmen kali ini. Terima kasih atas partisipasi Anda.',
        color: 'bg-red-500 text-white',
        actionMessage: ''
      };
    case 'Needs Review':
      return {
        title: 'Menunggu Tinjauan',
        message: 'Lamaran Anda sedang dalam tinjauan manual oleh tim rekrutmen kami. Silakan tunggu informasi selanjutnya.',
        color: 'bg-purple-100 text-purple-800',
        actionMessage: ''
      };
    default:
      return {
        title: 'Status Tidak Diketahui',
        message: 'Status lamaran Anda tidak dapat dikenali. Silakan hubungi tim rekrutmen kami.',
        color: 'bg-gray-100 text-gray-800',
        actionMessage: ''
      };
  }
};

const createGoogleCalendarUrl = (title, startTime, endTime, details, location) => {
  const formattedStartTime = startTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const formattedEndTime = endTime.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const encodedTitle = encodeURIComponent(title);
  const encodedDetails = encodeURIComponent(details);
  const encodedLocation = encodeURIComponent(location);
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${formattedStartTime}/${formattedEndTime}&details=${encodedDetails}&location=${encodedLocation}`;
};

export default function ApplicationDetail({ application, onBack }) {
  const navigate = useNavigate();
  const jobs = application.jobs;

  const interviewTime = application.schedules && application.schedules.length > 0 ? new Date(application.schedules[0].interview_time) : null;
  const interviewEndTime = interviewTime ? new Date(interviewTime.getTime() + 60 * 60 * 1000) : null;
  
  // Tentukan status yang ditampilkan
  let displayedStatus = application.status;
  if (application.status === 'scheduled' && interviewTime && (new Date().getTime() > interviewEndTime.getTime())) {
    displayedStatus = 'Interviewed';
  }

  const [assessmentAnswers, setAssessmentAnswers] = useState([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const showAssessmentAnswers = application.status === 'Assessment - Completed' || application.status === 'Lolos Assessment' || application.status === 'Gagal Assessment' || application.status === 'Assessment - Needs Review' || application.status === 'hired';

  useEffect(() => {
    const fetchAnswers = async () => {
      if (showAssessmentAnswers) {
        setLoadingAnswers(true);
        const { data, error } = await supabase
          .from('assessment_answers')
          .select(`
            answer,
            is_correct,
            score,
            questions (
              text
            )
          `)
          .eq('applicant_id', application.id);

        if (error) {
          console.error('Error fetching assessment answers:', error);
        } else {
          setAssessmentAnswers(data);
        }
        setLoadingAnswers(false);
      }
    };

    fetchAnswers();
  }, [application.id, showAssessmentAnswers]);

  const statusInfo = getStatusMessage(displayedStatus);
  const formattedDate = interviewTime ? interviewTime.toLocaleDateString('en-US') : '';
  const formattedTime = interviewTime ? interviewTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
  
  const calendarTitle = `Interview - ${jobs.title} at ${jobs.company}`;
  const calendarDetails = `Jadwal Interview untuk posisi ${jobs.title} di ${jobs.company}.\n\nDetail:\n${jobs.interview_details?.link ? `Link: ${jobs.interview_details.link}\n` : ''}${jobs.interview_details?.contact_person ? `Kontak Person: ${jobs.interview_details.contact_person}\n` : ''}`;
  const calendarLocation = jobs.interview_details?.link || '';

  const calendarUrl = interviewTime && interviewEndTime ? createGoogleCalendarUrl(calendarTitle, interviewTime, interviewEndTime, calendarDetails, calendarLocation) : null;

  const handleStartAssessment = () => {
    navigate('/assessment', { state: { applicant: application } });
  };
  
  const showAssessmentButton = application.status === 'Shortlisted' || application.status === 'Applied';

  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{jobs.title}</h2>
          <span className={`ml-4 px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
            {statusInfo.title}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">Perusahaan: {jobs.company}</p>
        <p className="text-sm text-gray-500">Melamar pada: {new Date(application.created_at).toLocaleDateString()}</p>
        
        {/* Tambahan: Bagian untuk menampilkan Skor AI dan Alasan */}
        {application.ai_score !== undefined && application.ai_score !== null && (
          <div className="mt-6 p-4 bg-purple-100 rounded-lg border-l-4 border-purple-500 text-purple-800">
            <h4 className="font-bold">Skor Screening AI</h4>
            <p className="mt-2 text-sm">
              Skor dari Gemini: <strong>{application.ai_score}</strong>
            </p>
            {application.gemini_reason && (
              <p className="text-sm mt-1">
                Alasan Detail: <br />
                {application.gemini_reason}
              </p>
            )}
          </div>
        )}
        
        {application.status === 'scheduled' && interviewTime && (
          <div className="mt-6 p-4 bg-yellow-100 rounded-lg border-l-4 border-yellow-500 text-yellow-800">
            <h4 className="font-bold">Detail Jadwal Interview</h4>
            <p className="mt-2 text-sm">
              Interview Anda dijadwalkan pada: <strong>{formattedDate}, {formattedTime} WIB</strong>.
            </p>
            {jobs.interview_details?.link && (
                <p className="text-sm mt-1">
                  Link interview: 
                  <a href={jobs.interview_details.link} target="_blank" rel="noopener noreferrer" className="text-yellow-800 font-semibold hover:underline ml-1">
                    {jobs.interview_details.link}
                  </a>
                </p>
            )}
             {jobs.interview_details?.contact_person && (
                <p className="text-sm mt-1">
                  Kontak Person: <strong>{jobs.interview_details.contact_person}</strong>
                </p>
            )}
            {calendarUrl && (
              <a 
                href={calendarUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6 2a2 2 0 00-2 2v2H3a1 1 0 000 2h1v10a2 2 0 002 2h12a2 2 0 002-2V8h1a1 1 0 000-2h-1V4a2 2 0 00-2-2h-3V1a1 1 0 00-2 0v1H8V1a1 1 0 00-2 0v1zM4 8h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"></path>
                </svg>
                Tambahkan ke Google Kalender
              </a>
            )}
          </div>
        )}
        
        {showAssessmentButton && (
          <div className="mt-6 p-4 bg-teal-100 rounded-lg border-l-4 border-teal-500 text-teal-800">
            <h4 className="font-bold">Informasi Asesmen</h4>
            <p className="mt-2 text-sm">
              {statusInfo.actionMessage}
            </p>
            <button
              onClick={handleStartAssessment}
              className="mt-4 inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Mulai Asesmen
            </button>
          </div>
        )}

        {showAssessmentAnswers && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-800">Jawaban Asesmen Anda</h3>
            {loadingAnswers ? (
              <p className="text-sm text-gray-600 mt-2">Memuat jawaban...</p>
            ) : assessmentAnswers.length > 0 ? (
              <div className="mt-4 space-y-4">
                {assessmentAnswers.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="font-medium text-gray-700">Pertanyaan: {item.questions.text}</p>
                    <p className="text-sm text-gray-600 mt-1">Jawaban Anda: {item.answer}</p>
                    {item.is_correct !== null && (
                      <p className="text-sm mt-1">
                        Status: <span className={item.is_correct ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold'}>{item.is_correct ? 'Benar' : 'Salah'}</span>
                      </p>
                    )}
                    {item.score !== null && (
                      <p className="text-sm mt-1">
                        Skor: <strong>{item.score}</strong>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-2">Tidak ada jawaban asesmen yang ditemukan.</p>
            )}
          </div>
        )}
        
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-gray-800">Deskripsi Pekerjaan</h3>
          <p className="text-sm text-gray-600 mt-2">{jobs.description}</p>
        </div>
      </div>
    </div>
  );
}