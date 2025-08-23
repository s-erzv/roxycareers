// frontend/src/components/QuestionForm.jsx
import React, { useState } from 'react';

export default function QuestionForm({ jobId, onQuestionAdded }) {
  const [question, setQuestion] = useState({
    text: '',
    question_type: 'ESSAY',
    options: []
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setQuestion(prev => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index, e) => {
    const newOptions = [...question.options];
    newOptions[index] = e.target.value;
    setQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setQuestion(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Pastikan URL dan endpoint sesuai dengan konfigurasi backend Anda
      const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/questions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question)
      });
      if (!response.ok) throw new Error('Failed to add question');
      
      alert('Pertanyaan berhasil ditambahkan!');
      setQuestion({ text: '', question_type: 'ESSAY', options: [] });
      onQuestionAdded(); // Panggil fungsi refresh
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-4">
      <h4 className="text-xl font-semibold mb-4">Tambah Pertanyaan Asesmen</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Jenis Pertanyaan</label>
          <select name="question_type" value={question.question_type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            <option value="ESSAY">Essay</option>
            <option value="SINGLE_CHOICE">Single Choice</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Teks Pertanyaan</label>
          <textarea name="text" value={question.text} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></textarea>
        </div>
        {(question.question_type === 'SINGLE_CHOICE') && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Opsi Jawaban</label>
            {question.options.map((option, index) => (
              <input key={index} type="text" value={option} onChange={(e) => handleOptionChange(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder={`Opsi ${index + 1}`} required />
            ))}
            <button type="button" onClick={addOption} className="mt-2 px-3 py-1 text-sm bg-gray-200 rounded-md">Tambah Opsi</button>
          </div>
        )}
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md">Simpan Pertanyaan</button>
      </form>
    </div>
  );
}