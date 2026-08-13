// Shared booking status → customer-facing label contract.
//
// This mapping used to live inline in apps/website/src/app/my-bookings and was
// the source of the "raw ACCEPTED shown to customer" class of bug: the DB writes
// several status enums for the same customer-visible state (companion self-accept
// writes ACCEPTED, admin board writes ASSIGNED) and each surface re-derived the
// label on its own. One definition here, both apps import it — colors stay in
// the app (web = CSS tokens, native = hex) but the label + semantic class do not
// drift. See docs/CURRENT.md "timeline enum contract".

export type StatusClass = 'pending' | 'review' | 'assigned' | 'active' | 'completed';

export interface StatusInfo {
  label: string;
  cls: StatusClass;
}

export function getStatusInfo(status: string): StatusInfo {
  const s = status.toLowerCase();
  if (s === 'pending' || s === 'draft') return { label: 'Pending Assignment', cls: 'pending' };
  if (s.includes('review')) return { label: 'Under Review', cls: 'review' };
  // ACCEPTED (companion self-accept, migration 12) and ASSIGNED (admin board)
  // are the same customer-visible state: "Confirmed".
  if (s.includes('assigned') || s.includes('accepted')) return { label: 'Confirmed', cls: 'assigned' };
  if (s.includes('progress') || s === 'active') return { label: 'Active Visit', cls: 'active' };
  if (s === 'completed') return { label: 'Completed', cls: 'completed' };
  if (s === 'cancelled') return { label: 'Cancelled', cls: 'completed' };
  if (s === 'expired') return { label: 'Expired', cls: 'completed' };
  return { label: status, cls: 'pending' };
}

// Turn a raw enum (HOSPITAL_COMPANION) into a friendly label.
export function prettyService(raw: string): string {
  return raw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// A booking is "past" if it reached a terminal status OR its scheduled time has
// already elapsed. `now` is injectable so the self-check is deterministic.
export function isPastBooking(
  b: { status: string; scheduled_start_time: string | null },
  now: number = Date.now(),
): boolean {
  const s = b.status.toLowerCase();
  if (s === 'completed' || s === 'cancelled' || s === 'expired') return true;
  const when = b.scheduled_start_time ? new Date(b.scheduled_start_time).getTime() : null;
  return when !== null && when < now;
}
