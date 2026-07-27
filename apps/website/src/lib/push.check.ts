// Self-check for the push sender's pure logic. No framework, no network:
//   node --experimental-strip-types src/lib/push.check.ts
// from apps/website. Silence means pass.

import { strict as assert } from 'node:assert';
import { mapLimit } from './mapLimit.ts';
import { shouldRetireToken } from './fcm.ts';

// ---- mapLimit ----

// Order follows the input, not completion order.
const delays = [40, 5, 30, 1, 20, 10];
const order = await mapLimit(delays, 2, async (ms) => {
  await new Promise((r) => setTimeout(r, ms));
  return ms;
});
assert.deepEqual(order, delays, 'mapLimit reordered its results');

// Concurrency is actually capped.
let inFlight = 0;
let peak = 0;
await mapLimit(Array.from({ length: 25 }, (_, i) => i), 4, async () => {
  inFlight++;
  peak = Math.max(peak, inFlight);
  await new Promise((r) => setTimeout(r, 3));
  inFlight--;
});
assert.ok(peak <= 4, `mapLimit ran ${peak} at once with a limit of 4`);
assert.ok(peak > 1, 'mapLimit never went parallel at all');

// Every item runs exactly once — an off-by-one in the claim counter would
// either skip the last item or run it twice.
const seen = new Set<number>();
let calls = 0;
await mapLimit(Array.from({ length: 50 }, (_, i) => i), 7, async (i) => { calls++; seen.add(i); });
assert.equal(calls, 50);
assert.equal(seen.size, 50);

// Degenerate inputs must not hang or throw.
assert.deepEqual(await mapLimit([], 5, async () => 1), []);
assert.deepEqual(await mapLimit([1], 0, async (n) => n * 2), [2]);
assert.deepEqual(await mapLimit([1, 2], 99, async (n) => n * 2), [2, 4]);

// ---- shouldRetireToken ----

// Dead tokens: stop retrying.
assert.equal(shouldRetireToken('UNREGISTERED', 404, 'not registered'), true);
assert.equal(shouldRetireToken('UNREGISTERED', 200, 'anything'), true);
assert.equal(shouldRetireToken(undefined, 404, 'Requested entity was not found'), true);
assert.equal(shouldRetireToken('INVALID_ARGUMENT', 400, 'The registration token is not a valid FCM token'), true);

// Our own bug, or a transient fault: keep the token and retry.
assert.equal(
  shouldRetireToken('INVALID_ARGUMENT', 400, 'Invalid JSON payload received'),
  false,
  'a malformed payload must not delete the user\'s device',
);
assert.equal(shouldRetireToken('UNAVAILABLE', 503, 'backend unavailable'), false);
assert.equal(shouldRetireToken('INTERNAL', 500, 'internal error'), false);
assert.equal(shouldRetireToken('QUOTA_EXCEEDED', 429, 'too many'), false);
assert.equal(shouldRetireToken(undefined, 401, 'auth failed'), false);

console.log('push: ok');
