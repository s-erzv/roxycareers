import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ApplicantDetail from '../components/ApplicantDetail';
import SchedulingForm from '../components/SchedulingForm';
import { useNavigate } from 'react-router-dom';
import JobFormPage from './JobFormPage';

// Komponen untuk menampilkan daftar pelamar
const ApplicantsList = ({ job, applicants, onBack, onDownloadFile, onUpdateStatus, onSelectApplicant, onRescreen }) => (
  <div className="p-8">
    <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Kembali ke Daftar Lowongan
    </button>
    <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">Pelamar untuk: {job.title}</h3>
      {applicants.length > 0 ? (
        <ul className="space-y-4">
          {applicants.map(applicant => (
            <li key={applicant.id} className="bg-gray-100 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-800">{applicant.name}</div>
                  <div className="text-sm text-gray-500">{applicant.email}</div>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold 
                      ${applicant.status === 'Applied' ? 'bg-blue-100 text-blue-800' :
                      applicant.status === 'Shortlisted' ? 'bg-green-100 text-green-800' :
                      applicant.status === 'Scheduled for Interview' ? 'bg-yellow-100 text-yellow-800' :
                      applicant.status === 'Interviewed' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-red-100 text-red-800'}`}
                    >
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
                    onClick={() => onSelectApplicant(applicant)}
                    className="text-sm text-blue-500 hover:text-blue-700 font-semibold"
                  >
                    Lihat Detail
                  </button>
                  <button
                    onClick={() => onRescreen(applicant.id)}
                    className="text-sm text-yellow-500 hover:text-yellow-700 font-semibold"
                  >
                    Rescreen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-gray-500">Belum ada pelamar untuk lowongan ini.</p>
      )}
    </div>
  </div>
);

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [view, setView] = useState('list');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const navigate = useNavigate();

  const triggerAutoScheduling = async (jobId) => {
  if (!window.confirm('Apakah Anda yakin ingin menjadwalkan interview secara otomatis untuk lowongan ini?')) {
    return;
  }
  
  try {
    const response = await fetch(`https://{your-supabase-url}/auto_schedule_interviews/${jobId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Tambahkan header otentikasi jika diperlukan
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Gagal menjadwalkan.');
    }

    const data = await response.json();
    console.log('Penjadwalan berhasil:', data.schedules);
    alert('Penjadwalan otomatis berhasil dijalankan!');
    // Muat ulang data dashboard setelah berhasil
    fetchJobs(); 

  } catch (error) {
    console.error('Error saat menjadwalkan:', error);
    alert('Terjadi kesalahan saat menjadwalkan.');
  }
};

  const handleRescreening = async (applicantId, onRescreenSuccess) => {
    try {
      const response = await fetch('http://localhost:8000/api/rescreen-applicant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicant_id: applicantId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
      
      const resultData = await response.json();
      
      alert('Rescreening berhasil! Status pelamar akan diperbarui.');
      
      if (onRescreenSuccess) {
        onRescreenSuccess(resultData);
      }
    } catch (error) {
      alert('Gagal melakukan rescreening: ' + error.message);
    }
  };

  const handleRescreeningAndRefresh = async (applicantId) => {
    await handleRescreening(applicantId, (resultData) => {
      const updatedApplicants = applicants.map(app => 
        app.id === applicantId ? { 
          ...app, 
          status: resultData.applicant_status,
          auto_screening_status: resultData.new_status,
          ai_score: resultData.ai_score,
          final_score: resultData.final_score
        } : app
      );
      setApplicants(updatedApplicants);

      setSelectedApplicant(prev => prev?.id === applicantId ? {
        ...prev, 
        status: resultData.applicant_status,
        auto_screening_status: resultData.new_status,
        ai_score: resultData.ai_score,
        final_score: resultData.final_score
      } : prev);
      
    });
  };

  const handleBackToJobs = () => {
    setView('list');
    setSelectedJob(null);
    setSelectedApplicant(null);
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
    }
    setLoading(false);
  };
  
  const fetchApplicants = async (jobId) => {
    setLoading(true);
    let query = supabase
      .from('applicants')
      .select('*, jobs (title)')
      .eq('job_id', jobId);
      
    if (userProfile?.company) {
      query = query.eq('company', userProfile.company);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching applicants:', error);
    } else {
      setApplicants(data);
    }
    setLoading(false);
  };
  
  const handleUpdateApplicantStatus = async (applicantId, newStatus) => {
    const applicant = applicants.find(app => app.id === applicantId);

    if (newStatus === 'Scheduled for Interview') {
      setSelectedApplicant(applicant);
      setView('schedulingForm');
      return;
    }
    
    const { error } = await supabase
      .from('applicants')
      .update({ status: newStatus })
      .eq('id', applicantId);

    if (error) {
      alert('Gagal memperbarui status pelamar: ' + error.message);
    } else {
      const updatedApplicants = applicants.map(app => 
        app.id === applicantId ? { ...app, status: newStatus } : app
      );
      setApplicants(updatedApplicants);
      setSelectedApplicant(prev => prev?.id === applicantId ? {...prev, status: newStatus} : prev);
    }
  };
  
  const handleDownloadFile = async (filePath) => {
    const { data, error } = await supabase.storage
      .from('candidate-uploads')
      .download(filePath);
      
    if (error) {
      alert('Gagal mengunduh file: ' + error.message);
    } else {
      const url = URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filePath.split('/').pop();
      link.click();
      URL.revokeObjectURL(url);
    }
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
  
  const handleSchedulingComplete = () => {
    setView('list');
    fetchApplicants(selectedJob.id);
  };
  
  const handleOpenJobForm = (job = null) => {
    navigate('/admin/jobForm', { state: { jobToEdit: job } });
  };
  
  const handleCloseJobForm = () => {
    navigate('/admin');
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
    if (view === 'schedulingForm') {
      return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <SchedulingForm
            applicant={selectedApplicant}
            onClose={() => setView('applicantDetail')}
            onScheduleComplete={() => {
              setView('applicantsList');
              fetchApplicants(selectedJob.id);
            }}
          />
        </div>
      );
    } else if (view === 'applicantDetail') {
      return (
        <ApplicantDetail
          applicant={selectedApplicant}
          onBack={() => setView('applicantsList')}
          onDownloadFile={handleDownloadFile}
          onUpdateStatus={handleUpdateApplicantStatus}
        />
      );
    } else if (view === 'applicantsList') {
      return (
       <ApplicantsList
          job={selectedJob}
          applicants={applicants}
          onBack={handleBackToJobs}  
          onDownloadFile={handleDownloadFile}
          onUpdateStatus={handleUpdateApplicantStatus}
          onSelectApplicant={(applicant) => {
            setSelectedApplicant(applicant);
            setView('applicantDetail');
          }} 
          onRescreen={handleRescreeningAndRefresh}
        />      
      );
    } else {
      return (
        <>
          <div className="mt-8 flex justify-between items-center">
            <h3 className="text-2xl font-semibold">Kelola Lowongan</h3>
            <button
              onClick={() => handleOpenJobForm()}
              className="bg-blue-500 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-600 transition-colors duration-200"
            >
              + Tambah Lowongan
            </button>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.length > 0 ? (
              jobs.map(job => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl shadow-lg p-6 transition-shadow duration-300 border border-gray-200"
                >
                  <div className="cursor-pointer" onClick={() => {
                    setSelectedJob(job);
                    fetchApplicants(job.id);
                    setView('applicantsList');
                  }}>
                    <h4 className="text-xl font-semibold text-gray-800">{job.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{job.company} | {job.location}</p>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleOpenJobForm(job)}
                      className="text-sm text-blue-500 hover:text-blue-700 font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="text-sm text-red-500 hover:text-red-700 font-semibold"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
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