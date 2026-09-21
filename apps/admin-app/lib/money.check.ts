// Self-check for the payment ledger totals and the analytics aggregate.
//   node --experimental-strip-types lib/money.check.ts
//
// Properties that matter:
//   1. money is only ever counted once, and only in the bucket it belongs to;
//   2. "today" is the operator's local day, and an untimestamped collection is
//      never claimed as today's takings;
//   3. revenue counts completed work only, and says how much of it is guessed.

import { strict as assert } from 'node:assert';
import {
  adminStats, paymentTotals, startOfToday,
  type AnalyticsBooking, type PaymentRow,
} from './money.ts';

const NOW = new Date('2026-09-18T15:00:00').getTime(); // local time on purpose
const iso = (t: number) => new Date(t).toISOString();
const HOUR = 3_600_000;

const pay = (over: Partial<PaymentRow> = {}): PaymentRow => ({
  id: 'p1', reference_code: 'CRS-1', payment_status: 'PENDING', payment_method: null,
  final_amount_paise: 50_000, billed_minutes: 60, collected_at: null, actual_end_time: null,
  patient: null,
  ...over,
});

// 1. Each row lands in exactly one total; waived money is owed by nobody.
const rows: PaymentRow[] = [
  pay({ id: 'a', payment_status: 'PENDING', final_amount_paise: 30_000 }),
  pay({ id: 'b', payment_status: 'PENDING', final_amount_paise: 20_000 }),
  pay({ id: 'c', payment_status: 'COLLECTED', final_amount_paise: 40_000, collected_at: iso(NOW - HOUR) }),
  pay({ id: 'd', payment_status: 'COLLECTED', final_amount_paise: 10_000, collected_at: iso(NOW - 48 * HOUR) }),
  pay({ id: 'e', payment_status: 'WAIVED', final_amount_paise: 90_000 }),
];
const t = paymentTotals(rows, NOW);
assert.equal(t.pendingPaise, 50_000);
assert.equal(t.pendingCount, 2);
assert.equal(t.collectedPaise, 50_000);
assert.equal(t.todayPaise, 40_000);          // yesterday's 100 is not today's
assert.ok(t.collectedPaise >= t.todayPaise); // today can never exceed all time

// 2. Local midnight, and a missing timestamp is not today.
assert.ok(startOfToday(NOW) <= NOW);
assert.equal(new Date(startOfToday(NOW)).getHours(), 0);
assert.equal(paymentTotals([pay({ payment_status: 'COLLECTED', collected_at: null })], NOW).todayPaise, 0);
// A row with no amount contributes nothing but still counts as unpaid work.
const noAmount = paymentTotals([pay({ final_amount_paise: null })], NOW);
assert.equal(noAmount.pendingPaise, 0);
assert.equal(noAmount.pendingCount, 1);
assert.deepEqual(paymentTotals([], NOW), { pendingPaise: 0, pendingCount: 0, todayPaise: 0, collectedPaise: 0 });

// 3. Revenue: completed only, billed preferred, projections counted.
const book = (over: Partial<AnalyticsBooking> = {}): AnalyticsBooking => ({
  status: 'COMPLETED', estimated_duration_minutes: 60, final_amount_paise: null, created_at: iso(NOW - HOUR),
  ...over,
});
const stats = adminStats(
  [
    book({ status: 'COMPLETED', final_amount_paise: 60_000 }),
    book({ status: 'COMPLETED', final_amount_paise: null }),      // projected
    book({ status: 'PENDING', final_amount_paise: 99_999_00, created_at: iso(NOW - 48 * HOUR) }),
    book({ status: 'CANCELLED', created_at: iso(NOW - 48 * HOUR) }),
  ],
  [
    { approval_status: 'APPROVED', is_online: true },
    { approval_status: 'APPROVED', is_online: false },
    { approval_status: 'PENDING_REVIEW', is_online: true },
  ],
  NOW,
);
assert.equal(stats.totalBookings, 4);
assert.equal(stats.todayBookings, 2);
assert.equal(stats.byStatus.COMPLETED, 2);
assert.equal(stats.projectedCount, 1);
assert.equal(stats.approvedCompanions, 2);
assert.equal(stats.onlineCompanions, 1);     // online but unapproved is not supply
assert.ok(stats.revenue >= 600, 'billed amount must be counted in full');
// A pending booking's amount never reaches revenue, however large.
assert.ok(stats.revenue < 99_999, 'only completed work is revenue');

console.log('money: ok');
