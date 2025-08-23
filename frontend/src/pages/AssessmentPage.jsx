import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AssessmentPage = ({ applicant, onBack }) => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const jobId = applicant.jobs.id;
        if (!jobId) {
          throw new Error("Job ID is missing.");
        }

        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/jobs/${jobId}/assessment-questions/`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (response.data.questions && Array.isArray(response.data.questions)) {
          setQuestions(response.data.questions);
        } else {
          setQuestions([]);
        }

        const duration = response.data.duration;
        if (typeof duration === 'number' && !isNaN(duration)) {
          setTimeRemaining(duration * 60);
        } else {
          setTimeRemaining(0);
          console.warn("Invalid duration received from API.");
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
        setError("Failed to load assessment questions. Please try again later.");
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [applicant, session]);

  useEffect(() => {
    if (timeRemaining === null || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeRemaining(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleSubmit(); 
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isSubmitting]);

  const handleChange = (questionId, value) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: value,
    }));
  };

  const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const submissionData = {
        applicant_id: applicant.id,
        job_id: applicant.jobs.id,
        answers: answers
        };

        try {
        // Pastikan URL-nya benar
        await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/applicants/submit-assessment/`, submissionData, {
            headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
            }
        });
        alert('Jawaban berhasil dikirim!');
        onBack();
        } catch (err) {
        console.error("Failed to submit assessment:", err);
        setError("Failed to submit your answers. Please check your connection and try again.");
        setIsSubmitting(false);
        }
    };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Memuat soal asesmen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-100 rounded-lg">
        <p>{error}</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Kembali ke Dashboard</button>
      </div>
    );
  }

  const formatTime = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      return '00:00';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Asesmen untuk {applicant.jobs.title}</h2>
        <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-mono">
          Sisa Waktu: {formatTime(timeRemaining)}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {questions && questions.length > 0 ? (
          questions.map((q, index) => (
            <div key={q.id} className="bg-white p-6 rounded-lg shadow">
              <p className="text-lg font-semibold mb-2">
                {index + 1}. {q.question_text}
              </p>
              <textarea
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tulis jawaban Anda di sini..."
                value={answers[q.id] || ''}
                onChange={(e) => handleChange(q.id, e.target.value)}
                required
              />
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">Tidak ada soal asesmen yang tersedia.</p>
        )}
        <div className="flex justify-end mt-8">
          <button
            type="submit"
            className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors duration-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Jawaban'}
          </button>
        </div>
      </form>
      <button onClick={onBack} className="mt-4 text-gray-600 hover:underline">
        Kembali ke Dashboard
      </button>
    </div>
  );
};

export default AssessmentPage;