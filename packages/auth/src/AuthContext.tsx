'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from './supabase/client';
import { getMsg91AccessToken, msg91Configured, sendPhoneOtp, verifyPhoneOtp, retryPhoneOtp } from './msg91';
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
  /** Whether this portal does customer onboarding at all (false on admin/companion). */
  onboardingEnabled: boolean;
  isOpen: boolean;
  openLogin: (next?: string) => void;
  closeLogin: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ needsConfirmation: boolean }>;
  /** Whether this portal offers OTP sign-in (website only — see msg91Configured). */
  phoneSignInEnabled: boolean;
  /** Opens the MSG91 widget and, on a verified OTP, establishes a session. Throws on failure. */
  signInWithPhone: () => Promise<void>;
  /** Sends an OTP to a 10-digit Indian mobile number (custom login UI). Throws on failure. */
  startPhoneOtp: (mobile10: string) => Promise<void>;
  /** Resends the OTP to the number from the last startPhoneOtp call. */
  resendPhoneOtp: () => Promise<void>;
  /** Verifies the OTP and establishes a session. Throws on failure. */
  confirmPhoneOtp: (otp: string) => Promise<void>;
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

  // Subdomain logins route through the apex callback: Supabase's allowlist
  // never matches *.caresy.co.in entries (see cookies.ts), but the Site URL
  // origin is always accepted. Cookies are parent-domain scoped, so the apex
  // can complete the PKCE exchange and hop back here with `next`.
  const oauthRedirectTo = () => {
    const { origin, hostname } = window.location;
    return hostname.endsWith('.caresy.co.in')
      ? `https://caresy.co.in/auth/callback?next=${encodeURIComponent(`${origin}${nextPath || '/'}`)}`
      : `${origin}/auth/callback?next=${encodeURIComponent(nextPath || '/')}`;
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: oauthRedirectTo() },
    });
  };

  const signInWithApple = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: oauthRedirectTo() },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: fullName ? { full_name: fullName.trim() } : undefined },
    });
    if (error) throw error;
    const needsConfirmation = !data.session && !!data.user && !data.user.email_confirmed_at;
    return { needsConfirmation };
  };

  // Trades a verified MSG91 access-token for a Supabase session. The server
  // (which holds the secret authkey) confirms the number and returns a one-shot
  // magic-link hash; verifyOtp turns it into a session on this same page, and
  // onAuthStateChange picks it up. No OAuth redirect, no email sent.
  const establishPhoneSession = async (accessToken: string) => {
    const response = await fetch('/api/auth/phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Phone sign-in failed.');
    const { error } = await supabase.auth.verifyOtp({ token_hash: body.tokenHash, type: 'email' });
    if (error) throw new Error(error.message);
  };

  // Popup flow (used by the booking-modal quick login).
  const signInWithPhone = async () => {
    await establishPhoneSession(await getMsg91AccessToken());
  };

  // Custom-UI flow (dedicated /login page): send → verify → session, our fields.
  const startPhoneOtp = (mobile10: string) => sendPhoneOtp(`91${mobile10}`);
  const resendPhoneOtp = () => retryPhoneOtp();
  const confirmPhoneOtp = async (otp: string) => {
    await establishPhoneSession(await verifyPhoneOtp(otp));
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
        onboardingEnabled: onboarding,
        isOpen,
        openLogin,
        closeLogin,
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        phoneSignInEnabled: msg91Configured(),
        signInWithPhone,
        startPhoneOtp,
        resendPhoneOtp,
        confirmPhoneOtp,
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
