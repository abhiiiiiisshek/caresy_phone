import assert from 'node:assert';

import { istSlotToDate } from './bookingTime.ts';

// A 10:00 slot is 04:30 UTC, full stop — not a function of the booking device.
assert.equal(istSlotToDate('2026-11-05', '10:00').toISOString(), '2026-11-05T04:30:00.000Z');

// The evening slot this app charges a surcharge for must not drift across the
// 18:00 boundary that eveningSurchargePaise() keys on.
assert.equal(istSlotToDate('2026-11-05', '18:00').toISOString(), '2026-11-05T12:30:00.000Z');

// Property: identical for every TZ the process could be running in. This is
// the whole bug — the old `new Date(`${d}T${t}:00`)` failed exactly here.
const expected = istSlotToDate('2026-11-05', '09:00').toISOString();
for (const tz of ['UTC', 'Asia/Kolkata', 'America/New_York', 'Asia/Dubai', 'Pacific/Kiritimati']) {
  process.env.TZ = tz;
  assert.equal(istSlotToDate('2026-11-05', '09:00').toISOString(), expected, `drifted in ${tz}`);
}

// Property: a later slot on the same day is always a later instant.
const slots = ['09:00', '10:00', '11:30', '13:00', '14:30', '16:00', '17:00', '18:00', '19:00'];
for (let i = 1; i < slots.length; i++) {
  assert.ok(
    istSlotToDate('2026-11-05', slots[i]).getTime() > istSlotToDate('2026-11-05', slots[i - 1]).getTime(),
    `${slots[i]} should be after ${slots[i - 1]}`,
  );
}

// Property: the same slot tomorrow is exactly 24h after today's.
assert.equal(
  istSlotToDate('2026-11-06', '13:00').getTime() - istSlotToDate('2026-11-05', '13:00').getTime(),
  86_400_000,
);
