import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ApplicantDetail from './ApplicantDetail';

const fetchApplicantsFromSupabase = async (jobId, userProfile) => {
    let query = supabase
        .from('applicants')
        .select('*, jobs (title)')
        .eq('job_id', jobId);

    if (userProfile?.role !== 'admin_hc' && userProfile?.company) {
        query = query.eq('company', userProfile.company);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error('Error fetching applicants: ' + error.message);
    }
    return data;
};

export default function ApplicantsList() {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const { jobId } = useParams();
    const location = useLocation();
    const { jobTitle } = location.state || {};

    const [loading, setLoading] = useState(true);
    const [applicants, setApplicants] = useState([]);
    const [error, setError] = useState(null);
    const [selectedApplicant, setSelectedApplicant] = useState(null);

    // Use a single useEffect hook to manage the data fetching lifecycle
    useEffect(() => {
        const loadApplicants = async () => {
            if (!jobId) return;
            setLoading(true);
            setError(null);
            try {
                const data = await fetchApplicantsFromSupabase(jobId, userProfile);
                setApplicants(data);
            } catch (err) {
                setError(err.message);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadApplicants();
    }, [jobId, userProfile]);

    const handleDownloadFile = async (filePath) => {
        try {
            const { data, error } = await supabase.storage
                .from('candidate-uploads')
                .download(filePath);
            if (error) throw new Error(error.message);

            const url = URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = filePath.split('/').pop();
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Gagal mengunduh file: ' + err.message);
        }
    };

    const handleRescreeningAndRefresh = async (applicantId) => {
        try {
            const response = await fetch('http://localhost:8000/api/rescreen-applicant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicant_id: applicantId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            const resultData = await response.json();
            alert('Rescreening berhasil! Status pelamar akan diperbarui.');

            setApplicants(prevApplicants => prevApplicants.map(app =>
                app.id === applicantId ? {
                    ...app,
                    status: resultData.applicant_status,
                    auto_screening_status: resultData.new_status,
                    ai_score: resultData.ai_score,
                    final_score: resultData.final_score
                } : app
            ));

            setSelectedApplicant(prev => prev?.id === applicantId ? {
                ...prev,
                status: resultData.applicant_status,
                auto_screening_status: resultData.new_status,
                ai_score: resultData.ai_score,
                final_score: resultData.final_score
            } : prev);

        } catch (err) {
            alert('Gagal melakukan rescreening: ' + err.message);
        }
    };

    if (selectedApplicant) {
        return (
            <ApplicantDetail
                applicant={selectedApplicant}
                onBack={() => setSelectedApplicant(null)}
                onDownloadFile={handleDownloadFile}
                onRescreen={handleRescreeningAndRefresh}
            />
        );
    }
    
    // Define UI rendering logic based on the state
    const renderContent = () => {
        if (loading) {
            return <div className="text-center text-gray-500">Memuat pelamar...</div>;
        }

        if (error) {
            return <div className="text-center text-red-500">Terjadi kesalahan: {error}</div>;
        }

        if (applicants.length === 0) {
            return <p className="text-center text-gray-500">Belum ada pelamar untuk lowongan ini.</p>;
        }

        return (
            <ul className="space-y-4">
                {applicants.map(applicant => (
                    <li key={applicant.id} className="bg-gray-100 p-4 rounded-lg shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-semibold text-gray-800">{applicant.name}</div>
                                <div className="text-sm text-gray-500">{applicant.email}</div>
                                <div className="mt-2 flex items-center space-x-2">
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColorClass(applicant.status)}`}>
                                        Status: {applicant.status}
                                    </span>
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
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setSelectedApplicant(applicant)}
                                    className="text-sm text-blue-500 hover:text-blue-700 font-semibold"
                                >
                                    Lihat Detail
                                </button>
                                <button
                                    onClick={() => handleRescreeningAndRefresh(applicant.id)}
                                    className="text-sm text-yellow-500 hover:text-yellow-700 font-semibold"
                                >
                                    Rescreen
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'applied': return 'bg-blue-100 text-blue-800';
            case 'shortlisted': return 'bg-green-100 text-green-800';
            case 'scheduled': return 'bg-yellow-100 text-yellow-800';
            case 'interviewed': return 'bg-indigo-100 text-indigo-800';
            case 'hired': return 'bg-teal-100 text-teal-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-8">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Dashboard Admin
            </button>
            <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Pelamar untuk: {jobTitle}</h3>
                {renderContent()}
            </div>
        </div>
    );
}