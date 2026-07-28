// Self-check for the billing rules. No framework, no network:
//   node --experimental-strip-types src/pricing.check.ts
// from packages/utils. Silence means pass.
//
// This is the money path, so the properties matter more than the examples:
// monotonicity and no-underbooking-arbitrage are what stop a customer paying
// less by gaming the slab they book.

import { strict as assert } from 'node:assert';
import {
  SLABS, GRACE_MINUTES, OVERTIME_PAISE_PER_MINUTE,
  priceForMinutes, billableMinutes, explainPrice, formatINR, upiPayUrl,
} from './pricing.ts';

// Exact slab durations bill exactly the slab price — no overtime leaking in.
for (const s of SLABS) {
  assert.equal(priceForMinutes(s.minutes), s.paise, `${s.label} should bill ${s.paise}`);
}

// The rates Abhishek set on 2026-07-28. Wrong numbers here means wrong bills.
assert.equal(priceForMinutes(60), 29_900);
assert.equal(priceForMinutes(120), 49_900);
assert.equal(priceForMinutes(240), 99_900);
assert.equal(priceForMinutes(480), 159_900);

// Grace: 15 minutes past a slab is free, minute 16 is not.
assert.equal(priceForMinutes(60 + GRACE_MINUTES), 29_900, 'grace must be free');
assert.equal(priceForMinutes(60 + GRACE_MINUTES + 1), 29_900 + OVERTIME_PAISE_PER_MINUTE);

// Under an hour still bills the minimum — a 10-minute visit is not ₹30.
assert.equal(priceForMinutes(0), 29_900);
assert.equal(priceForMinutes(10), 29_900);
assert.equal(priceForMinutes(-5), 29_900, 'clock skew must not produce a negative bill');

// MONOTONIC: more time can never cost less. Checked minute by minute out to 15h.
let prev = -1;
for (let m = 0; m <= 900; m++) {
  const p = priceForMinutes(m);
  assert.ok(p >= prev, `price fell at ${m} min: ${prev} -> ${p}`);
  assert.ok(Number.isInteger(p), `non-integer paise at ${m} min: ${p}`);
  prev = p;
}

// SLABS BIND FROM BELOW. The bug this guards: pricing as "cheapest slab +
// overtime" let the 1-hour slab undercut every longer one, because overtime is
// cheaper per hour than any slab. Four hours must bill ₹999, never ₹299 + 165
// minutes of overtime.
for (const s of SLABS) {
  const cheapestOvertimeRoute = Math.min(
    ...SLABS.filter((o) => o.minutes < s.minutes)
      .map((o) => o.paise + (s.minutes - o.minutes - GRACE_MINUTES) * OVERTIME_PAISE_PER_MINUTE),
    Infinity,
  );
  assert.equal(priceForMinutes(s.minutes), s.paise, `${s.label} must bill its own slab price`);
  if (cheapestOvertimeRoute < s.paise) {
    assert.notEqual(priceForMinutes(s.minutes), cheapestOvertimeRoute,
      `${s.label} undercut by a shorter slab + overtime — the ladder has collapsed`);
  }
}

// CAPPED FROM ABOVE. Without this, 7h59m on the 4-hour slab bills more than
// 8h00m does, so staying longer would cost less.
assert.equal(priceForMinutes(479), 159_900, '7h59m must be capped at the 8-hour price');
assert.ok(priceForMinutes(479) <= priceForMinutes(480));

// Boundary jumps stay small enough to explain on a phone call.
assert.ok(priceForMinutes(239) < priceForMinutes(240), '3h59m should be cheaper than 4h');
assert.ok(priceForMinutes(240) - priceForMinutes(239) < 15_000, 'boundary jump too steep');

// Past the top slab there is nothing left to cap against — overtime runs on.
assert.equal(priceForMinutes(480 + GRACE_MINUTES + 60), 159_900 + 60 * OVERTIME_PAISE_PER_MINUTE);

// explainPrice agrees with priceForMinutes and picks a defensible slab.
for (let m = 0; m <= 900; m += 7) {
  assert.equal(explainPrice(m).paise, priceForMinutes(m), `explainPrice disagrees at ${m} min`);
}
assert.equal(explainPrice(60).slab.label, '1 hour');
assert.equal(explainPrice(240).slab.label, '4 hours');
assert.equal(explainPrice(300).overtimeMinutes, 300 - 240 - GRACE_MINUTES);

// billableMinutes: null while running, never negative, rounds partial minutes up.
assert.equal(billableMinutes(null, null), null);
assert.equal(billableMinutes('2026-07-28T10:00:00Z', null), null, 'still in progress');
assert.equal(billableMinutes('2026-07-28T10:00:00Z', '2026-07-28T12:00:00Z'), 120);
assert.equal(billableMinutes('2026-07-28T10:00:00Z', '2026-07-28T11:00:30Z'), 61, 'partial minute rounds up');
assert.equal(billableMinutes('2026-07-28T12:00:00Z', '2026-07-28T10:00:00Z'), null, 'end before start');
assert.equal(billableMinutes('not-a-date', '2026-07-28T10:00:00Z'), null);

assert.equal(formatINR(159_900), '₹1,599');
assert.equal(formatINR(29_900), '₹299');

// UPI link: amount is 2dp rupees, and the payee/note survive encoding.
const url = upiPayUrl({ vpa: 'caresy@ybl', name: 'Caresy', paise: 99_900, ref: 'CR-1042' });
assert.ok(url.startsWith('upi://pay?'), url);
const p = new URLSearchParams(url.slice('upi://pay?'.length));
assert.equal(p.get('am'), '999.00', 'UPI amount must be 2dp rupees, not paise');
assert.equal(p.get('pa'), 'caresy@ybl');
assert.equal(p.get('cu'), 'INR');
assert.equal(p.get('tr'), 'CR-1042', 'reference rides into the bank narration');

console.log(`pricing: ok (${SLABS.length} slabs, ₹${OVERTIME_PAISE_PER_MINUTE / 100}/min overtime, ${GRACE_MINUTES} min grace)`);
