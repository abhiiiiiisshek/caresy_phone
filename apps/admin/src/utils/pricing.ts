// Revenue per completed booking, in whole rupees, for the analytics dashboard.
//
// Prefers the real bill: since 26_BILLING.sql, complete_booking() writes
// final_amount_paise off the server clock, and that is what was actually
// charged. Only bookings completed before billing shipped — or moved to
// COMPLETED by an admin status change rather than the companion's Complete
// button — have no amount. Those fall back to projecting the booked duration
// through the same meter the customer sees (@caresy/utils/pricing).
//
// Legacy wrinkle in the fallback: bookings made before the duration ladder
// shipped carry estimated_duration_minutes of 240/480 from the old tier mapping;
// the meter prices those fine too. Evening surcharge is skipped — created_at is
// not the start time, and analytics doesn't select scheduled_start_time.
import { priceForMinutes } from '@caresy/utils/pricing';

interface PricedBooking {
  service_type: string;
  estimated_duration_minutes: number | null;
  final_amount_paise?: number | null;
}

export function bookingRevenueRupees(b: PricedBooking): number {
  const paise = b.final_amount_paise ?? priceForMinutes(b.estimated_duration_minutes ?? 60);
  return Math.round(paise / 100); // whole rupees
}

/** True when the number above is a real bill rather than a projection. */
export function isBilled(b: PricedBooking): boolean {
  return b.final_amount_paise != null;
}
