import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// Fungsi utilitas untuk membersihkan nama file
const sanitizeFileName = (fileName) => {
  const cleanName = fileName.replace(/[^a-zA-Z0-9\s.-]/g, '');
  return cleanName.replace(/\s+/g, '-');
};

const JobCard = ({ job, onClick }) => (
  <div onClick={() => onClick(job)} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow duration-300 cursor-pointer border border-gray-200">
    <h3 className="text-xl font-semibold text-gray-800">{job.title}</h3>
    <p className="text-sm text-gray-500 mt-1">{job.company} | {job.location}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <span className="text-xs font-medium bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">{job.division}</span>
      <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">{job.type}</span>
      <span className="text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{job.level}</span>
    </div>
  </div>
);

const JobDetail = ({ job, onBack }) => {
  const [showModal, setShowModal] = useState(false);
  const { session } = useAuth();

  const ApplicationForm = ({ job, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [cvFile, setCvFile] = useState(null);
    const [certFile, setCertFile] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [customAnswers, setCustomAnswers] = useState({});

    const handleCustomAnswerChange = (label, value, fieldType, checked = false) => {
      let processedValue = value;
      
      if (fieldType === 'boolean') {
        processedValue = checked;
      } else if (fieldType === 'number' && value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          processedValue = numValue;
        }
      }
      
      setCustomAnswers(prev => ({ ...prev, [label]: processedValue }));
    };


    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);

      const user = session?.user;
      
      if (!cvFile) {
        alert('Anda wajib mengunggah CV.');
        setLoading(false);
        return;
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (cvFile.size > MAX_FILE_SIZE || (certFile && certFile.size > MAX_FILE_SIZE)) {
        alert('Ukuran file tidak boleh melebihi 5MB.');
        setLoading(false);
        return;
      }

      const userId = user?.id;
      const uploadedFiles = [];

      try {
        // Upload files to Supabase Storage (this part remains in the frontend)
        const uploadFile = async (file) => {
          const fileName = sanitizeFileName(file.name);
          const filePath = `${userId || 'public'}/${fileName}`;
          
          const { data, error } = await supabase.storage
            .from('candidate-uploads')
            .upload(filePath, file, { upsert: true, contentType: file.type });

          if (error) throw error;
          uploadedFiles.push(data.path);
        };

        const filesToUpload = [];
        filesToUpload.push(uploadFile(cvFile));
        if (certFile) filesToUpload.push(uploadFile(certFile));
        
        await Promise.all(filesToUpload);

        // Send application data to the backend for processing
        const response = await fetch('http://localhost:8000/api/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            job_id: job.id,
            user_id: userId,
            uploadedFiles,
            company: job.company,
            custom_answers: customAnswers,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }

        alert('Lamaran Anda berhasil dikirim!');
        onClose(); // Tutup modal setelah berhasil
      } catch (error) {
        alert('Gagal mengirim lamaran: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Nama Lengkap</label>
          <input type="text" name="name" value={name} onChange={(e) => setName(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
          <input type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required />
        </div>
        
        

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Upload CV</label>
          <input type="file" onChange={(e) => setCvFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Upload Sertifikat (Opsional)</label>
          <input type="file" onChange={(e) => setCertFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
        </div>
        <div className="flex justify-end space-x-4 mt-6">
          <button type="button" onClick={onClose} className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-full hover:bg-gray-400 transition-colors duration-200">
            Batal
          </button>
          <button type="submit" className="bg-teal-500 text-white font-bold py-2 px-4 rounded-full hover:bg-teal-600 transition-colors duration-200" disabled={loading}>
            {loading ? 'Mengunggah...' : 'Kirim Lamaran'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Kembali
      </button>
      <div className="bg-white rounded-xl shadow-lg p-8 mt-4">
        <h2 className="text-3xl font-bold text-gray-900">{job.title}</h2>
        <p className="text-gray-500 mt-2">{job.company} - {job.location}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded-full">{job.division}</span>
          <span className="bg-purple-100 text-purple-800 text-sm font-semibold px-2.5 py-0.5 rounded-full">{job.type}</span>
          <span className="bg-pink-100 text-pink-800 text-sm font-semibold px-2.5 py-0.5 rounded-full">{job.level}</span>
        </div>
        
        <div className="mt-6 text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: job.description }}></div>
        
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h4 className="font-semibold text-lg">Informasi Tambahan</h4>
          {job.recruitment_process_type === 'assessment' && job.assessment_details && (
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold">Proses selanjutnya:</span> Asesmen {job.assessment_details.type}
            </p>
          )}
          {job.recruitment_process_type === 'interview' && job.interview_details && (
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold">Proses selanjutnya:</span> Interview
            </p>
          )}
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-semibold">Batas Waktu Lamaran:</span> {new Date(job.apply_deadline).toLocaleString()}
          </p>
        </div>

        <button onClick={() => setShowModal(true)} className="mt-8 bg-teal-500 text-white font-bold py-3 px-6 rounded-full hover:bg-teal-600 transition-colors duration-300">
          Lamar Sekarang
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative bg-white p-8 rounded-xl shadow-xl max-w-lg w-full">
            <h3 className="text-2xl font-bold mb-4">Formulir Lamaran</h3>
            <ApplicationForm job={job} onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filter, setFilter] = useState({
    location: '',
    division: '',
    company: '',
    type: '',
    level: '',
  });
  const [uniqueFilters, setUniqueFilters] = useState({});

  const fetchJobs = async () => {
    setLoading(true);
    let query = supabase.from('jobs').select('*');

    if (filter.location) query = query.eq('location', filter.location);
    if (filter.division) query = query.eq('division', filter.division);
    if (filter.company) query = query.eq('company', filter.company);
    if (filter.type) query = query.eq('type', filter.type);
    if (filter.level) query = query.eq('level', filter.level);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
    } else {
      setJobs(data);
    }
    setLoading(false);
  };
  
  const fetchUniqueFilters = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('jobs').select('location, division, company, type, level');
    if (!error) {
      const allLocations = [...new Set(data.map(item => item.location))];
      const allDivisions = [...new Set(data.map(item => item.division))];
      const allCompanies = [...new Set(data.map(item => item.company))];
      const allTypes = [...new Set(data.map(item => item.type))];
      const allLevels = [...new Set(data.map(item => item.level))];
      setUniqueFilters({
        location: allLocations,
        division: allDivisions,
        company: allCompanies,
        type: allTypes,
        level: allLevels,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUniqueFilters();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [filter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }

  if (selectedJob) {
    return <JobDetail job={selectedJob} onBack={() => setSelectedJob(null)} />;
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Lowongan Pekerjaan</h2>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h4 className="font-semibold text-lg mb-4">Filter & Cari</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <select name="company" value={filter.company} onChange={(e) => setFilter({...filter, company: e.target.value})} className="p-2 rounded-lg border border-gray-300">
            <option value="">Perusahaan</option>
            {uniqueFilters.company?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select name="location" value={filter.location} onChange={(e) => setFilter({...filter, location: e.target.value})} className="p-2 rounded-lg border border-gray-300">
            <option value="">Lokasi</option>
            {uniqueFilters.location?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select name="division" value={filter.division} onChange={(e) => setFilter({...filter, division: e.target.value})} className="p-2 rounded-lg border border-gray-300">
            <option value="">Divisi</option>
            {uniqueFilters.division?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select name="type" value={filter.type} onChange={(e) => setFilter({...filter, type: e.target.value})} className="p-2 rounded-lg border border-gray-300">
            <option value="">Jenis Pekerjaan</option>
            {uniqueFilters.type?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select name="level" value={filter.level} onChange={(e) => setFilter({...filter, level: e.target.value})} className="p-2 rounded-lg border border-gray-300">
            <option value="">Level Jabatan</option>
            {uniqueFilters.level?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.length > 0 ? (
          jobs.map(job => (
            <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">Tidak ada lowongan yang tersedia saat ini.</p>
        )}
      </div>
    </div>
  );
}