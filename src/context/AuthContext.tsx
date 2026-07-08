'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  full_name: string | null;
  age: number | null;
  phone: string | null;
  onboarding_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOpen: boolean;
  openLogin: (next?: string) => void;
  closeLogin: () => void;
  signInWithGoogle: () => Promise<void>;
  saveProfile: (data: { full_name: string; age: number; phone: string }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [nextPath, setNextPath] = useState<string>('/');

  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, age, phone, onboarding_completed')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data ?? null);
    return data;
  };

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email?.endsWith('@caresy.co') ?? false);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (!p || !p.onboarding_completed) setIsOpen(true);
      }
      setIsLoading(false);
    }
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email?.endsWith('@caresy.co') ?? false);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (!p || !p.onboarding_completed) setIsOpen(true);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const openLogin = (next?: string) => {
    setNextPath(next || (typeof window !== 'undefined' ? window.location.pathname : '/'));
    setIsOpen(true);
  };

  const closeLogin = () => {
    setIsOpen(false);
  };

  const signInWithGoogle = async () => {
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath || '/')}`,
      },
    });
  };

  const saveProfile = async (data: { full_name: string; age: number; phone: string }) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: data.full_name,
        age: data.age,
        phone: data.phone,
        onboarding_completed: true,
      });
      if (error) return { success: false, error: error.message };
      await fetchProfile(user.id);
      setIsOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unknown error occurred' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAdmin,
        isOpen,
        openLogin,
        closeLogin,
        signInWithGoogle,
        saveProfile,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
