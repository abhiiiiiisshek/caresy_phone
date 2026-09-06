import assert from 'node:assert';
import { classify } from './notificationPolicy.ts';

// Every known static event resolves as expected.
assert.deepStrictEqual(classify('BOOKING_CREATED'), { priority: 'CRITICAL', mode: 'IMMEDIATE' });
assert.deepStrictEqual(classify('BOOKING_CANCELLED'), { priority: 'CRITICAL', mode: 'IMMEDIATE' });
assert.deepStrictEqual(classify('ADMIN_STATUS_CANCELLED'), { priority: 'CRITICAL', mode: 'IMMEDIATE' });
assert.deepStrictEqual(classify('COMPANION_PENDING_APPROVAL'), { priority: 'IMPORTANT', mode: 'IMMEDIATE' });
assert.deepStrictEqual(classify('STATUS_ACCEPTED'), { priority: 'IMPORTANT', mode: 'IMMEDIATE' });
assert.deepStrictEqual(classify('TRIP_ARRIVED'), { priority: 'IMPORTANT', mode: 'IMMEDIATE' });

// Informational prefixes and exact matches buffer, keyed by role.
for (const event of ['STATUS_COMPLETED', 'STATUS_CANCELLED', 'STATUS_EXPIRED', 'TRIP_COMPLETED', 'TRIP_CANCELLED', 'CARE_EVENT_MED_GIVEN']) {
  const p = classify(event, 'CUSTOMER');
  assert.strictEqual(p.priority, 'INFORMATIONAL', `${event} should be INFORMATIONAL`);
  assert.strictEqual(p.mode, 'BUFFERED', `${event} should be BUFFERED`);
  assert.ok(p.aggregationKey, `${event} must carry an aggregationKey when buffered`);
}

// Same event + role always yields the same key (stability within a tick).
assert.strictEqual(
  classify('STATUS_COMPLETED', 'CUSTOMER').aggregationKey,
  classify('STATUS_EXPIRED', 'CUSTOMER').aggregationKey,
  'informational events for the same role must share one bucket',
);
assert.notStrictEqual(
  classify('STATUS_COMPLETED', 'CUSTOMER').aggregationKey,
  classify('STATUS_COMPLETED', 'ADMIN').aggregationKey,
  'different roles must not share a bucket',
);

// Unrecognized events fail open: sent individually, never silently dropped.
assert.deepStrictEqual(classify('SOMETHING_MADE_UP'), { priority: 'IMPORTANT', mode: 'IMMEDIATE' });

console.log('notificationPolicy.check.ts: all assertions passed');
