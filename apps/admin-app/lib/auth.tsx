import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

// Admin sign-in is email + password only. No OAuth, no magic link: ops accounts
// are a short allowlist (`admin_users`, migration 10) rather than self-serve
// signups, and a password avoids needing a deep-link round trip on a device
// that may be locked to a kiosk profile.
//
// `isAdmin` is the server's answer (`is_admin()` RPC), not a client guess. Even
// if it were spoofed, every write the app makes is an admin-guarded RPC or an
// RLS-protected table — the UI gate is a courtesy, the DB is the boundary.

/**
 * Whether this device will actually be woken by a dispatch alert.
 *
 * Alerts are the reason this app exists rather than a bookmark to /admin/ops,
 * so "am I reachable?" is app state, not a detail buried in a try/catch. A desk
 * phone that silently stopped receiving pushes looks exactly like a quiet night.
 *
 *   on           — registered, a token is in push_tokens
 *   off          — permission refused, or revoked in Settings
 *   unavailable  — simulator, Expo Go, or web: no push module to talk to
 *   pending      — not resolved yet
 */
export type PushState = 'on' | 'off' | 'unavailable' | 'pending';

type AuthValue = {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  pushState: PushState;
  /** Ask again, or send the operator to Settings if iOS will no longer prompt. */
  enablePush: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

// The Expo push token this install registered, kept so sign-out can retire
// exactly this device rather than every device the account has.
let registeredToken: string | null = null;

// Alerts have to surface while the operator is already looking at the board —
// a new request landing silently in the tray is the whole failure this app
// exists to prevent.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushState, setPushState] = useState<PushState>('pending');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    // Keep this callback synchronous: awaiting a supabase call inside it
    // deadlocks the client's auth lock and stalls sign-in for 30s+.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let stale = false;
    (async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (stale) return;
      // A failed RPC is not a promotion: fall closed.
      setIsAdmin(!error && data === true);
      setLoading(false);
    })();
    return () => { stale = true; };
  }, [session?.user?.id]);

  // Register this device for the ADMIN fan-out (migration 51 +
  // api/cron/send-push). Only admins register: a non-admin's token in
  // push_tokens would get every dispatch alert.
  //
  // `ask` is false on the automatic pass — a cold launch should not throw a
  // permission sheet at someone mid-call — and true when the operator taps the
  // alert chip to fix it.
  const registerPush = useCallback(async (userId: string, ask: boolean): Promise<PushState> => {
    if (Platform.OS === 'web') return 'unavailable';
    const ownership = (Constants as unknown as { appOwnership?: string }).appOwnership;
    const execEnv = (Constants as unknown as { executionEnvironment?: string }).executionEnvironment;
    if (ownership === 'expo' || execEnv === 'storeClient') return 'unavailable'; // Expo Go has no push module
    if (Device.isDevice === false) return 'unavailable'; // simulator

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('dispatch', {
          name: 'Dispatch alerts',
          importance: Notifications.AndroidImportance.MAX,
        });
      }
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== 'granted' && ask) final = (await Notifications.requestPermissionsAsync()).status;
      if (final !== 'granted') return 'off';

      const projectId =
        (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
      if (!projectId || projectId === 'SET_BY_EAS_INIT') return 'unavailable';

      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (!token) return 'off';
      const { error } = await supabase.from('push_tokens').upsert(
        { token, user_id: userId, platform: Platform.OS },
        { onConflict: 'token' },
      );
      // A granted permission with no row in push_tokens is still an unreachable
      // device — the cron reads the table, not the OS.
      if (error) return 'off';
      registeredToken = token;
      return 'on';
    } catch (e) {
      // No push is degraded, not broken — the board still refreshes on focus
      // and on every poll.
      if (__DEV__) console.warn('[push] registration skipped', (e as Error).message);
      return 'off';
    }
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !isAdmin) return;
    let cancelled = false;
    (async () => {
      const next = await registerPush(userId, false);
      if (!cancelled) setPushState(next);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id, isAdmin, registerPush]);

  const enablePush = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;
    const next = await registerPush(userId, true);
    setPushState(next);
    // iOS only ever shows its permission sheet once. After a refusal the only
    // route back is Settings, so send them there rather than no-op'ing a tap.
    if (next === 'off') await Linking.openSettings().catch(() => {});
  }, [session?.user?.id, registerPush]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    // Drop this device from the fan-out first: after signOut the RLS policy
    // ("own tokens: delete") no longer matches, so the row would be stranded
    // and keep receiving dispatch alerts on a signed-out phone.
    try {
      if (registeredToken) {
        await supabase.from('push_tokens').delete().eq('token', registeredToken);
        registeredToken = null;
      }
    } catch { /* best effort */ }
    await supabase.auth.signOut();
    setPushState('pending');
  }, []);

  return (
    <AuthContext.Provider value={{ session, isAdmin, loading, pushState, enablePush, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
