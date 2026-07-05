'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOpen: boolean;
  openLogin: (onSuccess?: () => void) => void;
  closeLogin: () => void;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  updateProfileName: (name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  authSuccessCallback: (() => void) | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState<(() => void) | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email?.endsWith('@caresy.co') ?? false);
      setIsLoading(false);
    }
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email?.endsWith('@caresy.co') ?? false);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const openLogin = (onSuccess?: () => void) => {
    if (onSuccess) setAuthSuccessCallback(() => onSuccess);
    setIsOpen(true);
  };

  const closeLogin = () => {
    setIsOpen(false);
    setAuthSuccessCallback(null);
  };

  const sendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unknown error occurred' };
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unknown error occurred' };
    }
  };

  const updateProfileName = async (name: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() }
      });
      if (error) {
        return { success: false, error: error.message };
      }
      // Fetch updated user to update state
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      setUser(updatedUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unknown error occurred' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isOpen,
        openLogin,
        closeLogin,
        sendOtp,
        verifyOtp,
        updateProfileName,
        signOut,
        authSuccessCallback
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
