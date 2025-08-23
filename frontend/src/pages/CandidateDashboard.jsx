import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ApplicationDetail from './ApplicationDetail';
import AssessmentPage from './AssessmentPage';

export default function CandidateDashboard() {
  const { session } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);

  useEffect(() => {
    const fetchApplicationsAndSchedules = async () => {
      setLoading(true);
      if (!session) {
        setError('Silakan login untuk melihat status aplikasi Anda.');
        setLoading(false);
        return;
      }

      const { data: applicants, error: applicantsError } = await supabase
        .from('applicants')
        .select(`
          id,
          status,
          created_at,
          interview_details,
          assessment_details,
          contact_person,
          jobs (
            id,  
            title,
            company,
            recruitment_process_type,
            interview_details,
            assessment_details,
            daily_start_time,
            daily_end_time,
            description
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (applicantsError) {
        setError('Gagal memuat aplikasi: ' + applicantsError.message);
        console.error('Error fetching applications:', applicantsError);
        setLoading(false);
        return;
      }

      const applicantIds = applicants.map(app => app.id);
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('*')
        .in('applicant_id', applicantIds);

      if (schedulesError) {
        console.error('Error fetching schedules:', schedulesError);
      }

      const applicationsWithSchedules = applicants.map(app => {
        const matchingSchedules = schedules.filter(s => s.applicant_id === app.id);
        return {
          ...app,
          schedules: matchingSchedules
        };
      });

      setApplications(applicationsWithSchedules);
      setLoading(false);
    };

    fetchApplicationsAndSchedules();
  }, [session]);

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Applied':
        return { label: 'Lamaran Terkirim', color: 'bg-blue-100 text-blue-800' };
      case 'Shortlisted':
        return { label: 'Lolos Seleksi Berkas', color: 'bg-green-100 text-green-800' };
      case 'scheduled':
        return { label: 'Jadwal Interview', color: 'bg-yellow-100 text-yellow-800' };
      case 'Interviewed':
        return { label: 'Menunggu Pengumuman', color: 'bg-indigo-100 text-indigo-800' };
      case 'Hired':
        return { label: 'Diterima', color: 'bg-green-500 text-white' };
      case 'Rejected':
        return { label: 'Ditolak', color: 'bg-red-500 text-white' };
      case 'Assessment - Completed':
      case 'Assessment - Needs Review':
      case 'Assessment - Reviewed':
        return { label: 'Asesmen Selesai', color: 'bg-gray-400 text-white' };
      case 'Lolos Assessment':
        return { label: 'Lolos Asesmen', color: 'bg-green-500 text-white' };
      case 'Gagal Assessment':
        return { label: 'Gagal Asesmen', color: 'bg-red-500 text-white' };
      default:
        return { label: 'Status Tidak Diketahui', color: 'bg-gray-100 text-gray-800' };
    }
  };
  
  if (selectedApplication) {
    return <ApplicationDetail application={selectedApplication} onBack={() => setSelectedApplication(null)} />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Memuat status aplikasi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Status Aplikasi Anda</h2>
      {applications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {applications.map(app => {
            let currentStatus = app.status;
            const interviewTime = app.schedules && app.schedules.length > 0 ? new Date(app.schedules[0].interview_time) : null;
            
            // Logika untuk mengubah status tampilan secara dinamis
            if (currentStatus === 'scheduled' && interviewTime && (new Date().getTime() > (interviewTime.getTime() + 60 * 60 * 1000))) {
              currentStatus = 'Interviewed';
            }

            const statusDisplay = getStatusDisplay(currentStatus);
            const formattedDate = interviewTime ? interviewTime.toLocaleDateString('en-US') : '';
            const formattedTime = interviewTime ? interviewTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div 
                key={app.id} 
                onClick={() => setSelectedApplication(app)}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 cursor-pointer hover:shadow-xl transition-shadow duration-300"
              >
                <h3 className="text-xl font-semibold text-gray-800">{app.jobs.title}</h3>
                <p className="text-sm text-gray-500 mt-1">Perusahaan: {app.jobs.company}</p>
                <div className="mt-4 flex items-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusDisplay.color}`}>
                    {statusDisplay.label}
                  </span>
                  {app.status === 'scheduled' && interviewTime && (
                    <span className="ml-4 text-sm text-gray-600">
                      Jadwal: {formattedDate}, {formattedTime} WIB
                    </span>
                  )}
                  {(app.status === 'Shortlisted' || app.status === 'Applied') && (
                     <span className="ml-4 text-sm text-teal-600 font-semibold">
                       Asesmen Tersedia
                     </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    Melamar pada: {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-500">Anda belum melamar pekerjaan apa pun.</p>
      )}
    </div>
  );
}