// Default import, not `import * as`: aes-js is CommonJS, and the namespace form
// leaves the exports one level down under Node's ESM loader — which is how
// sessionCrypto.check.ts runs this file.
import aesjs from 'aes-js';

// The pure half of LargeSecureStore (lib/supabase.ts) — no native modules, so
// it is directly testable. See sessionCrypto.check.ts.
//
// Supabase sessions are too large for SecureStore's ~2048-byte item cap, so the
// session ciphertext lives in AsyncStorage and only the AES key lives in
// SecureStore. That split is Supabase's own documented Expo pattern, and it has
// one sharp edge: the two stores do not fail over together. Android auto-backup
// restores AsyncStorage to a new device but leaves the SecureStore key behind,
// so ciphertext can outlive the key that opens it.

export function encryptSession(value: string, key: Uint8Array): string {
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1));
  return aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)));
}

/**
 * Decrypt a stored session, or null if this ciphertext and key do not belong
 * together.
 *
 * Decrypting with the wrong key does not fail loudly — CTR mode is
 * unauthenticated, so it just yields noise. Sometimes that noise is invalid
 * UTF-8 and `fromBytes` throws; sometimes it decodes to a plausible string and
 * only blows up later, inside Supabase's own `JSON.parse` during auth init —
 * i.e. on launch, every launch. Both paths have to collapse to the same answer
 * here, so the JSON shape check is load-bearing rather than defensive: it is
 * what makes a wrong key detectable at all. Callers treat null as "no session"
 * and re-authenticate.
 */
export function decryptSession(hex: string, key: Uint8Array): string | null {
  let plain: string;
  try {
    const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1));
    plain = aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(hex)));
  } catch {
    return null;
  }
  try {
    JSON.parse(plain);
  } catch {
    return null;
  }
  return plain;
}
