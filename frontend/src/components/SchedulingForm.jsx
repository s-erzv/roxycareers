import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function SchedulingForm({ applicant, onClose, onScheduleComplete }) {
  const [loading, setLoading] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    link: '',
    contact_person: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setScheduleData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('applicants')
        .update({ 
          status: 'Scheduled for Interview',
          interview_details: {
            date: scheduleData.date,
            time: scheduleData.time,
            link: scheduleData.link,
          },
          contact_person: scheduleData.contact_person,
        })
        .eq('id', applicant.id);
      
      if (error) throw error;

      alert('Jadwal interview berhasil dibuat dan status pelamar diperbarui.');
      onScheduleComplete(); // Callback untuk memperbarui tampilan
      onClose();
    } catch (error) {
      alert('Gagal menjadwalkan interview: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-xl w-full mx-auto">
      <h3 className="text-2xl font-bold mb-6 text-gray-900">Jadwal Interview untuk {applicant.name}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal</label>
          <input type="date" name="date" value={scheduleData.date} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Waktu</label>
          <input type="time" name="time" value={scheduleData.time} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Link Interview</label>
          <input type="url" name="link" value={scheduleData.link} onChange={handleChange} placeholder="Misal: meet.google.com/xyz-abc" className="w-full p-3 border border-gray-300 rounded-lg" required />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Nama Kontak Person</label>
          <input type="text" name="contact_person" value={scheduleData.contact_person} onChange={handleChange} placeholder="Nama kontak yang dapat dihubungi" className="w-full p-3 border border-gray-300 rounded-lg" required />
        </div>
        
        <div className="flex justify-end space-x-4">
          <button type="button" onClick={onClose} className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-full hover:bg-gray-400 transition-colors duration-200">
            Batal
          </button>
          <button
            type="submit"
            className="bg-teal-500 text-white font-bold py-2 px-4 rounded-full hover:bg-teal-600 transition-colors duration-200"
            disabled={loading}
          >
            {loading ? 'Membuat Jadwal...' : 'Buat Jadwal'}
          </button>
        </div>
      </form>
    </div>
  );
}
