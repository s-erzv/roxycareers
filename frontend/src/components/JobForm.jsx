import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

export default function JobForm({ onClose, onJobAdded, jobToEdit }) {
  const [loading, setLoading] = useState(false);
  const [schedulingStatus, setSchedulingStatus] = useState(null);

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
    assessment_details: null,
    // Menambahkan state baru untuk parameter penjadwalan
    schedule_start_date: '',
    schedule_end_date: '',
    daily_start_time: '',
    daily_end_time: '',
    duration_per_interview_minutes: 60,
  });

  const templateFields = [
    { label: 'name', type: 'text', criteria: '', required: true, is_default: true, is_auto: false },
    { label: 'email', type: 'text', criteria: '', required: true, is_default: true, is_auto: false },
    { label: 'phone_number', type: 'text', criteria: '', required: true, is_default: true, is_auto: false },
    { label: 'CV', type: 'file', criteria: '', required: true, is_default: true, is_auto: true },
    { label: 'resume_category', type: 'text', criteria: '', required: false, is_default: false, is_auto: true }
  ];

  useEffect(() => {
    if (jobToEdit) {
      const customFieldsOnly = jobToEdit.custom_fields.filter(field =>
        !templateFields.some(templateField => templateField.label === field.label)
      );

      setFormData({
        title: jobToEdit.title ?? '',
        company: jobToEdit.company ?? '',
        location: jobToEdit.location ?? '',
        division: jobToEdit.division ?? '',
        type: jobToEdit.type ?? '',
        level: jobToEdit.level ?? '',
        description: jobToEdit.description ?? '',
        custom_fields: customFieldsOnly,
        apply_deadline: jobToEdit.apply_deadline ?? '',
        recruitment_process_type: jobToEdit.recruitment_process_type ?? '',
        interview_details: jobToEdit.interview_details ?? null,
        assessment_details: jobToEdit.assessment_details ?? null,
        // Mengisi state penjadwalan dari data pekerjaan
        schedule_start_date: jobToEdit.schedule_start_date ?? '',
        schedule_end_date: jobToEdit.schedule_end_date ?? '',
        daily_start_time: jobToEdit.daily_start_time ?? '',
        daily_end_time: jobToEdit.daily_end_time ?? '',
        duration_per_interview_minutes: jobToEdit.duration_per_interview_minutes ?? 60,
      });
    } else {
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
        schedule_start_date: '',
        schedule_end_date: '',
        daily_start_time: '',
        daily_end_time: '',
        duration_per_interview_minutes: 60,
      });
    }
  }, [jobToEdit]);

  const handleCustomFieldChange = (index, event) => {
    const newFields = [...formData.custom_fields];
    newFields[index][event.target.name] = event.target.value;
    setFormData({ ...formData, custom_fields: newFields });
  };

  const handleAddCustomField = () => {
    setFormData({
      ...formData,
      custom_fields: [
        ...formData.custom_fields,
        { label: '', type: 'text', criteria: '', required: false, is_default: false, is_auto: false }
      ],
    });
  };

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
  
  const handleAutoScreenChange = (index) => {
    const newFields = [...formData.custom_fields];
    const isCurrentlyAuto = newFields[index].is_auto;
    newFields[index].is_auto = !isCurrentlyAuto;
    if (isCurrentlyAuto) {
      newFields[index].criteria = '';
    }
    setFormData({ ...formData, custom_fields: newFields });
  };

  const handleAutoSchedule = async (jobId) => {
    setSchedulingStatus('loading');
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/jobs/${jobId}/schedule/`);
      console.log("Scheduling response:", response.data);
      setSchedulingStatus('success');
    } catch (error) {
      console.error("Scheduling error:", error);
      setSchedulingStatus('error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSchedulingStatus(null); // Reset status sebelum memproses

    const { custom_fields, ...restOfData } = formData;
    const filteredCustomFields = custom_fields.filter(field =>
      !(field.is_auto && (!field.criteria || field.criteria.trim() === ''))
    );
    const allFields = [...templateFields, ...filteredCustomFields];

    const dataToSave = {
      ...restOfData,
      custom_fields: allFields,
    };

    try {
      let jobRecord;
      if (jobToEdit) {
        const { data, error } = await supabase.from('jobs').update(dataToSave).eq('id', jobToEdit.id).select();
        if (error) throw error;
        jobRecord = data[0];
      } else {
        const { data, error } = await supabase.from('jobs').insert([dataToSave]).select();
        if (error) throw error;
        jobRecord = data[0];
      }

      if (jobRecord && jobRecord.recruitment_process_type === 'interview_scheduling') {
        await handleAutoSchedule(jobRecord.id);
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
          <h4 className="text-lg font-bold text-gray-800 mb-4">Kriteria Screening</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <h5 className="text-md font-semibold text-gray-700 mb-3">Kriteria Tambahan</h5>
              {formData.custom_fields.length > 0 ? (
                formData.custom_fields.map((field, index) => (
                  <div key={index} className="flex flex-col space-y-2 mb-4 p-3 border rounded-lg bg-white">
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <label className="block text-gray-700 text-xs font-bold mb-1">Label</label>
                        <input
                          type="text"
                          name="label"
                          value={field.label}
                          onChange={(e) => handleCustomFieldChange(index, e)}
                          placeholder="Misal: education_level"
                          className="w-full p-2 border rounded-lg text-sm"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-gray-700 text-xs font-bold mb-1">Tipe</label>
                        <select
                          name="type"
                          value={field.type}
                          onChange={(e) => handleCustomFieldChange(index, e)}
                          className="w-full p-2 border rounded-lg text-sm"
                          required
                        >
                          <option value="text">Teks</option>
                          <option value="number">Angka</option>
                          <option value="boolean">Boolean</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="file">Upload File</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_auto"
                          checked={field.is_auto}
                          onChange={() => handleAutoScreenChange(index)}
                          className="mr-1 h-3 w-3 text-blue-600 rounded"
                        />
                        <label className="text-gray-700 text-xs font-semibold">Auto-Screening</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="required"
                          checked={field.required}
                          onChange={() => handleCheckboxChange(index)}
                          className="mr-1 h-3 w-3 text-teal-600 rounded"
                        />
                        <label className="text-gray-700 text-xs font-semibold">Wajib</label>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(index)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"
                      >
                        <FontAwesomeIcon icon={faTrash} size="sm" />
                      </button>
                    </div>

                    {field.is_auto && (
                      <div className="flex-grow-2">
                        <label className="block text-gray-700 text-xs font-bold mb-1">Kriteria</label>
                        <input
                          type="text"
                          name="criteria"
                          value={field.criteria}
                          onChange={(e) => handleCustomFieldChange(index, e)}
                          placeholder={
                            field.type === 'text' ? "Contoh: 'S1, S2'" :
                            field.type === 'number' ? "Contoh: '>=3', '1-5'" :
                            field.type === 'boolean' ? "Contoh: 'true', 'false'" :
                            field.type === 'file' ? "Contoh: 'max_size:5MB', 'required'" :
                            "Masukkan kriteria"
                          }
                          className="w-full p-2 border rounded-lg text-sm"
                          required={field.is_auto}
                        />
                      </div>
                    )}

                    {field.type === 'dropdown' && (
                      <div className="flex-grow-2">
                        <label className="block text-gray-700 text-xs font-bold mb-1">Opsi</label>
                        <input
                          type="text"
                          name="options"
                          value={field.options || ''}
                          onChange={(e) => handleCustomFieldChange(index, e)}
                          placeholder="Misal: 'Pria, Wanita'"
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                    )}
                    {field.type === 'file' && (
                      <div className="flex-grow-2">
                        <label className="block text-gray-700 text-xs font-bold mb-1">Format File</label>
                        <input
                          type="text"
                          name="file_types"
                          value={field.file_types || ''}
                          onChange={(e) => handleCustomFieldChange(index, e)}
                          placeholder="Misal: 'pdf, doc, docx'"
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm mb-4">Belum ada kriteria tambahan</p>
              )}
              <button
                type="button"
                onClick={handleAddCustomField}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors duration-200"
              >
                + Tambah Kriteria Baru
              </button>
            </div>

            <div>
              <h5 className="text-md font-semibold text-gray-700 mb-3">Kriteria Standar</h5>
              {templateFields.map((field, index) => (
                <div key={index} className="mb-4 p-3 border rounded-lg bg-white">
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <label className="block text-gray-700 text-xs font-bold mb-1">Label</label>
                        <div className="p-2 bg-gray-100 rounded border text-gray-700">
                          {field.label}
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-gray-700 text-xs font-bold mb-1">Tipe</label>
                        <div className="p-2 bg-gray-100 rounded border text-gray-700">
                          {field.type}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
            <div className="grid grid-cols-2 gap-4 mb-4">
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
            {/* Input baru untuk Penjadwalan Otomatis */}
            <h4 className="text-lg font-bold mb-2">Pengaturan Penjadwalan Otomatis</h4>
            <p className="text-gray-600 text-sm mb-4">Isi detail ini agar sistem bisa menjadwalkan semua kandidat shortlisted secara otomatis setelah Anda menyimpan lowongan ini.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm mb-2">Tanggal Mulai</label>
                <input
                  type="date"
                  name="schedule_start_date"
                  value={formData.schedule_start_date}
                  onChange={(e) => setFormData({ ...formData, schedule_start_date: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Tanggal Selesai</label>
                <input
                  type="date"
                  name="schedule_end_date"
                  value={formData.schedule_end_date}
                  onChange={(e) => setFormData({ ...formData, schedule_end_date: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Waktu Mulai Harian</label>
                <input
                  type="time"
                  name="daily_start_time"
                  value={formData.daily_start_time}
                  onChange={(e) => setFormData({ ...formData, daily_start_time: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2">Waktu Selesai Harian</label>
                <input
                  type="time"
                  name="daily_end_time"
                  value={formData.daily_end_time}
                  onChange={(e) => setFormData({ ...formData, daily_end_time: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm mb-2">Durasi Per Wawancara (menit)</label>
                <input
                  type="number"
                  name="duration_per_interview_minutes"
                  value={formData.duration_per_interview_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_per_interview_minutes: parseInt(e.target.value, 10) })}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
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

      {/* Menampilkan status penjadwalan di luar form */}
      <div className="mt-4">
        {schedulingStatus === 'loading' && <p className="text-blue-500">Sedang menjadwalkan...</p>}
        {schedulingStatus === 'success' && <p className="text-green-500">✅ Penjadwalan berhasil! Silakan periksa dashboard untuk melihat jadwal.</p>}
        {schedulingStatus === 'error' && <p className="text-red-500">❌ Gagal menjadwalkan. Silakan coba lagi.</p>}
      </div>
    </div>
  );
}