import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import QuestionBankPage from './QuestionBankPage';
import ManualAssessmentReviewPage from './ManualAssessmentReviewPage';

const JobItem = ({ job, onOpenJobForm, onViewApplicants, onDeleteJob }) => (
    <div
        className="bg-white rounded-xl shadow-lg p-6 transition-shadow duration-300 border border-gray-200"
    >
        <div className="cursor-pointer">
            <h4 className="text-xl font-semibold text-gray-800">{job.title}</h4>
            <p className="text-sm text-gray-500 mt-1">{job.company} | {job.location}</p>
        </div>
        <div className="mt-4 flex space-x-2">
            <button
                // Perbaikan di sini: gunakan job.id
                onClick={() => onViewApplicants(job.id, job.title)}
                className="text-sm text-blue-500 hover:text-blue-700 font-semibold"
            >
                Lihat Pelamar
            </button>
            <button
                onClick={() => onOpenJobForm(job)}
                className="text-sm text-blue-500 hover:text-blue-700 font-semibold"
            >
                Edit
            </button>
            <button
                onClick={() => onDeleteJob(job.id)}
                className="text-sm text-red-500 hover:text-red-700 font-semibold"
            >
                Hapus
            </button>
        </div>
    </div>
);

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [applicantsToReview, setApplicantsToReview] = useState([]);
  const [view, setView] = useState('list');
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showManualReview, setShowManualReview] = useState(false);
  const navigate = useNavigate();

  const handleReviewClick = (applicantId) => { 
    setSelectedApplicant(applicantsToReview.find(app => app.id === applicantId));
    setShowManualReview(true);
  };
  
  const fetchJobs = async () => {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*, applicants(*)')
      .order('created_at', { ascending: false });
    
    if (userProfile?.role !== 'admin_hc' && userProfile?.company) {
      query = query.eq('company', userProfile.company);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
    } else {
      setJobs(data);
      const allApplicants = data.flatMap(job => job.applicants || []);
      const toReview = allApplicants.filter(app => app.status === 'Assessment - Needs Review');
      setApplicantsToReview(toReview);
    }
    setLoading(false);
  };
  
  const handleDeleteJob = async (jobId) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus lowongan ini?")) {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) {
        alert('Gagal menghapus lowongan: ' + error.message);
      } else {
        alert('Lowongan berhasil dihapus.');
        fetchJobs();
      }
    }
  };
  
  const handleOpenJobForm = (job = null) => {
    navigate('/admin/jobForm', { state: { jobToEdit: job } });
  };
  
  // Perbaikan di sini: Gunakan `Maps` untuk berpindah halaman
  const onViewApplicants = (jobId, jobTitle) => {
    navigate(`/admin/applicants/${jobId}`, { state: { jobTitle } });
  };

  useEffect(() => {
    if (userProfile) {
      fetchJobs();
    }
  }, [userProfile]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }

  const renderView = () => {
    if (showManualReview && selectedApplicant) {
      return (
        <ManualAssessmentReviewPage 
          applicantId={selectedApplicant.id} 
          onBack={() => {
            setShowManualReview(false);
            setSelectedApplicant(null);
          }} 
        />
      );
    } else if (view === 'questionBank') {
        return <QuestionBankPage onBack={() => setView('list')} />;
    } else {
      return (
        <>
          {applicantsToReview.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-red-600 mb-4">
                ⚠️ Pelamar Perlu Ditinjau Secara Manual ({applicantsToReview.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applicantsToReview.map(applicant => (
                  <div 
                    key={applicant.id} 
                    className="bg-red-50 border-2 border-red-200 p-4 rounded-lg shadow cursor-pointer hover:shadow-lg hover:border-red-300 transition-all duration-200"
                    onClick={() => handleReviewClick(applicant.id)}
                  >
                    <p className="font-semibold text-gray-900">{applicant.name}</p>
                    <p className="text-sm text-gray-600">Posisi: {applicant.jobs?.title || 'N/A'}</p>
                    <p className="text-sm text-red-600 mt-2 font-bold">
                      🔍 Status: Perlu Ditinjau Manual
                    </p>
                    <div className="mt-2 text-xs text-red-500 bg-red-100 px-2 py-1 rounded">
                      Klik untuk meninjau
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between items-center">
            <h3 className="text-2xl font-semibold">Kelola Lowongan</h3>
            <div className="space-x-2">
                <button
                    onClick={() => setView('questionBank')}
                    className="bg-purple-500 text-white font-bold py-2 px-4 rounded-full hover:bg-purple-600 transition-colors duration-200"
                >
                    Bank Soal
                </button>
                <button
                    onClick={() => handleOpenJobForm()}
                    className="bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition-colors duration-200"
                >
                    + Tambah Lowongan
                </button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.length > 0 ? (
              jobs.map(job => (
                <JobItem
                    key={job.id}
                    job={job}
                    onOpenJobForm={handleOpenJobForm}
                    onViewApplicants={onViewApplicants}
                    onDeleteJob={handleDeleteJob}
                />
              ))
            ) : (
              <p className="col-span-full text-center text-gray-500">Tidak ada lowongan yang tersedia.</p>
            )}
          </div>
        </>
      );
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Admin</h2>
      <p className="text-gray-600">Selamat datang, <span className="font-semibold">{userProfile?.email}</span>.</p>
      <p className="text-gray-600">Peran Anda: <span className="font-semibold capitalize">{userProfile?.role}</span>.</p>
      {renderView()}
    </div>
  );
}