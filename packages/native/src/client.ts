import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { AppState } from 'react-native';
import aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { decryptSession, encryptSession } from './sessionCrypto';

// The native Supabase client, shared by every Expo app in the repo (customer
// app and admin app). It lived in apps/mobile-app/lib/supabase.ts until the
// admin app needed the same encrypted-session storage; copying it would have
// been the copy-paste-between-apps bug CLAUDE.md names.
//
// SecureStore caps a single item at ~2048 bytes; a full Supabase session
// (access + refresh token + user metadata) can exceed that. So the session
// itself lives in AsyncStorage, encrypted with an AES key that lives in
// SecureStore — the documented Supabase + Expo pattern, not a custom scheme.

// Supabase hands us whatever its `storageKey` resolved to. When that was
// `undefined`, AsyncStorage's native module threw "Invalid key - must be a
// string.  Key: <null>" — an error naming neither Caresy nor Supabase, which
// is why a total sign-in outage survived twelve commits and a release. Fail
// with something greppable instead.
function assertKey(key: unknown): asserts key is string {
  if (typeof key !== 'string' || key === '') {
    throw new Error(
      `[caresy/native] session storage key must be a non-empty string, got ${JSON.stringify(key)}. ` +
        'Check the `storageKey` passed to createNativeClient.',
    );
  }
}

class LargeSecureStore {
  constructor(private readonly prefix: string) {}

  private keyName(key: string): string {
    return `${this.prefix}${key}_key`;
  }

  private async getEncryptionKey(key: string): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(this.keyName(key));
    if (existing) return aesjs.utils.hex.toBytes(existing);

    const bytes = Crypto.getRandomBytes(32);
    await SecureStore.setItemAsync(this.keyName(key), aesjs.utils.hex.fromBytes(bytes));
    return bytes;
  }

  async getItem(key: string): Promise<string | null> {
    assertKey(key);
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    // A session that will not decrypt is treated as no session: clear it and
    // let the user sign in again. Android's auto-backup restores this
    // ciphertext to a new device without the SecureStore key that opens it, and
    // the old code let that surface as a throw inside Supabase's auth init —
    // a crash on every launch, unrecoverable short of reinstalling.
    const plain = decryptSession(encrypted, await this.getEncryptionKey(key));
    if (plain === null) await this.removeItem(key);
    return plain;
  }

  async setItem(key: string, value: string): Promise<void> {
    assertKey(key);
    await AsyncStorage.setItem(key, encryptSession(value, await this.getEncryptionKey(key)));
  }

  async removeItem(key: string): Promise<void> {
    assertKey(key);
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(this.keyName(key));
  }
}

export interface NativeClientOptions {
  url: string | undefined;
  anonKey: string | undefined;
  /**
   * Namespaces the SecureStore key entries. Two Caresy apps can be installed on
   * the same device; on Android, SecureStore is shared per-app so this only
   * matters if a future app reuses the same storageKey, but it costs nothing
   * and makes the separation explicit.
   */
  keyPrefix?: string;
  /** Where in AsyncStorage the session blob lives. Distinct per app. */
  storageKey?: string;
  /** Names the env vars in the error, so each app points at its own .env.local. */
  envHint: string;
}

export function createNativeClient(opts: NativeClientOptions): SupabaseClient {
  if (!opts.url || !opts.anonKey) throw new Error(opts.envHint);

  const client = createClient(opts.url, opts.anonKey, {
    auth: {
      storage: new LargeSecureStore(opts.keyPrefix ?? ''),
      // Spread, not `storageKey: opts.storageKey`: supabase-js merges options
      // over its defaults with Object.assign, so an explicit `undefined`
      // *overwrites* the default 'supabase.auth.token' instead of falling back
      // to it. The client then called AsyncStorage.getItem(undefined) and the
      // native module threw "Invalid key - must be a string. Key: <null>" on
      // every auth call — the customer app (which passes no storageKey) could
      // not sign in at all.
      ...(opts.storageKey ? { storageKey: opts.storageKey } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Token refresh only ticks while the app is foregrounded — matches
  // Supabase's own recommendation for React Native.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });

  return client;
}
