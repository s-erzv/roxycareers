import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import JobForm from './JobForm';

// Komponen untuk menampilkan daftar pelamar
const ApplicantsList = ({ job, applicants, onBack, onDownloadFile }) => (
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
                  <div className={`mt-2 text-sm font-bold ${applicant.status === 'Applied' ? 'text-blue-600' : applicant.status === 'Shortlisted' ? 'text-green-600' : 'text-red-600'}`}>
                    Status: {applicant.status}
                  </div>
                </div>
                <div>
                  {/* Tombol untuk mengunduh file */}
                  {applicant.uploaded_files && applicant.uploaded_files.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => onDownloadFile(file.split(': ')[1])}
                      className="mt-2 text-sm text-teal-600 hover:underline"
                    >
                      Unduh {file.split(': ')[0]}
                    </button>
                  ))}
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

export default function AdminDashboard({ userProfile }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobToEdit, setJobToEdit] = useState(null);

  // Fungsi untuk mengambil daftar pekerjaan
  const fetchJobs = async () => {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter berdasarkan perusahaan jika bukan admin_hc
    if (userProfile.role !== 'admin_hc' && userProfile.company) {
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
  
  // Fungsi untuk mengambil daftar pelamar berdasarkan pekerjaan
  const fetchApplicants = async (jobId) => {
    setLoading(true);
    let query = supabase
      .from('applicants')
      .select('*')
      .eq('job_id', jobId);
      
    // Filter berdasarkan perusahaan hanya jika userProfile.company tidak kosong
    if (userProfile.company) {
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
  
  // Fungsi untuk mengunduh file dari Supabase Storage
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
        fetchJobs(); // Muat ulang daftar lowongan
      }
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [userProfile]); // Tambahkan userProfile sebagai dependency agar daftar diperbarui saat peran berubah

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }

  // Tampilkan formulir Tambah/Edit Lowongan
  if (showJobForm) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
        <JobForm
          onClose={() => { setShowJobForm(false); setJobToEdit(null); }}
          onJobAdded={fetchJobs} // Perbarui daftar setelah menambah/mengedit
          jobToEdit={jobToEdit}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Admin</h2>
      <p className="text-gray-600">Selamat datang, <span className="font-semibold">{userProfile.email}</span>.</p>
      <p className="text-gray-600">Peran Anda: <span className="font-semibold capitalize">{userProfile.role}</span>.</p>

      {selectedJob ? (
        <ApplicantsList 
          job={selectedJob} 
          applicants={applicants} 
          onBack={() => setSelectedJob(null)} 
          onDownloadFile={handleDownloadFile}
        />
      ) : (
        <>
          <div className="mt-8 flex justify-between items-center">
            <h3 className="text-2xl font-semibold">Kelola Lowongan</h3>
            <button
              onClick={() => setShowJobForm(true)}
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
                  }}>
                    <h4 className="text-xl font-semibold text-gray-800">{job.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{job.company} | {job.location}</p>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => { setJobToEdit(job); setShowJobForm(true); }}
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
      )}
    </div>
  );
}
