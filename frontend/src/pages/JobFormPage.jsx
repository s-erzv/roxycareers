import { useNavigate, useLocation } from 'react-router-dom';
import JobForm from '../components/JobForm';

export default function JobFormPage({ onJobAdded }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const jobToEdit = location.state?.jobToEdit;

  const handleClose = () => {
    navigate('/admin');
  };

   const handleJobAddedSuccessfully = () => {
    console.log("Job has been successfully added!");
  };

  return (
    <div className="p-8">
      <JobForm 
        onClose={handleClose} 
        onJobAdded={handleJobAddedSuccessfully}
        jobToEdit={jobToEdit} // Sekarang jobToEdit sudah terisi
      />
    </div>
  );
}