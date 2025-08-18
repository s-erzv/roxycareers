import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function JobForm({ onClose, onJobAdded, jobToEdit }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    division: '',
    type: '',
    level: '',
    description: '',
    custom_fields: []
  });

  useEffect(() => {
    if (jobToEdit) {
      setFormData({
        title: jobToEdit.title,
        company: jobToEdit.company,
        location: jobToEdit.location,
        division: jobToEdit.division,
        type: jobToEdit.type,
        level: jobToEdit.level,
        description: jobToEdit.description,
        custom_fields: jobToEdit.custom_fields || []
      });
    }
  }, [jobToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let error = null;
    let result = null;

    if (jobToEdit) {
      // Logic untuk UPDATE
      const { data, error: updateError } = await supabase
        .from('jobs')
        .update(formData)
        .eq('id', jobToEdit.id)
        .select();
      error = updateError;
      result = data;
    } else {
      // Logic untuk INSERT
      const { data, error: insertError } = await supabase
        .from('jobs')
        .insert([formData])
        .select();
      error = insertError;
      result = data;
    }

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert(`Lowongan berhasil ${jobToEdit ? 'diperbarui' : 'ditambahkan'}!`);
      onJobAdded(result[0]);
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full mx-auto">
      <h3 className="text-2xl font-bold mb-6 text-gray-900">{jobToEdit ? 'Edit Lowongan' : 'Tambah Lowongan Baru'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Judul Pekerjaan" className="w-full p-3 border border-gray-300 rounded-lg" required />
        <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Perusahaan" className="w-full p-3 border border-gray-300 rounded-lg" required />
        <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Lokasi" className="w-full p-3 border border-gray-300 rounded-lg" required />
        <input type="text" name="division" value={formData.division} onChange={handleChange} placeholder="Divisi" className="w-full p-3 border border-gray-300 rounded-lg" required />
        <input type="text" name="type" value={formData.type} onChange={handleChange} placeholder="Jenis Pekerjaan" className="w-full p-3 border border-gray-300 rounded-lg" required />
        <input type="text" name="level" value={formData.level} onChange={handleChange} placeholder="Level Jabatan" className="w-full p-3 border border-gray-300 rounded-lg" required />
        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Deskripsi Pekerjaan" rows="4" className="w-full p-3 border border-gray-300 rounded-lg" required />
        
        <div className="flex justify-end space-x-4">
          <button type="button" onClick={onClose} className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-full hover:bg-gray-400 transition-colors duration-200">
            Batal
          </button>
          <button
            type="submit"
            className="bg-teal-500 text-white font-bold py-2 px-4 rounded-full hover:bg-teal-600 transition-colors duration-200"
            disabled={loading}
          >
            {loading ? 'Memproses...' : (jobToEdit ? 'Perbarui Lowongan' : 'Tambah Lowongan')}
          </button>
        </div>
      </form>
    </div>
  );
}
