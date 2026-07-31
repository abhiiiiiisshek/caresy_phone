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
  EXTENSIONS, extensionSaving, CANCELLATION_PAISE, cancellationPaise,
  EVENING_SURCHARGE_PAISE, eveningSurchargePaise,
  priceForMinutes, billableMinutes, explainPrice, formatINR, upiPayUrl,
  runningTotalPaise,
} from './pricing.ts';

// Exact slab durations bill exactly the slab price — no overtime leaking in.
for (const s of SLABS) {
  assert.equal(priceForMinutes(s.minutes), s.paise, `${s.label} should bill ${s.paise}`);
}

// The rates Abhishek set on 2026-07-28. Wrong numbers here means wrong bills.
// Two slabs plus a meter — the intermediate durations are metered, not slabbed.
assert.equal(SLABS.length, 2, 'a third slab needs a reason a customer can hear');
assert.equal(priceForMinutes(60), 29_900, '1 hour');
assert.equal(priceForMinutes(120), 47_900, '2 hours = 299 + 45 min meter');
assert.equal(priceForMinutes(240), 95_900, '4 hours = 299 + 165 min meter');
assert.equal(priceForMinutes(480), 159_900, 'full day');
assert.equal(priceForMinutes(720), 249_900, '12 hours = full day + 225 min meter');

// The day rate must beat the meter before the day is out, or nobody would ever
// take it. It starts winning at 6h40m.
assert.ok(priceForMinutes(400) === 159_900, 'day rate should bind by 6h40m');
assert.ok(priceForMinutes(399) < 159_900);

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
assert.equal(explainPrice(240).slab.label, '1 hour', 'mid durations are metered off the first hour');
assert.equal(explainPrice(240).overtimeMinutes, 240 - 60 - GRACE_MINUTES);

// Once the day rate caps the bill, the receipt must say "Full day" with no
// overtime line — charging someone for 404 metered minutes they did not pay for
// is the fastest way to lose an argument about a bill that was actually fair.
assert.equal(explainPrice(479).slab.label, 'Full day');
assert.equal(explainPrice(479).overtimeMinutes, 0);
assert.equal(explainPrice(540).slab.label, 'Full day');
assert.equal(explainPrice(540).overtimeMinutes, 540 - 480 - GRACE_MINUTES);

// billableMinutes: null while running, never negative, rounds partial minutes up.
assert.equal(billableMinutes(null, null), null);
assert.equal(billableMinutes('2026-07-28T10:00:00Z', null), null, 'still in progress');
assert.equal(billableMinutes('2026-07-28T10:00:00Z', '2026-07-28T12:00:00Z'), 120);
assert.equal(billableMinutes('2026-07-28T10:00:00Z', '2026-07-28T11:00:30Z'), 61, 'partial minute rounds up');
assert.equal(billableMinutes('2026-07-28T12:00:00Z', '2026-07-28T10:00:00Z'), null, 'end before start');
assert.equal(billableMinutes('not-a-date', '2026-07-28T10:00:00Z'), null);

assert.equal(formatINR(159_900), '₹1,599');
assert.equal(formatINR(29_900), '₹299');

// EXTENSIONS. Two properties, both easy to break by editing a price by hand.
let prevRate = Infinity;
for (const e of EXTENSIONS) {
  const meter = e.minutes * OVERTIME_PAISE_PER_MINUTE;
  // Cheaper than letting the meter run, or nobody accepts the offer and the
  // bill shock these prevent comes straight back.
  assert.ok(e.paise < meter, `${e.label} costs more than the meter — nobody would extend`);
  assert.ok(extensionSaving(e) > 0, `${e.label} shows a negative saving`);
  // Longer must be cheaper per minute, or the decoy points the wrong way.
  const rate = e.paise / e.minutes;
  assert.ok(rate < prevRate, `${e.label} is not better value per minute than the option above it`);
  prevRate = rate;
}
assert.equal(EXTENSIONS.length, 3, 'the middle option stops being obvious past three');

// CANCELLATION. Fixed clock so the windows are checked, not the wall time.
const NOW = '2026-07-28T12:00:00Z';
const cancel = (o: Partial<Parameters<typeof cancellationPaise>[0]>) => cancellationPaise({
  isScheduled: false, companionDispatched: false,
  bookedAtIso: NOW, startsAtIso: null, nowIso: NOW, ...o,
});

