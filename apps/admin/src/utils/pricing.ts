// Revenue estimate for the analytics dashboard. Final amounts aren't stored on
// bookings yet, so this projects them from the booked duration using the same
// meter the customer sees (@caresy/utils/pricing) — no more hand-copied rules.
//
// Legacy wrinkle: bookings made before the duration ladder shipped carry
// estimated_duration_minutes of 240/480 from the old tier mapping; the meter
// prices those fine too. Evening surcharge is skipped here — created_at is not
// the start time, and analytics doesn't select scheduled_start_time.
import { priceForMinutes } from '@caresy/utils/pricing';

interface PricedBooking {
  service_type: string;
  estimated_duration_minutes: number | null;
}

export function estimateBookingPrice(b: PricedBooking): number {
  return Math.round(priceForMinutes(b.estimated_duration_minutes ?? 60) / 100); // whole rupees
}
