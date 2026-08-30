// Self-check for notification retry policy (issue #11, migration 44).
//   node --experimental-strip-types src/app/api/cron/send-push/retry.check.ts
// from apps/website. Silence means pass.
//
// Policy: MAX_ATTEMPTS=5, backoff 5,10,20,40,60 minutes. After 5 failures the
// row stays FAILED permanently. Claim re-queues FAILED rows with
// attempts < 5 and next_retry_at <= now().

import { strict as assert } from 'node:assert';

// Mirror the helper in route.ts
const MAX_ATTEMPTS = 5;
function backoffMinutes(attempts: number): number {
  return Math.min(60, 5 * Math.pow(2, Math.max(0, attempts - 1)));
}
function nextRetryAt(attempts: number, nowMs: number = Date.now()): string {
  const mins = backoffMinutes(attempts);
  return new Date(nowMs + mins * 60_000).toISOString();
}

// Backoff is exponential, capped at 60
assert.equal(backoffMinutes(1), 5, 'attempt 1 -> 5m');
assert.equal(backoffMinutes(2), 10, 'attempt 2 -> 10m');
assert.equal(backoffMinutes(3), 20, 'attempt 3 -> 20m');
assert.equal(backoffMinutes(4), 40, 'attempt 4 -> 40m');
assert.equal(backoffMinutes(5), 60, 'attempt 5 -> 60m (cap)');
assert.equal(backoffMinutes(6), 60, 'beyond cap stays 60');
assert.equal(backoffMinutes(10), 60, 'far beyond cap stays 60');

// nextRetryAt is now + backoff
const fixedNow = Date.parse('2026-08-30T00:00:00.000Z');
assert.equal(nextRetryAt(1, fixedNow), '2026-08-30T00:05:00.000Z');
assert.equal(nextRetryAt(2, fixedNow), '2026-08-30T00:10:00.000Z');
assert.equal(nextRetryAt(5, fixedNow), '2026-08-30T01:00:00.000Z');

// Bounded: after MAX_ATTEMPTS, no more retry (claim clause: attempts < 5)
function isRetryEligible(attempts: number, nextRetryAtIso: string | null, nowIso: string): boolean {
  if (attempts >= MAX_ATTEMPTS) return false;
  if (nextRetryAtIso == null) return true;
  return nextRetryAtIso <= nowIso;
}

assert.equal(isRetryEligible(0, null, '2026-08-30T00:00:00Z'), true, 'new FAILED with no next_retry is eligible');
assert.equal(isRetryEligible(4, '2026-08-30T00:00:00Z', '2026-08-30T01:00:00Z'), true, 'attempt 4, backoff elapsed -> retry');
assert.equal(isRetryEligible(4, '2026-08-30T02:00:00Z', '2026-08-30T01:00:00Z'), false, 'attempt 4, backoff not yet elapsed -> wait');
assert.equal(isRetryEligible(5, null, '2026-08-30T00:00:00Z'), false, 'attempt 5 is final, never retry');
assert.equal(isRetryEligible(5, '2026-08-30T00:00:00Z', '2026-08-30T01:00:00Z'), false, 'attempt 5 even with past retry time is still final');

// Monotonic: later attempts never have smaller backoff
for (let a = 1; a < 10; a++) {
  assert.ok(backoffMinutes(a) >= backoffMinutes(a - 1), `backoff monotonic at ${a}`);
}

console.log('send-push retry: ok');
