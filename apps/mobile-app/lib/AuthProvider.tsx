import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
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
  signInWithApple: () => Promise<void>;
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

  // Push: registers Expo push token → `push_tokens` (migration 21) for `api/cron/send-push`.
  // Expo Go has no native push module — silently no-op there, but upsert on
  // real builds (Constants.appOwnership !== 'expo' && Device.isDevice).
  // Guard BEFORE any require() so Expo Go never evaluates native code.
  useEffect(() => {
    if (!session?.user) return;
    if (Platform.OS === 'web') return;
    // Silent no-op in Expo Go: real builds have appOwnership === 'standalone'
    // (or undefined) and executionEnvironment !== 'storeClient'.
    const ownership = (Constants as any).appOwnership;
    const execEnv = (Constants as any).executionEnvironment;
    const isExpoGo = ownership === 'expo' || execEnv === 'storeClient';
    if (isExpoGo) return;
    let cancelled = false;
    (async () => {
      // Device.isDevice is the reliable physical-device check (Constants.isDevice is stale).
      let Device: any = null;
      try { Device = eval("require")('expo-device'); } catch {}
      if (Device?.isDevice === false) return; // simulator — silent no-op

      let Notifications: any = null;
      try {
        Notifications = eval("require")('expo-notifications');
      } catch {
        return; // not built yet — silently skip (will work after prebuild dev-client)
      }
      if (!Notifications?.getPermissionsAsync) return;
      try {

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          finalStatus = req.status;
        }
        if (finalStatus !== 'granted' || cancelled) return;

        // Android channel — required for foreground notifications
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const projectId =
          (Constants.expoConfig?.extra as any)?.eas?.projectId ??
          (Constants as any).easConfig?.projectId ??
          'f1c994af-5e87-43f4-8d64-f33366e6756d';

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId } as any);
        const token = (tokenData as any).data as string | undefined;
        if (!token || cancelled) return;

        const { error } = await supabase.from('push_tokens').upsert(
          { token, user_id: session.user.id, platform: Platform.OS },
          { onConflict: 'token' },
        );
        if (error) console.warn('[push] upsert failed', error.message);
      } catch (e) {
        // Silently skip in Expo Go / web — push needs dev-client + google-services.json
        console.warn('[push] registration skipped', (e as Error).message?.slice(0, 120));
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

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

  async function signInWithApple() {
    if (Platform.OS !== 'ios') throw new Error('Sign in with Apple is only available on iOS');
    let AppleAuthentication: any = null;
    try {
      AppleAuthentication = require('expo-apple-authentication');
    } catch {
      throw new Error('Apple auth not available in Expo Go — rebuild dev client');
    }
    // Gate: hide on devices where Apple auth is unavailable (Android/web, older iOS).
    // Callers also gate UI via isAvailableAsync; this is the runtime guard.
    try {
      if (AppleAuthentication.isAvailableAsync) {
        const available = await AppleAuthentication.isAvailableAsync();
        if (!available) throw new Error('Sign in with Apple not available on this device');
      }
    } catch (e: any) {
      // If availability check throws, rethrow its message (e.g., not available)
      if (e?.message?.includes('not available')) throw e;
    }

    // Nonce: mitigate replay — rawNonce hashed for Apple, rawNonce passed to Supabase.
    // Supabase (GoTrue) verifies identityToken.nonce against the raw nonce.
    let rawNonce: string | undefined;
    let hashedNonce: string | undefined;
    try {
      const Crypto = require('expo-crypto');
      // 32-char random + timestamp for uniqueness
      rawNonce = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      if (Crypto?.digestStringAsync && Crypto?.CryptoDigestAlgorithm?.SHA256) {
        hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      } else if (Crypto?.digestStringAsync) {
        hashedNonce = await Crypto.digestStringAsync('SHA-256' as any, rawNonce);
      }
    } catch {
      rawNonce = undefined;
      hashedNonce = undefined;
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      ...(hashedNonce ? { nonce: hashedNonce } : {}),
    });
    if (!credential.identityToken) throw new Error('Apple did not return an identity token');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      ...(rawNonce ? { nonce: rawNonce } : {}),
    } as any);
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
