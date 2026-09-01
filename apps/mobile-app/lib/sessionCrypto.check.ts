// Self-check for the encrypted-session round trip.
//   node --experimental-strip-types lib/sessionCrypto.check.ts
// from apps/mobile-app. Silence means pass.
//
// The property that matters is not "encrypt then decrypt returns the input" —
// it is that decrypting with the WRONG key returns null instead of throwing or
// returning junk. That is the Android backup-restore path, and getting it wrong
// crashes the app on every launch.

import { strict as assert } from 'node:assert';
import { encryptSession, decryptSession } from './sessionCrypto.ts';

const keyA = new Uint8Array(32).fill(7);
const keyB = new Uint8Array(32).fill(9);
const session = JSON.stringify({
  access_token: 'a'.repeat(2400),
  refresh_token: 'r'.repeat(64),
  user: { id: '00000000-0000-0000-0000-000000000000', email: 'demo@caresy.co.in' },
});

// Round trip is lossless, including sessions past SecureStore's ~2048-byte cap.
const blob = encryptSession(session, keyA);
assert.equal(decryptSession(blob, keyA), session, 'round trip must be lossless');
assert.ok(session.length > 2048, 'fixture must exceed the SecureStore item cap');

// Ciphertext is hex and is not the plaintext.
assert.match(blob, /^[0-9a-f]+$/, 'ciphertext must be lowercase hex');
assert.ok(!blob.includes('refresh_token'), 'plaintext must not survive in ciphertext');

// The restore case: right ciphertext, wrong key. Never throws, never returns junk.
assert.equal(decryptSession(blob, keyB), null, 'wrong key must yield null, not junk');

// Corrupt or truncated ciphertext is also just "no session".
assert.equal(decryptSession('', keyA), null, 'empty ciphertext -> null');
assert.equal(decryptSession('zzzz', keyA), null, 'non-hex ciphertext -> null');
assert.equal(decryptSession(blob.slice(0, 64), keyA), null, 'truncated ciphertext -> null');

// Wrong key must be rejected across many keys, not just the one above — a
// single lucky sample would hide a decode path that happens to produce
// parseable JSON.
for (let i = 0; i < 200; i++) {
  const wrong = new Uint8Array(32).fill(i % 251);
  if (wrong.every((b, j) => b === keyA[j])) continue;
  assert.equal(decryptSession(blob, wrong), null, `wrong key ${i} must yield null`);
}

// A short non-JSON payload must not be mistaken for a session even with the
// right key — Supabase would throw on it downstream.
assert.equal(decryptSession(encryptSession('not json', keyA), keyA), null, 'non-JSON -> null');

console.log('sessionCrypto: ok');
