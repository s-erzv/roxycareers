// JobForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

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
        interview_details: jobToEdit.interview_details ?? null,
        assessment_details: jobToEdit.assessment_details ?? null,
      });
    } else {
      // Mereset form dan menambahkan custom field untuk kategori resume secara default
      setFormData({
        title: '',
        company: '',
        location: '',
        division: '',
        type: '',
        level: '',
        description: '',
        // Tambahkan custom field 'resume_category' secara otomatis saat form dibuat
        custom_fields: [{
          label: 'resume_category',
          type: 'text',
          criteria: '',
          required: false,
          is_auto: true // Flag untuk menandai field otomatis
        }],
        apply_deadline: '',
        recruitment_process_type: '',
        interview_details: null,
        assessment_details: null
      });
    }
  }, [jobToEdit]);

  // Tambahkan fungsi ini untuk menangani perubahan pada custom fields
  const handleCustomFieldChange = (index, event) => {
    const newFields = [...formData.custom_fields];
    newFields[index][event.target.name] = event.target.value;
    setFormData({ ...formData, custom_fields: newFields });
  };
  
  // Fungsi untuk menangani penambahan custom field baru
  const handleAddCustomField = () => {
    setFormData({
      ...formData,
      custom_fields: [
        ...formData.custom_fields,
        { label: '', type: 'text', criteria: '', required: false, is_auto: false }
      ],
    });
  };
  
  // Fungsi untuk menghapus custom field
  const handleRemoveCustomField = (index) => {
    const newFields = formData.custom_fields.filter((_, i) => i !== index);
    setFormData({ ...formData, custom_fields: newFields });
  };
  
  const handleDetailChange = (e, detailType) => {
    setFormData({
      ...formData,
      [detailType]: {
        ...formData[detailType],
        [e.target.name]: e.target.value,
      },
    });
  };

  const handleCheckboxChange = (index) => {
    const newFields = [...formData.custom_fields];
    newFields[index].required = !newFields[index].required;
    setFormData({ ...formData, custom_fields: newFields });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { custom_fields, ...restOfData } = formData;
    
    // Saring custom fields, hanya simpan yang tidak otomatis jika kriterianya kosong
    const filteredCustomFields = custom_fields.filter(field =>
      !field.is_auto || (field.is_auto && field.criteria.trim() !== '')
    );
    
    // Hapus is_auto flag sebelum dikirim
    const finalCustomFields = filteredCustomFields.map(({ is_auto, ...field }) => field);

    const dataToSave = {
      ...restOfData,
      custom_fields: finalCustomFields,
    };
    
    //console.log("Data yang akan disimpan:", dataToSave);

    try {
      if (jobToEdit) {
        await supabase.from('jobs').update(dataToSave).eq('id', jobToEdit.id);
      } else {
        await supabase.from('jobs').insert([dataToSave]);
      }
      onJobAdded();
    } catch (error) {
      console.error('Error saat menyimpan lowongan:', error);
      alert('Gagal menyimpan lowongan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl overflow-y-auto max-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {jobToEdit ? 'Edit Lowongan' : 'Tambah Lowongan Baru'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Judul Pekerjaan</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Perusahaan</label>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Lokasi</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Divisi</label>
          <input
            type="text"
            name="division"
            value={formData.division}
            onChange={(e) => setFormData({ ...formData, division: e.target.value })}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Jenis Pekerjaan</label>
          <select
            name="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full p-2 border rounded-lg"
            required
          >
            <option value="">Pilih Jenis</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
            <option value="Freelance">Freelance</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Level Jabatan</label>
          <select
            name="level"
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
            className="w-full p-2 border rounded-lg"
            required
          >
            <option value="">Pilih Level</option>
            <option value="Entry-Level">Entry-Level</option>
            <option value="Junior">Junior</option>
            <option value="Mid-Level">Mid-Level</option>
            <option value="Senior">Senior</option>
            <option value="Manager">Manager</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Deskripsi</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-2 border rounded-lg h-32"
            required
          ></textarea>
        </div>
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Batas Waktu Lamaran</label>
          <input
            type="datetime-local"
            name="apply_deadline"
            value={formData.apply_deadline}
            onChange={(e) => setFormData({ ...formData, apply_deadline: e.target.value })}
            className="w-full p-2 border rounded-lg"
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Kriteria Screening Tambahan</h4>
          {formData.custom_fields.map((field, index) => (
            <div key={index} className="flex items-center space-x-4 mb-4 p-4 border rounded-lg bg-white">
              <div className="flex-grow">
                <label className="block text-gray-700 text-xs font-bold mb-1">Label Kriteria</label>
                <input
                  type="text"
                  name="label"
                  value={field.label}
                  onChange={(e) => handleCustomFieldChange(index, e)}
                  placeholder="Misal: education_level"
                  className={`w-full p-2 border rounded-lg ${field.is_auto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                  disabled={field.is_auto} // Disable input for auto fields
                />
              </div>
              <div className="flex-grow">
                <label className="block text-gray-700 text-xs font-bold mb-1">Tipe</label>
                <select
                  name="type"
                  value={field.type}
                  onChange={(e) => handleCustomFieldChange(index, e)}
                  className={`w-full p-2 border rounded-lg ${field.is_auto ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  required
                  disabled={field.is_auto}
                >
                  <option value="text">Teks</option>
                  <option value="number">Angka</option>
                  <option value="boolean">Boolean</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>
              <div className="flex-grow-2">
                <label className="block text-gray-700 text-xs font-bold mb-1">Kriteria</label>
                <input
                  type="text"
                  name="criteria"
                  value={field.criteria}
                  onChange={(e) => handleCustomFieldChange(index, e)}
                  placeholder="Contoh: 'S1, S2' (Teks), '>=3' (Angka)"
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              {field.type === 'dropdown' && (
                <div className="flex-grow-2">
                  <label className="block text-gray-700 text-xs font-bold mb-1">Opsi Dropdown</label>
                  <input
                    type="text"
                    name="options"
                    value={field.options || ''}
                    onChange={(e) => handleCustomFieldChange(index, e)}
                    placeholder="Contoh: 'Pria, Wanita'"
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="required"
                  checked={field.required}
                  onChange={() => handleCheckboxChange(index)}
                  className={`mr-2 h-4 w-4 text-teal-600 rounded ${field.is_auto ? 'cursor-not-allowed' : ''}`}
                  disabled={field.is_auto}
                />
                <label className="text-gray-700 text-sm">Wajib</label>
              </div>
              {!field.is_auto && (
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(index)}
                  className="p-2 text-red-500 hover:text-red-700 transition-colors duration-200"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddCustomField}
            className="mt-2 bg-gray-200 text-gray-800 py-2 px-4 rounded-full hover:bg-gray-300 transition-colors duration-200"
          >
            + Tambah Kriteria
          </button>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">Tipe Proses Rekrutmen</label>
          <select
            name="recruitment_process_type"
            value={formData.recruitment_process_type}
            onChange={(e) => setFormData({ ...formData, recruitment_process_type: e.target.value })}
            className="w-full p-2 border rounded-lg"
          >
            <option value="">Pilih Tipe</option>
            <option value="online_assessment">Tes Online</option>
            <option value="interview_scheduling">Penjadwalan Wawancara</option>
          </select>
        </div>

        {formData.recruitment_process_type === 'interview_scheduling' && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-bold mb-4">Detail Wawancara</h4>
            <div>
              <label className="block text-gray-700 text-sm mb-2">Nama Kontak</label>
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
          </div>
        )}

        {formData.recruitment_process_type === 'online_assessment' && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-bold mb-4">Detail Penilaian Online</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm mb-2">URL Tes Online</label>
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
          </div>
        )}

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