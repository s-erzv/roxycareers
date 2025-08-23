import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const ManualAssessmentReviewPage = ({ applicantId, onBack }) => {
  const { session } = useAuth();
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manualScores, setManualScores] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/applicants/${applicantId}/review_assessment/`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );
        setReviewData(response.data);
        const initialScores = response.data.answers_to_review.reduce((acc, curr) => {
          acc[curr.question_id] = '';
          return acc;
        }, {});
        setManualScores(initialScores);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch review data:", err);
        setError("Gagal memuat data review. Silakan coba lagi.");
        setLoading(false);
      }
    };

    fetchReviewData();
  }, [applicantId, session]);

  const handleScoreChange = (questionId, score) => {
    setManualScores((prevScores) => ({
      ...prevScores,
      [questionId]: parseInt(score) || '',
    }));
  };

  const handleSubmitScores = async () => {
    try {
      setIsSubmitting(true);
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/applicants/${applicantId}/review_assessment/`,
        { scores: manualScores },
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      alert('Penilaian berhasil dikirim!');
      onBack();
    } catch (err) {
      console.error("Failed to submit scores:", err);
      setError("Gagal mengirim penilaian. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Memuat halaman review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-100 rounded-lg">
        <p>{error}</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Review Asesmen: {reviewData.applicant_name}</h2>
        <button onClick={onBack} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">
          Kembali
        </button>
      </div>
      
      {reviewData.auto_graded_scores.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-xl font-semibold mb-4">Skor Otomatis</h3>
          {reviewData.auto_graded_scores.map((score, index) => (
            <div key={index} className="mb-2">
              <p className="text-gray-700">{score.question_text}</p>
              <p className="text-sm font-semibold text-green-600">Skor: {score.score}</p>
            </div>
          ))}
        </div>
      )}

      {reviewData.answers_to_review.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">Penilaian Manual</h3>
          <p className="text-sm text-gray-500 mb-4">Berikan skor (0-100) untuk setiap jawaban manual.</p>
          {reviewData.answers_to_review.map((answer, index) => (
            <div key={answer.question_id} className="mb-6 p-4 border border-gray-200 rounded-lg">
              <p className="font-semibold text-gray-800">
                {index + 1}. Pertanyaan ({answer.type}):
              </p>
              <p className="text-sm text-gray-600 mb-2">{answer.question_text}</p>
              <p className="font-medium text-gray-700">Jawaban:</p>
              <div className="p-2 bg-gray-100 rounded-md">
                <p>{answer.answer}</p>
              </div>
              <div className="mt-4 flex items-center">
                <label className="mr-2 text-gray-700">Skor:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={manualScores[answer.question_id] || ''}
                  onChange={(e) => handleScoreChange(answer.question_id, e.target.value)}
                  className="w-20 p-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmitScores}
              className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Penilaian'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualAssessmentReviewPage;