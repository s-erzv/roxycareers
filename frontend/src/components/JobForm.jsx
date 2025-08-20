// JobForm.jsx
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
    custom_fields: [],
    apply_deadline: '',
    recruitment_process_type: '',
    interview_details: null,
    assessment_details: null
  });

    useEffect(() => {
    if (jobToEdit) {
      //console.log("Data Job yang akan diedit:", jobToEdit);
      
      setFormData({
        title: jobToEdit.title ?? '',
        company: jobToEdit.company ?? '',
        location: jobToEdit.location ?? '',
        division: jobToEdit.division ?? '',
        type: jobToEdit.type ?? '',
        level: jobToEdit.level ?? '',
        description: jobToEdit.description ?? '',
        custom_fields: jobToEdit.custom_fields ?? [],
        apply_deadline: jobToEdit.apply_deadline ?? '',
        recruitment_process_type: jobToEdit.recruitment_process_type ?? '',
        // Untuk objek nested, pastikan objek tersebut ada sebelum diisi
        interview_details: jobToEdit.interview_details ?? null,
        assessment_details: jobToEdit.assessment_details ?? null,
      });
    } else {
      // Mereset form jika tidak ada job yang diedit (untuk kasus tambah baru)
      setFormData({
        title: '',
        company: '',
        location: '',
        division: '',
        type: '',
        level: '',
        description: '',
        custom_fields: [],
        apply_deadline: '',
        recruitment_process_type: '',
        interview_details: null,
        assessment_details: null,
      });
    }
  }, [jobToEdit]);

  // ... (kode lainnya tetap sama)

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (index, e) => {
    const { name, value, checked, type } = e.target;
    const newCustomFields = [...formData.custom_fields];
    
    // Perbarui logika ini untuk menangani checkbox
    if (type === 'checkbox') {
      newCustomFields[index][name] = checked;
    } else {
      newCustomFields[index][name] = value;
    }
    
    setFormData(prev => ({ ...prev, custom_fields: newCustomFields }));
  };

  const handleProcessTypeChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      recruitment_process_type: value,
      interview_details: value === 'interview' ? { contact_person: '', start_time: '', end_time: '', link: '' } : null,
      assessment_details: value === 'assessment' ? { type: '', link: '', deadline: '' } : null
    }));
  };

  const handleDetailChange = (e, type) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [type]: prev[type] ? { ...prev[type], [name]: value } : { [name]: value }
    }));
  };
  
  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { label: '', type: 'text', required: false, criteria: '' }]
    }));
  };

  const removeCustomField = (index) => {
    const newCustomFields = formData.custom_fields.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, custom_fields: newCustomFields }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let error = null;
    let result = null;

    if (jobToEdit) {
      const { data, error: updateError } = await supabase
        .from('jobs')
        .update(formData)
        .eq('id', jobToEdit.id)
        .select();
      error = updateError;
      result = data;
    } else {
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
        
        <div className="space-y-4 border border-gray-200 p-4 rounded-lg">
          <h4 className="font-semibold text-lg">Kriteria Auto-Screening</h4>
          {formData.custom_fields.map((field, index) => (
            <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-2 bg-gray-50 rounded-lg">
              <input
                type="text"
                name="label"
                value={field.label}
                onChange={(e) => handleCustomFieldChange(index, e)}
                placeholder="Nama Kriteria (contoh: IPK)"
                className="w-full sm:w-1/3 p-2 border rounded-lg"
              />
              <select
                name="type"
                value={field.type}
                onChange={(e) => handleCustomFieldChange(index, e)}
                className="w-full sm:w-1/6 p-2 border rounded-lg"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
              </select>
              
              {field.type === 'boolean' ? (
                <div className="flex items-center space-x-2">
                  <label>
                    <input
                      type="checkbox"
                      name="criteria"
                      checked={field.criteria === 'true'}
                      onChange={(e) => handleCustomFieldChange(index, { target: { name: 'criteria', value: e.target.checked ? 'true' : 'false' } })}
                      className="form-checkbox"
                    />
                    <span className="ml-2 text-gray-700">Wajib Bernilai 'True'</span>
                  </label>
                </div>
              ) : (
                <input
                  type="text"
                  name="criteria"
                  value={field.criteria}
                  onChange={(e) => handleCustomFieldChange(index, e)}
                  placeholder="Kriteria (contoh: > 3.0)"
                  className="w-full sm:w-1/3 p-2 border rounded-lg"
                />
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="required"
                  checked={field.required}
                  onChange={(e) => handleCustomFieldChange(index, { target: { name: 'required', value: e.target.checked } })}
                />
                <span className="text-gray-700 text-sm">Wajib Diisi</span>
              </div>
              <button
                type="button"
                onClick={() => removeCustomField(index)}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                Hapus
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCustomField}
            className="w-full py-2 px-4 border border-dashed border-gray-400 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            + Tambah Kriteria
          </button>
        </div>
        
        <div className="space-y-4 border border-gray-200 p-4 rounded-lg">
          <h4 className="font-semibold text-lg">Alur Rekrutmen</h4>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Batas Waktu Lamaran</label>
            <input
              type="datetime-local"
              name="apply_deadline"
              value={formData.apply_deadline}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Tipe Proses Selanjutnya</label>
            <select
              name="recruitment_process_type"
              value={formData.recruitment_process_type}
              onChange={handleProcessTypeChange}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="">Tidak ada asesmen/interview</option>
              <option value="assessment">Ada Asesmen</option>
              <option value="interview">Ada Interview</option>
            </select>
          </div>
          
          {formData.recruitment_process_type === 'interview' && (
            <div className="space-y-4 p-2 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-md">Detail Interview</h5>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Nama Kontak Person</label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.interview_details?.contact_person || ''}
                  onChange={(e) => handleDetailChange(e, 'interview_details')}
                  placeholder="Nama kontak yang dapat dihubungi"
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Link Meeting</label>
                <input
                  type="url"
                  name="link"
                  value={formData.interview_details?.link || ''}
                  onChange={(e) => handleDetailChange(e, 'interview_details')}
                  placeholder="URL link meeting"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Waktu Tersedia (Mulai)</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.interview_details?.start_time || ''}
                  onChange={(e) => handleDetailChange(e, 'interview_details')}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Waktu Tersedia (Selesai)</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.interview_details?.end_time || ''}
                  onChange={(e) => handleDetailChange(e, 'interview_details')}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
            </div>
          )}

          {formData.recruitment_process_type === 'assessment' && (
            <div className="space-y-4 p-2 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-md">Detail Asesmen</h5>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Jenis Asesmen</label>
                <select
                  name="type"
                  value={formData.assessment_details?.type || ''}
                  onChange={(e) => handleDetailChange(e, 'assessment_details')}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="">Pilih Jenis Asesmen</option>
                  <option value="Psikometrik">Tes Psikometrik</option>
                  <option value="Kuis Teknis">Kuis Teknis</option>
                  <option value="Studi Kasus">Studi Kasus</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Link Asesmen</label>
                <input
                  type="url"
                  name="link"
                  value={formData.assessment_details?.link || ''}
                  onChange={(e) => handleDetailChange(e, 'assessment_details')}
                  placeholder="URL ke tes online"
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Batas Waktu (Deadline)</label>
                <input
                  type="datetime-local"
                  name="deadline"
                  value={formData.assessment_details?.deadline || ''}
                  onChange={(e) => handleDetailChange(e, 'assessment_details')}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
            </div>
          )}
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
            {loading ? 'Memproses...' : (jobToEdit ? 'Perbarui Lowongan' : 'Tambah Lowongan')}
          </button>
        </div>
      </form>
    </div>
  );
}