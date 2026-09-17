import { createNativeClient } from '@caresy/native/client';

// Same project, same anon key, same encrypted-session storage as the customer
// app. `storageKey` is distinct so a device that somehow holds both sessions
// never has one overwrite the other.
export const supabase = createNativeClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  keyPrefix: 'admin_',
  storageKey: 'caresy-admin-auth',
  envHint:
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — set them in apps/admin-app/.env.local',
});
