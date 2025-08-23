// frontend/src/components/AssessmentPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AssessmentPage({ applicant, onBack }) {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                // Endpoint baru untuk mengambil pertanyaan dari job
                const response = await axios.get(`http://localhost:8000/api/jobs/${applicant.jobs.id}/assessment-questions/`);
                setQuestions(response.data);
            } catch (error) {
                console.error("Failed to fetch questions:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [applicant.jobs.id]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const renderQuestionInput = (question) => {
      switch (question.question_type) {
        case 'ESSAY':
        case 'TEXT_INPUT':
          return <textarea value={answers[question.id] || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} className="w-full p-2 border rounded-md" required />;
        case 'INTEGER_INPUT':
          return <input type="number" value={answers[question.id] || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} className="w-full p-2 border rounded-md" required />;
        case 'SINGLE_CHOICE':
          return (
            <div className="space-y-2">
                {question.options.map((option, index) => (
                    <div key={index} className="flex items-center">
                        <input type="radio" name={`question-${question.id}`} value={option} checked={answers[question.id] === option} onChange={(e) => handleAnswerChange(question.id, e.target.value)} className="mr-2"/>
                        <label>{option}</label>
                    </div>
                ))}
            </div>
          );
        // Tambahkan case lain untuk jenis pertanyaan lainnya
        case 'FILE_UPLOAD':
            return <input type="file" onChange={(e) => handleAnswerChange(question.id, e.target.files[0])} />;
        // Tambahkan case untuk CODING_CHALLENGE
        case 'CODING_CHALLENGE':
            return <textarea placeholder="Tuliskan kode Anda di sini..." value={answers[question.id] || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} className="w-full h-40 p-2 border rounded-md font-mono" required />;
        default:
            return null;
      }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const formattedAnswers = questions.map(q => ({
            question_id: q.id,
            answer: answers[q.id] || ''
        }));

        try {
            const response = await axios.post(`http://localhost:8000/api/applicants/${applicant.id}/submit_assessment/`, { answers: formattedAnswers });
            if (response.status !== 201) throw new Error('Failed to submit assessment');
            
            alert('Asesmen berhasil disubmit!');
            onBack();
        } catch (error) {
            alert('Gagal submit asesmen: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p>Memuat pertanyaan...</p>;
    if (questions.length === 0) return <p>Tidak ada asesmen untuk lowongan ini.</p>;

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali
            </button>
            <h2 className="text-2xl font-bold mb-4">Asesmen untuk {applicant.jobs.title}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {questions.map((q) => (
                    <div key={q.id} className="bg-gray-100 p-4 rounded-lg">
                        <label className="block font-semibold mb-2">{q.text}</label>
                        {renderQuestionInput(q)}
                    </div>
                ))}
                <button type="submit" disabled={submitting} className="px-6 py-3 bg-green-500 text-white font-semibold rounded-full hover:bg-green-600">
                    {submitting ? 'Menyimpan...' : 'Submit Asesmen'}
                </button>
            </form>
        </div>
    );
}