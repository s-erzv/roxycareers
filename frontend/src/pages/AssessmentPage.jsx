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

        console.log('Fetching questions for job ID:', jobId);

        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/jobs/${jobId}/assessment-questions/`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        console.log('Response data:', response.data);
        
        if (response.data.questions && Array.isArray(response.data.questions)) {
          setQuestions(response.data.questions);
          console.log('Questions set:', response.data.questions);
        } else {
          setQuestions([]);
          console.warn('No questions found or invalid format');
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

  const handleChange = (questionId, value, questionType) => {
    if (questionType === 'MULTIPLE_CHOICE') {
      // For multiple choice, handle array of selected values
      const currentAnswers = answers[questionId] || [];
      let newAnswers;
      if (currentAnswers.includes(value)) {
        newAnswers = currentAnswers.filter(answer => answer !== value);
      } else {
        newAnswers = [...currentAnswers, value];
      }
      setAnswers(prevAnswers => ({
        ...prevAnswers,
        [questionId]: newAnswers,
      }));
    } else {
      setAnswers(prevAnswers => ({
        ...prevAnswers,
        [questionId]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Convert answers format to match backend expectations
    const formattedAnswers = {};
    Object.keys(answers).forEach(questionId => {
      const question = questions.find(q => q.id === questionId);
      if (question && question.question_type === 'MULTIPLE_CHOICE') {
        // Convert array to JSON string for multiple choice
        formattedAnswers[questionId] = JSON.stringify(answers[questionId] || []);
      } else {
        formattedAnswers[questionId] = answers[questionId];
      }
    });

    const submissionData = {
      answers: formattedAnswers
    };

    try {
      // Fix the URL to match your backend route
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/applicants/${applicant.id}/submit-assessment/`, submissionData, {
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

  const renderQuestionInput = (question, index) => {
    const questionId = question.id;
    const questionType = question.question_type;
    
    switch (questionType) {
      case 'SINGLE_CHOICE':
        return (
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`question_${questionId}`}
                  value={option}
                  checked={answers[questionId] === option}
                  onChange={(e) => handleChange(questionId, e.target.value, questionType)}
                  className="text-teal-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  value={option}
                  checked={(answers[questionId] || []).includes(option)}
                  onChange={(e) => handleChange(questionId, e.target.value, questionType)}
                  className="text-teal-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'INTEGER_INPUT':
        return (
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Masukkan angka..."
            value={answers[questionId] || ''}
            onChange={(e) => handleChange(questionId, e.target.value, questionType)}
            required
          />
        );
      
      case 'TEXT_INPUT':
        return (
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Masukkan jawaban Anda..."
            value={answers[questionId] || ''}
            onChange={(e) => handleChange(questionId, e.target.value, questionType)}
            required
          />
        );
      
      case 'FILE_UPLOAD':
        return (
          <input
            type="file"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onChange={(e) => {
              // Handle file upload - you might want to upload to Supabase storage here
              const file = e.target.files[0];
              if (file) {
                handleChange(questionId, file.name, questionType); // For now, just store filename
              }
            }}
          />
        );
      
      case 'ESSAY':
      case 'CODING_CHALLENGE':
      default:
        return (
          <textarea
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tulis jawaban Anda di sini..."
            value={answers[questionId] || ''}
            onChange={(e) => handleChange(questionId, e.target.value, questionType)}
            required
          />
        );
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
              <p className="text-lg font-semibold mb-4">
                {index + 1}. {q.text} {/* FIXED: Changed from q.question_text to q.text */}
              </p>
              <div className="mb-2 text-sm text-gray-600">
                Jenis: {q.question_type}
              </div>
              {renderQuestionInput(q, index)}
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