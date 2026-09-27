// Self-check for motion arithmetic. Silence means pass.
//   node --experimental-strip-types lib/motionMath.check.ts
import assert from 'node:assert/strict';

import { backoffMs, holdFor, staggerDelay } from './motionMath.ts';

/* staggerDelay */
assert.equal(staggerDelay(0), 0, 'first child never waits');
assert.equal(staggerDelay(3), 168, '3 * 56ms cadence');
assert.equal(staggerDelay(-2), 0, 'negative index clamps to first');
assert.equal(staggerDelay(4, true), 0, 'Reduce Motion removes the cadence entirely');

// Property: monotonic non-decreasing, and bounded by the cap — a 500-row list
// must never schedule a delay longer than an 8-row one.
let prev = -1;
for (let i = 0; i < 500; i++) {
  const d = staggerDelay(i);
  assert.ok(d >= prev, `cadence must not go backwards at ${i}`);
  assert.ok(d <= 7 * 56, `cadence must stay capped at ${i}`);
  prev = d;
}

/* backoffMs */
// Property: with jitter pinned to its extremes, every attempt stays inside
// [exp/2, exp] and never exceeds the ceiling.
for (let a = 0; a < 20; a++) {
  const lo = backoffMs(a, 400, 8000, () => 0);
  const hi = backoffMs(a, 400, 8000, () => 1);
  const exp = Math.min(400 * 2 ** a, 8000);
  assert.equal(lo, Math.round(exp / 2), `low jitter is half the window at ${a}`);
  assert.equal(hi, exp, `full jitter reaches the window at ${a}`);
  assert.ok(hi <= 8000, `ceiling holds at ${a}`);
}
// Property: monotonic until the ceiling, so a flaky link backs off rather than
// oscillating.
for (let a = 1; a < 5; a++) {
  assert.ok(backoffMs(a, 400, 8000, () => 0) > backoffMs(a - 1, 400, 8000, () => 0), `backoff grows at ${a}`);
}
assert.equal(backoffMs(99, 400, 8000, () => 0), 4000, 'huge attempt counts saturate, never overflow');

/* holdFor */
assert.equal(holdFor(null), 0, 'a state never shown needs no hold');
assert.equal(holdFor(90), 260, 'a 90ms flash is held out to the 350ms floor');
assert.equal(holdFor(350), 0, 'exactly at the floor releases immediately');
assert.equal(holdFor(5000), 0, 'a long load never gets held further');
