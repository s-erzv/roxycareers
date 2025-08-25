import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function QuestionBankPage({ onBack }) {
    const [templates, setTemplates] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newQuestion, setNewQuestion] = useState({ 
        text: '', 
        question_type: 'ESSAY', 
        options: [], 
        solution: '' 
    });

    useEffect(() => {
        fetchTemplates();
        fetchQuestions();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/assessment-templates/');
            setTemplates(res.data);
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        }
    };

    const fetchQuestions = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/question-bank/');
            setQuestions(res.data);
        } catch (error) {
            console.error("Failed to fetch questions:", error);
        }
    };
    
    const handleCreateTemplate = async () => {
        try {
            await axios.post('http://127.0.0.1:8000/api/assessment-templates/', { name: newTemplateName });
            fetchTemplates();
            setNewTemplateName('');
        } catch (error) {
            console.error("Failed to create template:", error);
        }
    };
    
    const handleCreateQuestion = async () => {
        try {
            await axios.post('http://127.0.0.1:8000/api/question-bank/', newQuestion);
            fetchQuestions();
            setNewQuestion({ text: '', question_type: 'ESSAY', options: [], solution: '' });
        } catch (error) {
            console.error("Failed to create question:", error);
        }
    };

    const handleAddQuestionToTemplate = async (templateId, questionId) => {
        try {
            await axios.post(`http://127.0.0.1:8000/api/assessment-templates/${templateId}/questions/`, { question_id: questionId });
            alert('Pertanyaan berhasil ditambahkan ke template!');
        } catch (error) {
            console.error("Failed to add question to template:", error);
        }
    };
    
    const handleQuestionChange = (e) => {
        const { name, value } = e.target;
        setNewQuestion(prev => ({ ...prev, [name]: value }));
    };

    const handleOptionChange = (index, e) => {
        const newOptions = [...newQuestion.options];
        newOptions[index] = e.target.value;
        setNewQuestion(prev => ({ ...prev, options: newOptions }));
    };

    const addOption = () => {
        setNewQuestion(prev => ({ ...prev, options: [...prev.options, ''] }));
    };

    const removeOption = (index) => {
        const newOptions = newQuestion.options.filter((_, i) => i !== index);
        setNewQuestion(prev => ({ ...prev, options: newOptions }));
    };

    return (
        <div className="p-8">
            <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Dashboard
            </button>
            <h2 className="text-3xl font-bold mb-6 text-gray-900 mt-4">Bank Soal & Template Asesmen</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bagian Manajemen Template */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4">Kelola Template</h3>
                    <div className="flex space-x-2 mb-4">
                        <input
                            type="text"
                            placeholder="Nama Template Baru"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            className="flex-1 p-2 border rounded-md"
                        />
                        <button onClick={handleCreateTemplate} className="px-4 py-2 bg-blue-500 text-white rounded-md">Buat Template</button>
                    </div>
                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                        {templates.map(template => (
                            <li key={template.id} className="p-3 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200" onClick={() => setSelectedTemplate(template)}>
                                {template.name}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Bagian Manajemen Pertanyaan */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-4">Tambah Pertanyaan Baru</h3>
                    <div className="space-y-4">
                        <textarea
                            name="text"
                            placeholder="Teks Pertanyaan"
                            value={newQuestion.text}
                            onChange={handleQuestionChange}
                            className="w-full p-2 border rounded-md"
                        />
                        <select
                            name="question_type"
                            value={newQuestion.question_type}
                            onChange={handleQuestionChange}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="ESSAY">Essay</option>
                            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                            <option value="SINGLE_CHOICE">Single Choice</option>
                            <option value="FILE_UPLOAD">File Upload</option>
                            <option value="CODING_CHALLENGE">Coding Challenge</option>
                            <option value="TEXT_INPUT">Text Input</option>
                            <option value="INTEGER_INPUT">Integer Input</option>
                        </select>

                        {(newQuestion.question_type === 'SINGLE_CHOICE' || newQuestion.question_type === 'MULTIPLE_CHOICE') && (
                            <div>
                                <h4 className="font-semibold mb-2">Opsi Jawaban:</h4>
                                <div className="space-y-2">
                                    {newQuestion.options.map((option, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleOptionChange(index, e)}
                                                className="flex-1 p-2 border rounded-md"
                                                placeholder={`Opsi ${index + 1}`}
                                            />

                                            {/* Checkbox untuk jawaban benar */}
                                            <input
                                                type={newQuestion.question_type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                                                name="solution"
                                                checked={
                                                    newQuestion.question_type === "SINGLE_CHOICE"
                                                        ? newQuestion.solution === option
                                                        : newQuestion.solution.includes(option)
                                                }
                                                onChange={(e) => {
                                                    if (newQuestion.question_type === "SINGLE_CHOICE") {
                                                        setNewQuestion(prev => ({ ...prev, solution: option }));
                                                    } else {
                                                        // multiple choice (array of correct answers)
                                                        if (e.target.checked) {
                                                            setNewQuestion(prev => ({ ...prev, solution: [...prev.solution, option] }));
                                                        } else {
                                                            setNewQuestion(prev => ({ ...prev, solution: prev.solution.filter(ans => ans !== option) }));
                                                        }
                                                    }
                                                }}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => removeOption(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="mt-2 w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md"
                                >
                                    + Tambah Opsi
                                </button>
                            </div>
                        )}


                        {(newQuestion.question_type === 'INTEGER_INPUT' || newQuestion.question_type === 'TEXT_INPUT') && (
                            <input
                                type="text"
                                name="solution"
                                placeholder="Jawaban Benar"
                                value={newQuestion.solution}
                                onChange={handleQuestionChange}
                                className="w-full p-2 border rounded-md"
                            />
                        )}

                        {(newQuestion.question_type === 'ESSAY' || newQuestion.question_type === 'FILE_UPLOAD' || newQuestion.question_type === 'CODING_CHALLENGE') && (
                            <p className="text-sm text-gray-500 italic">
                                Soal tipe ini akan dinilai secara manual oleh penguji.
                            </p>
                        )}

                        <button onClick={handleCreateQuestion} className="w-full px-4 py-2 bg-green-500 text-white rounded-md">Tambah Pertanyaan</button>
                    </div>
                    
                    <div className="mt-8 max-h-60 overflow-y-auto">
                        <h4 className="text-lg font-semibold mb-2">Daftar Pertanyaan di Bank</h4>
                        <ul className="space-y-2">
                            {questions.map(question => (
                                <li key={question.id} className="p-3 bg-gray-100 rounded-md flex justify-between items-center">
                                    <span>{question.text} ({question.question_type})</span>
                                    {selectedTemplate && (
                                        <button onClick={() => handleAddQuestionToTemplate(selectedTemplate.id, question.id)} className="ml-2 px-3 py-1 bg-blue-400 text-white text-xs rounded-md">
                                            Tambah ke {selectedTemplate.name}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
