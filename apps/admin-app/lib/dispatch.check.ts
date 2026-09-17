// Self-check for the dispatch board's decision rules.
//   node --experimental-strip-types lib/dispatch.check.ts
// from apps/admin-app. Silence means pass.
//
// The properties that matter are not the individual examples:
//   1. every booking lands in exactly one bucket, for every status (the admin
//      board's historical bug was rows falling through into no column);
//   2. urgency only ever rises as the clock advances on an unassigned request —
//      a card must never quietly go calm while nobody is on it;
//   3. sortForBoard puts every critical card above every non-critical one.

import { strict as assert } from 'node:assert';
import { bucketOf, urgency, sortForBoard, relTime, pretty, type AdminBooking } from './dispatch.ts';

const NOW = Date.parse('2026-09-16T10:00:00.000Z');
const min = (n: number) => n * 60_000;
const at = (offsetMin: number) => new Date(NOW + min(offsetMin)).toISOString();

function booking(over: Partial<AdminBooking> = {}): AdminBooking {
  return {
    id: 'b1', reference_code: 'CR-0001', status: 'PENDING',
    created_at: at(0), scheduled_start_time: null, expires_at: null,
    service_type: 'HOSPITAL_COMPANION', booking_type: 'INSTANT', transport_mode: null,
    special_instructions: null, companion_user_id: null, final_amount_paise: null,
    ...over,
  };
}

const ALL_STATUSES = ['DRAFT', 'PENDING', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
const BUCKETS = ['action', 'upcoming', 'active', 'done'];

// 1. Total coverage: every status × assigned/unassigned × scheduled/instant
// produces a real bucket. Nothing vanishes from the board.
for (const status of ALL_STATUSES) {
  for (const companion of [null, 'c1']) {
    for (const start of [null, at(-30), at(90)]) {
      const b = booking({ status, companion_user_id: companion, scheduled_start_time: start });
      const got = bucketOf(b, NOW);
      assert.ok(BUCKETS.includes(got), `${status}/${companion}/${start} produced ${got}`);
    }
  }
}

// Terminal statuses are done even if someone left a companion on them.
assert.equal(bucketOf(booking({ status: 'CANCELLED', companion_user_id: 'c1' }), NOW), 'done');
// Unassigned outranks a future start time: the desk still has to staff it.
assert.equal(bucketOf(booking({ status: 'ASSIGNED', scheduled_start_time: at(120) }), NOW), 'action');
assert.equal(bucketOf(booking({ status: 'ASSIGNED', companion_user_id: 'c1', scheduled_start_time: at(120) }), NOW), 'upcoming');
// A staffed visit whose start has passed is live work, not "upcoming".
assert.equal(bucketOf(booking({ status: 'ASSIGNED', companion_user_id: 'c1', scheduled_start_time: at(-10) }), NOW), 'active');
assert.equal(bucketOf(booking({ status: 'IN_PROGRESS', companion_user_id: 'c1', scheduled_start_time: at(120) }), NOW), 'active');

// 2. Monotonic escalation: as an unassigned request ages, urgency never falls.
const rank = { calm: 0, warn: 1, critical: 2 } as const;
let previous = 0;
for (let age = 0; age <= 60; age += 1) {
  const got = rank[urgency(booking({ created_at: at(-age) }), NOW)];
  assert.ok(got >= previous, `urgency dropped at age ${age}m (${got} < ${previous})`);
  previous = got;
}
assert.equal(urgency(booking({ created_at: at(0) }), NOW), 'calm');
assert.equal(urgency(booking({ created_at: at(-6) }), NOW), 'warn');
assert.equal(urgency(booking({ created_at: at(-20) }), NOW), 'critical');

// Imminent expiry is critical even on a request placed seconds ago.
assert.equal(urgency(booking({ created_at: at(0), expires_at: at(10) }), NOW), 'critical');
// An unassigned visit starting within the hour is critical however fresh it is.
assert.equal(urgency(booking({ created_at: at(0), scheduled_start_time: at(30) }), NOW), 'critical');
// Same visit a week out is not an emergency.
assert.equal(urgency(booking({ created_at: at(0), scheduled_start_time: at(60 * 24 * 7) }), NOW), 'calm');

// Staffed work is calm; staffed-but-overdue is a warning, never silent.
assert.equal(urgency(booking({ status: 'IN_PROGRESS', companion_user_id: 'c1', created_at: at(-600) }), NOW), 'calm');
assert.equal(urgency(booking({ status: 'ASSIGNED', companion_user_id: 'c1', scheduled_start_time: at(-20) }), NOW), 'warn');
// Terminal rows never shout, however stale.
for (const status of ['COMPLETED', 'CANCELLED', 'EXPIRED']) {
  assert.equal(urgency(booking({ status, created_at: at(-10_000) }), NOW), 'calm', `${status} must be calm`);
}

// 3. Sorting: no calm or warn card may sit above a critical one.
const board = sortForBoard([
  booking({ id: 'calm', created_at: at(0) }),
  booking({ id: 'crit', created_at: at(-40) }),
  booking({ id: 'warn', created_at: at(-7) }),
  booking({ id: 'crit2', created_at: at(0), expires_at: at(5) }),
], NOW);
// Loudest first, so the rank used for ordering is the inverse of the one used
// for escalation above.
const loudestFirst = { critical: 0, warn: 1, calm: 2 } as const;
const order = board.map((b) => loudestFirst[urgency(b, NOW)]);
assert.deepEqual([...order].sort((a, b) => a - b), order, `board out of order: ${board.map((b) => b.id)}`);

// Within the same urgency, the newest request is on top — the operator works
// down from what just came in.
const twoCritical = sortForBoard([
  booking({ id: 'older', created_at: at(-90) }),
  booking({ id: 'newer', created_at: at(-40) }),
], NOW);
assert.deepEqual(twoCritical.map((b) => b.id), ['newer', 'older']);

// Upcoming staffed visits sort by soonest start, not by when they were booked.
const upcoming = sortForBoard([
  booking({ id: 'later', companion_user_id: 'c1', status: 'ASSIGNED', created_at: at(-300), scheduled_start_time: at(600) }),
  booking({ id: 'sooner', companion_user_id: 'c1', status: 'ASSIGNED', created_at: at(-10), scheduled_start_time: at(120) }),
], NOW);
assert.deepEqual(upcoming.map((b) => b.id), ['sooner', 'later']);

// relTime reads in both directions and never leaks a raw date.
assert.equal(relTime(at(40), NOW), 'in 40m');
assert.equal(relTime(at(-40), NOW), '40m ago');
assert.equal(relTime(at(0), NOW), 'now');
assert.equal(relTime(at(120), NOW), 'in 2h');
assert.equal(relTime(at(-150), NOW), '2h 30m ago');
assert.equal(relTime(null, NOW), '');
assert.equal(relTime('not a date', NOW), '');

assert.equal(pretty('HOSPITAL_COMPANION'), 'Hospital companion');
assert.equal(pretty(null), '');

console.log('dispatch: ok');
