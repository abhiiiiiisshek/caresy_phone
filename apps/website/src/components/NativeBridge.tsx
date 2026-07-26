'use client';

import { useEffect } from 'react';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';

// Activates native behaviour when the site runs inside the Capacitor app
// (window.Capacitor is injected by the shell; on plain browsers this renders
// nothing and does nothing).
//
// - Status bar: opaque, brand cream, dark icons — no content underlap.
// - Haptics: light tick on button/link taps so the UI feels physical.
// - Push notifications: asks permission, registers, and stores the device
//   token in Supabase (push_tokens table) tied to the signed-in user.

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

export default function NativeBridge() {
  const { user } = useAuth();

  useEffect(() => {
    const cap = window.Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const plugins = cap.Plugins ?? {};

    // Status bar: match the site's cream background, dark icons.
    plugins.StatusBar?.setOverlaysWebView?.({ overlay: false }).catch(() => {});
    plugins.StatusBar?.setBackgroundColor?.({ color: '#f8faf5' }).catch(() => {});
    plugins.StatusBar?.setStyle?.({ style: 'LIGHT' }).catch(() => {});

    // Light haptic tick on tappable elements.
    const onTap = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('button, a, [role="button"]')) {
        plugins.Haptics?.impact?.({ style: 'LIGHT' }).catch(() => {});
      }
    };
    document.addEventListener('click', onTap, { passive: true });
    return () => document.removeEventListener('click', onTap);
  }, []);

  // Push registration — after sign-in so the token can be tied to the user.
  useEffect(() => {
    const cap = window.Capacitor;
    const push = cap?.Plugins?.PushNotifications;
    if (!cap?.isNativePlatform?.() || !push || !user) return;

    const store = async (token: string) => {
      try {
        await createClient().from('push_tokens').upsert(
          { user_id: user.id, token, platform: cap.getPlatform?.() ?? 'android' },
          { onConflict: 'token' },
        );
      } catch {
        // Table may not exist yet in this environment — never break the app for it.
      }
    };

    let regListener: { remove?: () => void } | undefined;
    (async () => {
      try {
        let perm = await push.checkPermissions();
        if (perm.receive === 'prompt') perm = await push.requestPermissions();
        if (perm.receive !== 'granted') return;
        regListener = await push.addListener('registration', (t: { value: string }) => store(t.value));
        await push.register();
      } catch {
        // Push not configured (e.g. missing google-services.json) — silently skip.
      }
    })();
    return () => regListener?.remove?.();
  }, [user]);

  return null;
}
