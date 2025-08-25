import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const getStatusMessage = (status) => {
    switch (status) {
        case 'Applied': return { color: 'blue', text: 'Menunggu Screening Otomatis' };
        case 'Shortlisted': return { color: 'green', text: 'Lolos Screening' };
        case 'Rejected': return { color: 'red', text: 'Tidak Lolos Screening' };
        case 'Needs Review': return { color: 'purple', text: 'Membutuhkan Tinjauan Manual' };
        case 'scheduled': return { color: 'yellow', text: 'Menunggu Interview' };
        case 'Lolos Assessment': return { color: 'green', text: 'Lolos Assessment' };
        case 'Gagal Assessment': return { color: 'red', text: 'Gagal Assessment' };
        case 'Assessment - Completed': return { color: 'gray', text: 'Assessment Selesai' };
        default: return { color: 'gray', text: status };
    }
};

const ApplicantDetail = ({ applicant, job, onClose }) => {
    const [isRescreening, setIsRescreening] = useState(false);
    const [rescreeningMessage, setRescreeningMessage] = useState('');

    const handleRescreen = async () => {
        setIsRescreening(true);
        setRescreeningMessage('Memulai rescreening... ini mungkin butuh waktu.');
        try {
            const response = await fetch('/api/rescreen_applicant/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicant_id: applicant.id }),
            });
            const data = await response.json();
            if (response.ok) {
                setRescreeningMessage(`Rescreening selesai! Status baru: ${data.applicant_status}`);
                // Anda mungkin perlu memuat ulang data pelamar dari parent component jika diperlukan
            } else {
                setRescreeningMessage(`Gagal rescreening: ${data.error}`);
            }
        } catch (error) {
            setRescreeningMessage(`Terjadi kesalahan jaringan: ${error.message}`);
        } finally {
            setIsRescreening(false);
        }
    };

    const applicantStatus = getStatusMessage(applicant.status);
    const autoScreeningStatus = getStatusMessage(applicant.auto_screening_status);

    return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">{applicant.name}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
            </div>
            <p className="text-sm text-gray-500">{applicant.email}</p>
            
            {/* Perbaikan: Tambahkan pengecekan kondisional untuk objek 'job' */}
            {job && (
                <p className="text-sm text-gray-500 mt-1">Melamar di: {job.title} ({job.company})</p>
            )}

            <div className="flex items-center mt-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white bg-${applicantStatus.color}-500`}>{applicantStatus.text}</span>
            </div>
            
            {/* Bagian Auto-Screening */}
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <h4 className="font-semibold text-gray-700">Hasil Screening Otomatis</h4>
                <div className="flex items-center mt-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white bg-${autoScreeningStatus.color}-500`}>{autoScreeningStatus.text}</span>
                    {applicant.final_score !== null && (
                        <span className="ml-2 text-sm text-gray-600">Skor Total: {applicant.final_score}</span>
                    )}
                </div>
                {/* Log screening */}
                {applicant.auto_screening_log && (
                    <div className="mt-2 text-xs text-gray-500">
                        <ul className="list-disc list-inside">
                            {applicant.auto_screening_log.Lolos.map((item, index) => <li key={`pass-${index}`} className="text-green-600">{item.reason}</li>)}
                            {applicant.auto_screening_log['Tidak Lolos'].map((item, index) => <li key={`fail-${index}`} className="text-red-600">{item.reason}</li>)}
                            {applicant.auto_screening_log.Review.map((item, index) => <li key={`review-${index}`} className="text-yellow-600">{item.reason}</li>)}
                        </ul>
                    </div>
                )}
            </div>
            
            {/* === Tambahan: Bagian untuk Gemini === */}
            {applicant.ai_score !== null && applicant.gemini_reason && (
                <div className="mt-4 p-4 bg-purple-100 rounded-lg border-l-4 border-purple-500 text-purple-800">
                    <h4 className="font-bold">Analisis AI Mendalam dari Gemini</h4>
                    <p className="mt-2 text-sm">
                        Skor AI: <strong>{applicant.ai_score}</strong>
                    </p>
                    <p className="text-sm mt-1">
                        Alasan Detail: <br />
                        {applicant.gemini_reason}
                    </p>
                </div>
            )}
            
            <div className="mt-4">
                {applicant.uploaded_files && applicant.uploaded_files[0] && (
                    <a href={applicant.uploaded_files[0]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Lihat CV</a>
                )}
                <button onClick={handleRescreen} className="ml-4 text-sm text-blue-600 hover:underline" disabled={isRescreening}>
                    {isRescreening ? 'Rescreening...' : 'Rescreening Otomatis Ulang'}
                </button>
                {rescreeningMessage && <p className="mt-2 text-sm text-gray-500">{rescreeningMessage}</p>}
            </div>
        </div>
    );
};

export default ApplicantDetail;