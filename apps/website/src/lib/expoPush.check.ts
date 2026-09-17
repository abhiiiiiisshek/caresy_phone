// Self-check for the Expo push token routing and receipt handling.
//   node --experimental-strip-types src/lib/expoPush.check.ts
// from apps/website. Silence means pass.
//
// Both functions here decide whether a live device stays reachable, and both
// get that decision wrong in a way nobody notices for days: mis-routing sends
// an Expo token to FCM (guaranteed failure), and over-eager retirement deletes
// a working device permanently. So the properties checked are "never retire
// unless Expo said DeviceNotRegistered" and "classification is exhaustive".

import { strict as assert } from 'node:assert';
import { isExpoToken, shouldRetireExpoToken } from './expoPush.ts';

// Every shape the native apps actually produce routes to Expo.
assert.equal(isExpoToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'), true);
assert.equal(isExpoToken('ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]'), true);

// Raw FCM/APNs tokens must keep taking the FCM path — they are long opaque
// strings with no prefix, and an APNs token is bare hex.
assert.equal(isExpoToken('dGhpcy1pcy1hbi1GQ00tdG9rZW46QVBBOTFiR...'), false);
assert.equal(isExpoToken('a'.repeat(64)), false);
assert.equal(isExpoToken(''), false);
// Near-misses must not be mistaken for Expo tokens.
assert.equal(isExpoToken('expoPushToken[lowercase]'), false);
assert.equal(isExpoToken('  ExponentPushToken[leading-space]'), false);

// Only DeviceNotRegistered retires a token.
assert.equal(shouldRetireExpoToken('DeviceNotRegistered', 'is not a registered push notification recipient'), true);
for (const code of ['MessageTooBig', 'MessageRateExceeded', 'MismatchSenderId', 'InvalidCredentials']) {
  assert.equal(shouldRetireExpoToken(code, 'whatever'), false, `${code} must not retire the token`);
}
// No code at all: fall back to Expo's own wording, and only that wording.
assert.equal(shouldRetireExpoToken(undefined, '"ExponentPushToken[x]" is not a registered push notification recipient'), true);
assert.equal(shouldRetireExpoToken(undefined, 'internal server error'), false);
assert.equal(shouldRetireExpoToken(undefined, ''), false);

console.log('expoPush: ok');