// Scheduled: free at 6h notice, charged just inside it.
assert.equal(cancel({ isScheduled: true, startsAtIso: '2026-07-28T18:00:00Z' }), 0, 'exactly 6h is free');
assert.equal(cancel({ isScheduled: true, startsAtIso: '2026-07-28T23:00:00Z' }), 0);
assert.equal(cancel({ isScheduled: true, startsAtIso: '2026-07-28T17:59:00Z' }), CANCELLATION_PAISE);
assert.equal(cancel({ isScheduled: true, startsAtIso: '2026-07-28T12:30:00Z' }), CANCELLATION_PAISE);

// Urgent: free for 30 minutes after booking, charged after.
assert.equal(cancel({ bookedAtIso: '2026-07-28T11:59:00Z' }), 0);
assert.equal(cancel({ bookedAtIso: '2026-07-28T11:30:00Z' }), 0, 'exactly 30 min is free');
assert.equal(cancel({ bookedAtIso: '2026-07-28T11:29:00Z' }), CANCELLATION_PAISE);

// Dispatched beats every free window — the trip is already spent.
assert.equal(cancel({ companionDispatched: true, bookedAtIso: NOW }), CANCELLATION_PAISE,
  'dispatched must charge even inside the urgent grace');
assert.equal(cancel({ companionDispatched: true, isScheduled: true, startsAtIso: '2026-07-29T12:00:00Z' }),
  CANCELLATION_PAISE, 'dispatched must charge even a day early');

// Missing or unparseable timestamps must not invent a charge.
assert.equal(cancel({ isScheduled: true, startsAtIso: null }), 0);
assert.equal(cancel({ bookedAtIso: 'not-a-date' }), 0);

// EVENING SURCHARGE: 6pm inclusive to 8pm exclusive, local hours only.
assert.equal(eveningSurchargePaise(17), 0);
assert.equal(eveningSurchargePaise(18), EVENING_SURCHARGE_PAISE, '6pm start pays');
assert.equal(eveningSurchargePaise(19), EVENING_SURCHARGE_PAISE);
assert.equal(eveningSurchargePaise(20), 0, 'nothing starts at 8pm — no charge to invent');
assert.equal(eveningSurchargePaise(9), 0);

// UPI link: amount is 2dp rupees, and the payee/note survive encoding.
const url = upiPayUrl({ vpa: 'caresy@ybl', name: 'Caresy', paise: 99_900, ref: 'CR-1042' });
assert.ok(url.startsWith('upi://pay?'), url);
const p = new URLSearchParams(url.slice('upi://pay?'.length));
assert.equal(p.get('am'), '999.00', 'UPI amount must be 2dp rupees, not paise');
assert.equal(p.get('pa'), 'caresy@ybl');
assert.equal(p.get('cu'), 'INR');
assert.equal(p.get('tr'), 'CR-1042', 'reference rides into the bank narration');

// RUNNING TOTAL: the live meter both apps show mid-visit. It must agree with
// what complete_booking() will charge, or the meter becomes the thing customers
// argue with.
const START = '2026-07-31T10:00:00Z';
const at = (mins: number) => new Date(Date.parse(START) + mins * 60_000).toISOString();

assert.equal(runningTotalPaise(null, at(30)), null, 'no meter before Start is tapped');
assert.equal(runningTotalPaise(START, at(30))!.paise, priceForMinutes(30));
assert.equal(runningTotalPaise(START, at(30))!.minutes, 30);

// The meter must never disagree with the final bill for the same elapsed time —
// that mismatch is the whole reason this helper is shared instead of copied.
for (const m of [0, 1, 59, 60, 75, 76, 120, 240, 479, 480, 720]) {
  assert.equal(runningTotalPaise(START, at(m))!.paise, priceForMinutes(m),
    `meter at ${m} min must equal the bill for ${m} min`);
}

// Evening surcharge rides along, exactly as 26_BILLING.sql adds it.
assert.equal(runningTotalPaise(START, at(60), EVENING_SURCHARGE_PAISE)!.paise,
  priceForMinutes(60) + EVENING_SURCHARGE_PAISE, 'evening visit must include the ₹99');

// service_metadata is client-written, so only the one real surcharge counts.
// Anything else is a tampered or stale quote and must be ignored, matching the
// server's `IF v_evening NOT IN (0, 9900)` clamp.
for (const bogus of [1, 500_000, -9_900, 9_901, null]) {
  assert.equal(runningTotalPaise(START, at(60), bogus as number | null)!.paise,
    priceForMinutes(60), `surcharge ${bogus} must be clamped away, not billed`);
}

// Clock skew: a "now" before the start must not produce a negative meter.
assert.equal(runningTotalPaise(at(10), START), null, 'end before start yields no meter, not a negative one');

console.log(`pricing: ok (${SLABS.length} slabs, ₹${OVERTIME_PAISE_PER_MINUTE / 100}/min overtime, ${GRACE_MINUTES} min grace)`);
