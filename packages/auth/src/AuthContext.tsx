'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from './supabase/client';
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

export function AuthProvider({
  children,
  onboarding = true,
}: {
  children: React.ReactNode;
  /**
   * Whether to auto-open the customer onboarding modal (name/age/phone) for a
   * signed-in user without a completed profile. Admin/companion portals pass
   * `false` — those users don't have a customer profile and should never be
   * pushed through customer onboarding. Defaults to true (customer site).
   */
  onboarding?: boolean;
}) {
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

  // Admin status comes from the editable `admin_users` allowlist via the
  // is_admin() RPC. If that RPC doesn't exist yet (migration 10 not run) we
  // fall back to the legacy "@caresy.co" domain rule so nothing breaks.
  const resolveIsAdmin = async (u: User | null | undefined): Promise<boolean> => {
    if (!u) return false;
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return data === true;
    } catch {
      return u.email?.endsWith('@caresy.co') ?? false;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) setIsLoading(false);
    });

    // Keep this callback synchronous: awaiting any supabase call in here
    // deadlocks the client's auth lock (the call needs getSession, which
    // waits on the lock this callback holds) and stalls sign-in for 30s+.
    // Profile/admin loading happens in the user-keyed effect below.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    let stale = false;
    (async () => {
      const [admin, p] = await Promise.all([resolveIsAdmin(user), fetchProfile(user.id)]);
      if (stale) return;
      setIsAdmin(admin);
      // Only push a real customer through onboarding: never an admin, and never
      // on a portal that disabled it (admin/companion). Otherwise an ops user
      // signing into admin.caresy.co.in gets asked for their name/age/phone.
      if (onboarding && !admin && (!p || !p.onboarding_completed)) setIsOpen(true);
      setIsLoading(false);
    })();
    return () => { stale = true; };
  }, [user?.id]);

  const openLogin = (next?: string) => {
    setNextPath(next || (typeof window !== 'undefined' ? window.location.pathname : '/'));
    setIsOpen(true);
  };

  const closeLogin = () => {
    setIsOpen(false);
  };

  const signInWithGoogle = async () => {
    const { origin, hostname } = window.location;
    // Subdomain logins route through the apex callback: Supabase's allowlist
    // never matches *.caresy.co.in entries (see cookies.ts), but the Site URL
    // origin is always accepted. Cookies are parent-domain scoped, so the apex
    // can complete the PKCE exchange and hop back here with `next`.
    const redirectTo = hostname.endsWith('.caresy.co.in')
      ? `https://caresy.co.in/auth/callback?next=${encodeURIComponent(`${origin}${nextPath || '/'}`)}`
      : `${origin}/auth/callback?next=${encodeURIComponent(nextPath || '/')}`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
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
