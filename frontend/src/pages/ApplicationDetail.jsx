import React from 'react';

const getStatusMessage = (status) => {
  switch (status) {
    case 'Applied':
      return {
        title: 'Lamaran Terkirim',
        message: 'Lamaran Anda sudah berhasil kami terima. Kami akan segera memprosesnya dan memberi kabar secepatnya.',
        color: 'bg-blue-100 text-blue-800',
        actionMessage: ''
      };
    case 'Shortlisted':
      return {
        title: 'Lolos Seleksi Berkas!',
        message: 'Selamat! Anda telah lolos seleksi berkas. Detail untuk tahap berikutnya sudah tersedia di bawah.',
        color: 'bg-green-100 text-green-800',
        actionMessage: 'Silakan periksa detail di bawah untuk informasi lebih lanjut.'
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
    case 'Hired':
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
    default:
      return {
        title: 'Status Tidak Diketahui',
        message: 'Status lamaran Anda tidak dapat dikenali. Silakan hubungi tim rekrutmen kami.',
        color: 'bg-gray-100 text-gray-800',
        actionMessage: ''
      };
  }
};

export default function ApplicationDetail({ application, onBack }) {
  const statusInfo = getStatusMessage(application.status);
  const jobs = application.jobs;

  const interviewTime = application.schedules && application.schedules.length > 0 ? new Date(application.schedules[0].interview_time) : null;
  const formattedDate = interviewTime ? interviewTime.toLocaleDateString('en-US') : '';
  const formattedTime = interviewTime ? interviewTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
  
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