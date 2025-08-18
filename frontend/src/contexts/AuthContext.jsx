import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mengambil sesi dan mendengarkan perubahan otentikasi
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        console.log('User ID from initial session:', session.user.id);
      } else {
        console.log('No active session.');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session) {
        console.log('User ID from auth state change:', session.user.id);
      } else {
        console.log('Auth state changed to no session.');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mengambil profil pengguna saat sesi berubah
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session) {
        console.log('Fetching profile for user ID:', session.user.id);
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
  
  // Fungsi untuk sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
  };

  const value = {
    session,
    userProfile,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
