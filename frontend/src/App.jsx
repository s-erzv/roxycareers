import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
 
import Auth from './pages/Auth';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import JobFormPage from './pages/JobFormPage';
 
const Header = () => {
  const { userProfile, signOut } = useAuth();
  
  return (
    <header className="bg-gray-900 text-white p-4 shadow-lg fixed w-full z-10">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-teal-400">Roxy Careers</h1>
        <nav>
          {userProfile?.role === 'candidate' && (
            <div className="flex space-x-4">
              <a href="/home" className="text-sm font-semibold text-white">
                Cari Lowongan
              </a>
              <a href="/dashboard" className="text-sm font-semibold text-white">
                Dashboard
              </a>
            </div>
          )}
        </nav>
        {userProfile ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm">Logged in as: <strong className="capitalize">{userProfile.role}</strong></span>
            <button onClick={signOut} className="bg-red-500 text-white font-semibold py-1 px-3 rounded-full hover:bg-red-600 transition-colors duration-200">
              Sign Out
            </button>
          </div>
        ) : (
          <span className="text-sm">Silakan Login</span>
        )}
      </div>
    </header>
  );
};

const AppRoutes = () => {
  const { session, userProfile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }
  
  if (userProfile && userProfile.role === 'candidate') {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<CandidateDashboard />} />
      </Routes>
    );
  } else if (userProfile && userProfile.role !== 'candidate') {
    return (
      <Routes>
        <Route path="*" element={<AdminDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/jobForm" element={<JobFormPage />} />
      </Routes>
    );
  }
  
  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <p>Memuat profil...</p>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="bg-gray-100 min-h-screen font-sans antialiased">
          <Header />
          <main className="pt-20">
            <AppRoutes />
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
