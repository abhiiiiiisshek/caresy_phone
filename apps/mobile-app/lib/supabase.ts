import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { AppState } from 'react-native';
import * as aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// SecureStore caps a single item at ~2048 bytes; a full Supabase session
// (access + refresh token + user metadata) can exceed that. So the session
// itself lives in AsyncStorage, encrypted with an AES key that lives in
// SecureStore — the documented Supabase + Expo pattern, not a custom scheme.
class LargeSecureStore {
  private async getEncryptionKey(keyName: string): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(keyName);
    if (existing) return aesjs.utils.hex.toBytes(existing);

    const bytes = Crypto.getRandomBytes(32);
    await SecureStore.setItemAsync(keyName, aesjs.utils.hex.fromBytes(bytes));
    return bytes;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    const keyName = `${key}_key`;
    const encryptionKey = await this.getEncryptionKey(keyName);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(encrypted));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async setItem(key: string, value: string): Promise<void> {
    const keyName = `${key}_key`;
    const encryptionKey = await this.getEncryptionKey(keyName);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encryptedBytes));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(`${key}_key`);
  }
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — set them in apps/mobile-app/.env.local',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Token refresh only ticks while the app is foregrounded — matches
// Supabase's own recommendation for React Native.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
