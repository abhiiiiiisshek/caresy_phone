// Service prices aren't stored on bookings (payments aren't built yet — see
// DEVELOPER_HANDOFF.md §6-F), so this estimates revenue for the analytics
// dashboard from service_type + duration, mirroring the price rules already
// used in booking/page.tsx and quick-help/page.tsx (getServicePrice()).

interface PricedBooking {
  service_type: string;
  estimated_duration_minutes: number | null;
}

export function estimateBookingPrice(b: PricedBooking): number {
  if (b.service_type === 'MEDICINE_PICKUP') return 299;
  if (b.service_type === 'APPOINTMENT_ASSISTANCE' || b.service_type === 'SAFE_RETURN' || b.service_type === 'DIAGNOSTIC_TEST') return 899;
  if (b.estimated_duration_minutes != null && b.estimated_duration_minutes >= 480) return 1299;
  return 499;
}
