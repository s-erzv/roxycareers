import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AssessmentForm({ applicant, onClose, onScheduleComplete }) {
  const [loading, setLoading] = useState(false);
  const [assessmentData, setAssessmentData] = useState({
    type: '',
    link: '',
    deadline: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAssessmentData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('applicants')
        .update({
          status: 'Scheduled for Assessment',
          assessment_details: assessmentData,
          assessment_status: 'Pending'
        })
        .eq('id', applicant.id);

      if (error) throw error;

      alert('Asesmen berhasil dijadwalkan dan status pelamar diperbarui.');
      onScheduleComplete();
      onClose();
    } catch (error) {
      alert('Gagal menjadwalkan asesmen: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-xl w-full mx-auto">
      <h3 className="text-2xl font-bold mb-6 text-gray-900">Jadwalkan Asesmen untuk {applicant.name}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Jenis Asesmen</label>
          <select 
            name="type" 
            value={assessmentData.type} 
            onChange={handleChange} 
            className="w-full p-3 border border-gray-300 rounded-lg"
            required
          >
            <option value="">Pilih Jenis Asesmen</option>
            <option value="Psikometrik">Tes Psikometrik</option>
            <option value="Kuis Teknis">Kuis Teknis</option>
            <option value="Studi Kasus">Studi Kasus</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Link Asesmen</label>
          <input type="url" name="link" value={assessmentData.link} onChange={handleChange} placeholder="URL ke tes online" className="w-full p-3 border border-gray-300 rounded-lg" required />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Batas Waktu</label>
          <input type="datetime-local" name="deadline" value={assessmentData.deadline} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" required />
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
            {loading ? 'Menjadwalkan...' : 'Buat Jadwal Asesmen'}
          </button>
        </div>
      </form>
    </div>
  );
}
