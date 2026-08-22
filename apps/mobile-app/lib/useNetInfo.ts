// Lightweight online check without adding @react-native-community/netinfo.
// Pings Supabase HEAD every 30s; offline banner can read this hook.

import { useEffect, useState } from 'react';

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!url) return;
    const tick = async () => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        setOnline(res.ok || res.status < 500);
      } catch {
        setOnline(false);
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return online;
}
