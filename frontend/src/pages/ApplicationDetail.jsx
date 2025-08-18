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
        message: 'Selamat! Anda telah lolos seleksi berkas. Kami akan segera menghubungi Anda untuk tahap interview.',
        color: 'bg-green-100 text-green-800',
        actionMessage: ''
      };
    case 'Scheduled for Interview':
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
        message: 'Selamat! Anda telah diterima di Roxy Group. Kami akan segera menghubungi Anda untuk proses onboarding.',
        color: 'bg-green-500 text-white',
        actionMessage: 'Persiapkan diri Anda untuk bergabung bersama kami.'
      };
    case 'Rejected':
      return {
        title: 'Lamaran Belum Sesuai',
        message: 'Terima kasih atas partisipasi Anda. Sayangnya, untuk saat ini Anda belum lolos ke tahap berikutnya. Anda dapat mencoba melamar lowongan lain di Roxy Group.',
        color: 'bg-red-500 text-white',
        actionMessage: 'Jangan menyerah dan tetap semangat!'
      };
    default:
      return {
        title: 'Status Tidak Diketahui',
        message: 'Silakan hubungi tim HR kami untuk informasi lebih lanjut.',
        color: 'bg-gray-100 text-gray-800',
        actionMessage: ''
      };
  }
};

export default function ApplicationDetail({ application, onBack }) {
  const { title, message, color, actionMessage } = getStatusMessage(application.status);

  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke Dashboard
      </button>
      <div className={`bg-white rounded-xl shadow-lg p-8 mt-4 border-l-4`} style={{ borderColor: color.split('-')[1] }}>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 leading-relaxed mb-4">{message}</p>
        
        {application.status === 'Scheduled for Interview' && application.interview_details && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-gray-800">Detail Interview</h4>
            <p className="mt-2 text-sm text-gray-600"><strong>Tanggal:</strong> {application.interview_details.date}</p>
            <p className="text-sm text-gray-600"><strong>Waktu:</strong> {application.interview_details.time}</p>
            <p className="text-sm text-gray-600"><strong>Kontak Person:</strong> {application.contact_person}</p>
            <p className="text-sm text-gray-600">
              <strong>Link:</strong> 
              <a href={application.interview_details.link} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline ml-1">
                {application.interview_details.link}
              </a>
            </p>
          </div>
        )}
        
        {actionMessage && (
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded-lg">
            <p className="text-sm">{actionMessage}</p>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-xl font-semibold text-gray-800">{application.jobs.title}</h3>
          <p className="text-sm text-gray-500 mt-1">Perusahaan: {application.jobs.company}</p>
        </div>
      </div>
    </div>
  );
}
