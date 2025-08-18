import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Pastikan jalur ini benar

// Import komponen halaman yang terpisah
import Auth from './pages/Auth';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';

// Header component dengan tombol Sign Out
const Header = ({ userProfile, onSignOut }) => (
  <header className="bg-gray-900 text-white p-4 shadow-lg fixed w-full z-10">
    <div className="container mx-auto flex justify-between items-center">
      <h1 className="text-2xl font-bold text-teal-400">Roxy Careers</h1>
      {userProfile ? (
        <div className="flex items-center space-x-4">
          <span className="text-sm">Logged in as: <strong className="capitalize">{userProfile.role}</strong></span>
          <button onClick={onSignOut} className="bg-red-500 text-white font-semibold py-1 px-3 rounded-full hover:bg-red-600 transition-colors duration-200">
            Sign Out
          </button>
        </div>
      ) : (
        <span className="text-sm">Silakan Login</span>
      )}
    </div>
  </header>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mengecek sesi otentikasi
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role, company')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
        } else {
          setUserProfile({ ...data, email: session.user.email });
        }
      } else {
        setUserProfile(null);
      }
    };

    fetchUserProfile();
  }, [session]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Loading...</p>
      </div>
    );
  }

  const renderContent = () => {
    if (!session) {
      return <Auth />;
    }
    
    // Pastikan userProfile sudah dimuat sebelum menentukan halaman
    if (userProfile) {
      if (userProfile.role !== 'candidate') {
        return <AdminDashboard userProfile={userProfile} />;
      } else {
        return <Home />;
      }
    }
    
    // Fallback jika userProfile masih null (sedang loading)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p>Memuat profil...</p>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans antialiased">
      <Header userProfile={userProfile} onSignOut={handleSignOut} />
      <main className="pt-20">
        {renderContent()}
      </main>
    </div>
  );
}
