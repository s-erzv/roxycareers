import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf'; 

export default function InterviewSchedulePage() {
  const location = useLocation();
  const jobId = location.state?.jobId;

  const [schedulesByDate, setSchedulesByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('applicants')
        .select(`
          id,
          name,
          email,
          custom_answers,
          jobs (
            title,
            company
          ),
          schedules (
            interview_time
          )
        `)
        .eq('status', 'scheduled');

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data: applicants, error: applicantsError } = await query;

      if (applicantsError) {
        throw applicantsError;
      }

      const sortedApplicants = applicants.sort((a, b) => {
        const timeA = a.schedules.length > 0 ? new Date(a.schedules[0].interview_time) : null;
        const timeB = b.schedules.length > 0 ? new Date(b.schedules[0].interview_time) : null;
        if (timeA && timeB) {
          return timeA - timeB;
        }
        return 0;
      });

      const groupedByDate = sortedApplicants.reduce((acc, applicant) => {
        const interviewTime = applicant.schedules.length > 0 ? new Date(applicant.schedules[0].interview_time) : null;
        if (interviewTime) {
          const dateString = interviewTime.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
          if (!acc[dateString]) {
            acc[dateString] = [];
          }
          acc[dateString].push(applicant);
        }
        return acc;
      }, {});
      
      setSchedulesByDate(groupedByDate);
      
    } catch (e) {
      console.error('Error fetching schedules:', e);
      setError('Gagal memuat jadwal wawancara: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [jobId]);

  const generatePdf = () => {
    const doc = new jsPDF();
    let yOffset = 20;

    doc.setFontSize(18);
    doc.text('Jadwal Wawancara', 10, yOffset);
    yOffset += 10;

    if (jobId) {
      const jobTitle = schedulesByDate[Object.keys(schedulesByDate)[0]]?.[0]?.jobs?.title;
      doc.setFontSize(14);
      doc.text(`Untuk Posisi: ${jobTitle || 'Lowongan'}`, 10, yOffset);
      yOffset += 10;
    }

    doc.setFontSize(12);
    
    Object.keys(schedulesByDate).forEach(dateString => {
      yOffset += 10;
      doc.setFontSize(14);
      doc.text(`Tanggal: ${dateString}`, 10, yOffset);
      yOffset += 5;

      schedulesByDate[dateString].forEach(applicant => {
        yOffset += 10;
        const interviewTime = applicant.schedules.length > 0 ? new Date(applicant.schedules[0].interview_time) : null;
        const formattedTime = interviewTime ? interviewTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
        
        // Ekstrak nomor telepon dari custom_answers
        const phoneNumber = applicant.custom_answers?.['phone_number'] || '-'; // Perbaikan di sini

        doc.setFontSize(12);
        doc.text(`Waktu: ${formattedTime} WIB`, 15, yOffset);
        yOffset += 5;
        doc.text(`Nama: ${applicant.name}`, 15, yOffset);
        yOffset += 5;
        doc.text(`Email: ${applicant.email}`, 15, yOffset);
        yOffset += 5;
        doc.text(`Nomor Telepon: ${phoneNumber}`, 15, yOffset);
        yOffset += 5;
        doc.text(`Posisi: ${applicant.jobs.title} di ${applicant.jobs.company}`, 15, yOffset);
        yOffset += 5;

        if (yOffset > 280) {
          doc.addPage();
          yOffset = 20;
        }
      });
    });

    doc.save('Jadwal-Wawancara.pdf');
  };

  if (loading) {
    return <div className="p-8 text-center">Memuat jadwal wawancara...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500 text-center">{error}</div>;
  }
  
  const jobTitle = schedulesByDate[Object.keys(schedulesByDate)[0]]?.[0]?.jobs?.title;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">
          Jadwal Wawancara {jobId ? `untuk ${jobTitle || 'Lowongan'}` : 'Keseluruhan'}
        </h2>
        {Object.keys(schedulesByDate).length > 0 && (
          <button
            onClick={generatePdf}
            className="px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 
              bg-red-500 text-white hover:bg-red-600"
          >
            Ekspor ke PDF
          </button>
        )}
      </div>
      {Object.keys(schedulesByDate).length > 0 ? (
        Object.keys(schedulesByDate).map(dateString => (
          <div key={dateString} className="mb-8 p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold text-teal-700 mb-4">{dateString}</h3>
            <div className="space-y-4">
              {schedulesByDate[dateString].map(applicant => {
                const interviewTime = applicant.schedules.length > 0 ? new Date(applicant.schedules[0].interview_time) : null;
                const phoneNumber = applicant.custom_answers?.['phone_number'] || '-'; // Perbaikan di sini
                return (
                  <div key={applicant.id} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                    <p className="font-medium text-gray-800">
                      Waktu: <strong>{interviewTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</strong>
                    </p>
                    <p className="text-sm text-gray-600">Nama Pelamar: {applicant.name}</p>
                    <p className="text-sm text-gray-600">Email: {applicant.email}</p>
                    <p className="text-sm text-gray-600">Nomor Telepon: {phoneNumber}</p>
                    <p className="text-sm text-gray-600">Posisi: {applicant.jobs.title} di {applicant.jobs.company}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500">Tidak ada jadwal wawancara yang ditemukan.</p>
      )}
    </div>
  );
}