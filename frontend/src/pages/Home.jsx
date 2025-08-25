import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const STANDARD_LABELS = new Set(["name", "email", "phone_number", "CV", "resume_category"]);

// Helper: bersihkan nama file
function sanitizeFileName(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // hapus diakritik
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
}

// Komponen input untuk berbagai tipe field
function FieldRenderer({ field, value, onChange, fileValue, onFileChange }) {
  const common = {
    id: field.label,
    name: field.label,
    placeholder: field.placeholder || field.label,
    required: Boolean(field.required),
    className:
      "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline",
  };

  switch ((field.type || "text").toLowerCase()) {
    case "textarea":
      return (
        <textarea {...common} rows={4} value={value || ""} onChange={(e) => onChange(field, e.target.value)} />
      );
    case "select":
    case "dropdown": {
      let opts = [];
      if (Array.isArray(field.options)) {
        opts = field.options;
      } else if (typeof field.options === 'string') {
        opts = field.options.replace(/'/g, '').split(',').map(s => s.trim());
      }
      return (
        <select
          {...common}
          value={value || ""}
          onChange={(e) => onChange(field, e.target.value)}
        >
          <option value="" disabled>
            {field.placeholder || "Pilih salah satu"}
          </option>
          {opts.map((opt, idx) => (
            <option key={idx} value={typeof opt === "string" ? opt : opt.value}>
              {typeof opt === "string" ? opt : opt.label}
            </option>
          ))}
        </select>
      );
    }
    case "number":
      return (
        <input type="number" {...common} value={value ?? ""} onChange={(e) => onChange(field, e.target.value)} />
      );
    case "date":
      return <input type="date" {...common} value={value || ""} onChange={(e) => onChange(field, e.target.value)} />;
    case "checkbox":
    case "boolean":
      return (
        <input
          type="checkbox"
          id={field.label}
          name={field.label}
          checked={Boolean(value)}
          onChange={(e) => onChange(field, e.target.checked)}
          className="h-4 w-4"
        />
      );
    case "radio": {
      let opts = [];
      if (Array.isArray(field.options)) {
        opts = field.options;
      } else if (typeof field.options === 'string') {
        opts = field.options.replace(/'/g, '').split(',').map(s => s.trim());
      }
      return (
        <div className="space-y-2">
          {opts.map((opt, idx) => (
            <label key={idx} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name={field.label}
                value={typeof opt === "string" ? opt : opt.value}
                checked={(value || "") === (typeof opt === "string" ? opt : opt.value)}
                onChange={(e) => onChange(field, e.target.value)}
                className="h-4 w-4"
              />
              <span>{typeof opt === "string" ? opt : opt.label}</span>
            </label>
          ))}
        </div>
      );
    }
    case "file":
      return (
        <div>
          <input
            type="file"
            {...{ id: field.label, name: field.label, required: Boolean(field.required) }}
            onChange={(e) => onFileChange(field, e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            accept={field.file_types ? field.file_types.split(',').map(type => `.${type.trim()}`).join(',') : '*'}
          />
          {field.file_types && (
            <p className="text-xs text-gray-500 mt-1">
              Format yang diizinkan: {field.file_types}
            </p>
          )}
        </div>
      );
    default:
      return <input type="text" {...common} value={value || ""} onChange={(e) => onChange(field, e.target.value)} />;
  }
}

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
    
    // --- STANDARD FORM STATE ---
    const [standardAnswers, setStandardAnswers] = useState({
      name: "",
      email: "",
      phone_number: "",
      cv: null,
    });

    // Prefill nama & email dari session jika ada
    useEffect(() => {
      if (session?.user) {
        setStandardAnswers((prev) => ({
          ...prev,
          name: session.user.user_metadata?.full_name || prev.name,
          email: session.user.email || prev.email,
        }));
      }
    }, [session]);

    const handleStdChange = (e) => {
      const { name, value } = e.target;
      setStandardAnswers((prev) => ({ ...prev, [name]: value }));
    };
    
    const handleCvChange = (e) => {
      const file = e.target.files?.[0] || null;
      setStandardAnswers((prev) => ({ ...prev, cv: file }));
    };

    // --- CUSTOM FORM STATE ---
    const [customAnswers, setCustomAnswers] = useState({});
    const [uploadedFiles, setUploadedFiles] = useState({});

    const customOnlyFields = useMemo(
      () => (Array.isArray(job?.custom_fields) ? job.custom_fields : []).filter((f) => !STANDARD_LABELS.has(f.label)),
      [job]
    );

    const onCustomChange = (field, value) => {
      setCustomAnswers((prev) => ({ ...prev, [field.label]: value }));
    };
    
    const onCustomFileChange = (field, file) => {
      setUploadedFiles((prev) => ({ ...prev, [field.label]: file }));
    };

    // Upload file ke Supabase Storage
    async function uploadFileToStorage(path, file, contentType) {
      const { data, error } = await supabase.storage
        .from("candidate-uploads")
        .upload(path, file, { upsert: true, contentType });
      if (error) throw error;
      return data.path;
    }

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (loading) return;
      setLoading(true);

      try {
        const user = session?.user;
        const userId = user?.id || 'public';

        // 1) Validasi STANDARD
        if (!standardAnswers.name || !standardAnswers.email || !standardAnswers.phone_number || !standardAnswers.cv) {
          alert("Nama, Email, Nomor HP, dan CV wajib diisi.");
          setLoading(false);
          return;
        }

        // 2) Validasi CUSTOM (hanya field custom)
        for (const field of customOnlyFields) {
          if (field.required) {
            if (field.type === 'file' && !uploadedFiles[field.label]) {
              alert(`Field "${field.label}" wajib diisi.`);
              setLoading(false);
              return;
            } else if (field.type !== 'file' && (customAnswers[field.label] == null || customAnswers[field.label] === "")) {
              alert(`Field "${field.label}" wajib diisi.`);
              setLoading(false);
              return;
            }
          }
        }

        // 3) Upload semua FILE CUSTOM (jika ada)
        const uploadedFilePaths = {};
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

        for (const [label, file] of Object.entries(uploadedFiles)) {
          if (!file) continue;
          if (file.size > MAX_FILE_SIZE) {
            alert(`Ukuran file ${file.name} tidak boleh melebihi 5MB.`);
            setLoading(false);
            return;
          }
          const safe = sanitizeFileName(file.name);
          const path = `${userId}/${job?.id || "job"}/${label}/${safe}`;
          const storedPath = await uploadFileToStorage(path, file, file.type);
          uploadedFilePaths[label] = storedPath;
        }

        // 4) Upload CV STANDARD
        let cvPath = null;
        if (standardAnswers.cv) {
          if (standardAnswers.cv.size > MAX_FILE_SIZE) {
            alert(`Ukuran file ${standardAnswers.cv.name} tidak boleh melebihi 5MB.`);
            setLoading(false);
            return;
          }
          const safeCV = sanitizeFileName(standardAnswers.cv.name);
          const pathCV = `${userId}/${job?.id || "job"}/CV/${safeCV}`;
          cvPath = await uploadFileToStorage(pathCV, standardAnswers.cv, standardAnswers.cv.type);
        }

        // 5) Susun payload
        const payload = {
          job_id: job?.id,
          user_id: userId,
          company: job?.company || null,
          status: "Submitted",
          name: standardAnswers.name,
          email: standardAnswers.email,
          uploaded_files: [
            ...(cvPath ? [cvPath] : []),
            ...Object.values(uploadedFilePaths),
          ],
          custom_answers: {
            phone_number: standardAnswers.phone_number,
            ...customAnswers,
            ...uploadedFilePaths,
          },
          auto_screening_status: "Pending",
          assessment_status: "Pending",
        };

        // 6) Kirim ke API
        const res = await fetch("http://localhost:8000/api/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Gagal mengirim lamaran.");
        }

        alert("Lamaran terkirim. Terima kasih!");
        onClose();
      } catch (err) {
        console.error(err);
        alert(err.message || "Terjadi kesalahan saat mengirim lamaran.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* STANDARD FIELDS */}
        <section className="space-y-4">
          <h4 className="font-semibold text-gray-800">Data Pelamar</h4>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Nama Lengkap *
            </label>
            <input
              id="name"
              name="name"
              value={standardAnswers.name}
              onChange={handleStdChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email *
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={standardAnswers.email}
              onChange={handleStdChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone_number">
              Nomor HP *
            </label>
            <input
              id="phone_number"
              name="phone_number"
              value={standardAnswers.phone_number}
              onChange={handleStdChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cv">
              CV *
            </label>
            <input
              id="cv"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleCvChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              required
            />
          </div>
        </section>

        {/* CUSTOM FIELDS */}
        {customOnlyFields.length > 0 && (
          <section className="space-y-4 border-t border-gray-200 pt-4">
            <h4 className="font-semibold text-gray-800">Pertanyaan Tambahan</h4>
            {customOnlyFields.map((field, idx) => (
              <div key={`${field.label}-${idx}`} className="space-y-2">
                <label htmlFor={field.label} className="block text-gray-700 text-sm font-bold">
                  {field.label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} {field.required ? "*" : ""}
                </label>
                <FieldRenderer
                  field={field}
                  value={customAnswers[field.label]}
                  fileValue={uploadedFiles[field.label]}
                  onChange={onCustomChange}
                  onFileChange={onCustomFileChange}
                />
                {field.help && <p className="text-xs text-gray-500">{field.help}</p>}
              </div>
            ))}
          </section>
        )}
        
        <div className="flex justify-end space-x-4 mt-6">
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-full hover:bg-gray-400 transition-colors duration-200"
          >
            Batal
          </button>
          <button 
            type="submit" 
            className="bg-teal-500 text-white font-bold py-2 px-4 rounded-full hover:bg-teal-600 transition-colors duration-200 disabled:opacity-50" 
            disabled={loading}
          >
            {loading ? 'Mengunggah...' : 'Kirim Lamaran'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <button onClick={onBack} className="mb-4 text-teal-600 hover:text-teal-800 font-semibold">
        ← Kembali ke Daftar Lowongan
      </button>
      
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{job.title}</h3>
        <p className="text-lg text-gray-600 mb-4">{job.company} | {job.location}</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm font-medium bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">{job.division}</span>
          <span className="text-sm font-medium bg-green-100 text-green-800 px-3 py-1 rounded-full">{job.type}</span>
          <span className="text-sm font-medium bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">{job.level}</span>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 className="font-semibold text-gray-800 mb-2">Deskripsi Pekerjaan</h4>
          <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
        </div>
        
        {job.apply_deadline && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
            <p className="text-red-800 text-sm">
              <strong>Batas Waktu Lamaran:</strong> {new Date(job.apply_deadline).toLocaleString('id-ID')}
            </p>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="bg-teal-500 text-white font-bold py-2 px-6 rounded-full hover:bg-teal-600 transition-colors duration-200"
        >
          Lamar Sekarang
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Lamar untuk: {job.title}</h3>
            <ApplicationForm job={job} onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

const Home = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    company: '',
    location: '',
    division: '',
    type: '',
    level: ''
  });
  const [uniqueFilters, setUniqueFilters] = useState({
    company: [],
    location: [],
    division: [],
    type: [],
    level: []
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      setJobs(data || []);

      // Generate unique filter options
      const filters = {
        company: [...new Set(data.map(job => job.company))],
        location: [...new Set(data.map(job => job.location))],
        division: [...new Set(data.map(job => job.division))],
        type: [...new Set(data.map(job => job.type))],
        level: [...new Set(data.map(job => job.level))]
      };
      setUniqueFilters(filters);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter jobs based on filter state
  const filteredJobs = jobs.filter(job => {
    return (
      (!filter.company || job.company === filter.company) &&
      (!filter.location || job.location === filter.location) &&
      (!filter.division || job.division === filter.division) &&
      (!filter.type || job.type === filter.type) &&
      (!filter.level || job.level === filter.level)
    );
  });

  if (selectedJob) {
    return <JobDetail job={selectedJob} onBack={() => setSelectedJob(null)} />;
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Memuat lowongan pekerjaan...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Lowongan Pekerjaan</h2>
      
      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h4 className="font-semibold text-lg mb-4">Filter & Cari</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <select 
            name="company" 
            value={filter.company} 
            onChange={(e) => setFilter({...filter, company: e.target.value})} 
            className="p-2 rounded-lg border border-gray-300"
          >
            <option value="">Semua Perusahaan</option>
            {uniqueFilters.company?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          
          <select 
            name="location" 
            value={filter.location} 
            onChange={(e) => setFilter({...filter, location: e.target.value})} 
            className="p-2 rounded-lg border border-gray-300"
          >
            <option value="">Semua Lokasi</option>
            {uniqueFilters.location?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          
          <select 
            name="division" 
            value={filter.division} 
            onChange={(e) => setFilter({...filter, division: e.target.value})} 
            className="p-2 rounded-lg border border-gray-300"
          >
            <option value="">Semua Divisi</option>
            {uniqueFilters.division?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          
          <select 
            name="type" 
            value={filter.type} 
            onChange={(e) => setFilter({...filter, type: e.target.value})} 
            className="p-2 rounded-lg border border-gray-300"
          >
            <option value="">Semua Jenis</option>
            {uniqueFilters.type?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          
          <select 
            name="level" 
            value={filter.level} 
            onChange={(e) => setFilter({...filter, level: e.target.value})} 
            className="p-2 rounded-lg border border-gray-300"
          >
            <option value="">Semua Level</option>
            {uniqueFilters.level?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.length > 0 ? (
          filteredJobs.map(job => (
            <JobCard key={job.id} job={job} onClick={setSelectedJob} />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <div className="bg-gray-50 rounded-lg p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada lowongan ditemukan</h3>
              <p className="text-gray-500">
                {jobs.length === 0 
                  ? "Belum ada lowongan yang tersedia saat ini."
                  : "Coba ubah filter pencarian Anda."
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;