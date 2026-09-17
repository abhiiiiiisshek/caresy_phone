import { createNativeClient } from '@caresy/native/client';

// The client itself lives in packages/native — the admin app needs the same
// encrypted-session storage, and two copies of it would drift.
export const supabase = createNativeClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  envHint:
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — set them in apps/mobile-app/.env.local',
});
