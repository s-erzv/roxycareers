import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const ApplicantDetail = ({ applicant, onBack, onDownloadFile, onUpdateStatus }) => {
  const [currentStatus, setCurrentStatus] = useState(applicant.status);
  
  const handleChangeStatus = (e) => {
    const newStatus = e.target.value;
    setCurrentStatus(newStatus);
    onUpdateStatus(applicant.id, newStatus);
  };

  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali ke Daftar Pelamar
      </button>
      <div className="bg-white rounded-xl shadow-lg p-8 mt-4">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Detail Pelamar</h3>
        <p><strong>Nama:</strong> {applicant.name}</p>
        <p><strong>Email:</strong> {applicant.email}</p>
        <p><strong>Melamar untuk:</strong> {applicant.jobs.title}</p>
        
        <div className="mt-4">
          <h4 className="text-lg font-semibold">Status & Screening</h4>
          <div className="mt-2 flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold 
              ${currentStatus === 'Applied' ? 'bg-blue-100 text-blue-800' :
              currentStatus === 'Shortlisted' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'}`}
            >
              Status: {currentStatus}
            </span>
            <select 
              value={currentStatus} 
              onChange={handleChangeStatus}
              className="p-1 rounded-lg border border-gray-300 text-sm"
            >
              <option value="Applied">Applied</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Scheduled for Assessment">Scheduled for Assessment</option>
              <option value="Interviewed">Interviewed</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold 
              ${applicant.auto_screening_status === 'Lolos' ? 'bg-green-200 text-green-800' :
              applicant.auto_screening_status === 'Tidak Lolos' ? 'bg-red-200 text-red-800' :
              'bg-gray-200 text-gray-800'}`}
            >
              Screening: {applicant.auto_screening_status}
            </span>
          </div>
          {applicant.auto_screening_log && applicant.auto_screening_log['Tidak Lolos']?.length > 0 && (
            <div className="mt-2 text-xs text-red-500">
              <strong>Catatan:</strong> {applicant.auto_screening_log['Tidak Lolos'].map(log => log.reason).join(' | ')}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h4 className="text-lg font-semibold">Jawaban Pre-Screening</h4>
          <ul className="mt-2 list-disc list-inside">
            {Object.keys(applicant.custom_answers).map((key) => (
              <li key={key}><strong>{key}:</strong> {applicant.custom_answers[key]}</li>
            ))}
          </ul>
        </div>
        
        <div className="mt-6">
          <h4 className="text-lg font-semibold">Dokumen</h4>
          <ul className="mt-2 list-disc list-inside">
            {applicant.uploaded_files && applicant.uploaded_files.map((file, index) => (
              <li key={index}>
                <button
                  onClick={() => onDownloadFile(file.split(': ')[1])}
                  className="text-sm text-teal-600 hover:underline"
                >
                  {file.split(': ')[0]} ({file.split('/').pop()})
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetail;
