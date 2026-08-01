/**
 * Self-check for slot availability.
 *
 *   node --experimental-strip-types src/slots.check.ts
 *
 * Silence means pass. Properties, not examples: the list only ever shrinks as
 * the day goes on, and a slot inside the lead window is never offered.
 */
import assert from 'node:assert/strict';
import { availableSlots, TIME_SLOTS, MIN_LEAD_MINUTES } from './slots.ts';

const DAY = '2026-08-01';
const at = (hhmm: string) => new Date(`${DAY}T${hhmm}:00`);

// A future date is untouched, whatever time it is today.
assert.deepEqual(availableSlots('2026-08-02', at('23:30')), [...TIME_SLOTS]);

// Early morning: the whole day is still ahead.
assert.deepEqual(availableSlots(DAY, at('06:00')), [...TIME_SLOTS]);

// After the last slot there is nothing left, which is what makes the form say
// "pick tomorrow" instead of offering a visit that already happened.
assert.deepEqual(availableSlots(DAY, at('19:30')), []);

// A past date is never bookable.
assert.deepEqual(availableSlots('2026-07-31', at('06:00')), []);

// The lead window is honoured exactly: at 08:00 the 09:00 slot is exactly one
// hour out and still allowed; a minute later it is not.
assert.ok(availableSlots(DAY, at('08:00')).includes('09:00'), 'slot exactly at the cutoff stands');
assert.ok(!availableSlots(DAY, at('08:01')).includes('09:00'), 'slot inside the lead window is gone');

// No offered slot is ever within MIN_LEAD_MINUTES of now — the property the
// whole function exists to hold.
for (const hour of ['06:00', '09:15', '12:00', '15:45', '18:20']) {
  const now = at(hour);
  for (const slot of availableSlots(DAY, now)) {
    const lead = (at(slot).getTime() - now.getTime()) / 60_000;
    assert.ok(lead >= MIN_LEAD_MINUTES, `${slot} offered at ${hour} with only ${lead} min notice`);
  }
}

// Monotonic: availability only shrinks as the day goes on. A slot that has
// dropped off must never come back.
let previous = availableSlots(DAY, at('06:00'));
for (const hour of ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']) {
  const current = availableSlots(DAY, at(hour));
  assert.ok(current.length <= previous.length, `availability grew at ${hour}`);
  for (const slot of current) {
    assert.ok(previous.includes(slot), `${slot} reappeared at ${hour}`);
  }
  previous = current;
}

// Every result is a real slot, in the original order.
const ordered = availableSlots(DAY, at('11:00'));
assert.deepEqual(ordered, TIME_SLOTS.filter((t) => ordered.includes(t)));
