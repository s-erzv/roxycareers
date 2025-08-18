import React from 'react';
import { useNavigate } from 'react-router-dom';
import JobForm from '../components/JobForm';

export default function JobFormPage({ onJobAdded, jobToEdit }) {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/admin');
  };

  return (
    <div className="p-8">
      <JobForm 
        onClose={handleClose} 
        onJobAdded={onJobAdded} 
        jobToEdit={jobToEdit}
      />
    </div>
  );
}
