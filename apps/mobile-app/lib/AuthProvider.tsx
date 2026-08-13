import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
// Supabase's implicit-grant redirect puts tokens in the URL's hash fragment;
// expo-linking's parser does not read fragments, so use expo-auth-session's
// parser instead — this is Supabase's own documented Expo pattern.
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Same Supabase-managed OAuth the website uses (supabase.auth.signInWithOAuth),
// just opened in an in-app browser instead of a page redirect: no separate
// Google Cloud native-client registration needed, no SHA-1 fingerprint to
// manage. Requires `caresy://auth/callback` on Supabase's redirect allowlist.
const redirectTo = Linking.createURL('auth/callback');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Supabase did not return an OAuth URL');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) return;

    const { params, errorCode } = QueryParams.getQueryParams(result.url);
    if (errorCode) throw new Error(String(errorCode));

    const accessToken = params.access_token as string | undefined;
    const refreshToken = params.refresh_token as string | undefined;
    if (!accessToken || !refreshToken) {
      throw new Error('OAuth callback did not include a session');
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
