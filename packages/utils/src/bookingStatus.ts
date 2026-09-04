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

// ---- Live-tracking timeline contract (shared by web /tracking and native) ----

export interface TrackStep {
  title: string;
  desc: string;
}

// The trip stepper + which step is active for a given status. Returns only the
// steps reached so far (+ the active one), so the UI never shows future stages
// as if they were done. companionName is interpolated into the descriptions.
export interface TrackOpts {
  scheduled_start_time?: string | null;
  hasLocation?: boolean;
  tripStarted?: boolean;
  /** `trips.status` (16_TRIPS_AND_LIVE_TRACKING) when the booking has a live trip. */
  tripStatus?: string | null;
}

/**
 * Where `trips.status` lands on the four-step timeline, and what that step says.
 *
 * The booking row has one IN_PROGRESS covering pickup, the drive and arrival;
 * the trip row distinguishes them, and advance_trip_status() is the only thing
 * that writes it, so it is the honest source. Returns null for a status this
 * does not recognise, which sends the caller back to the booking-row path
 * rather than inventing a step.
 */
function stepFromTripStatus(trip: string, companionName: string): { idx: number; desc?: string } | null {
  switch (trip.toLowerCase()) {
    case 'assigned':          return { idx: 0 };
    case 'en_route_pickup':   return { idx: 1 };
    case 'picked_up':         return { idx: 2, desc: `${companionName} has met the patient and the visit has begun.` };
    case 'en_route_hospital': return { idx: 2, desc: `${companionName} is travelling to the hospital with the patient.` };
    case 'arrived':           return { idx: 2, desc: `${companionName} has arrived at the hospital with the patient.` };
    case 'completed':         return { idx: 3 };
    default:                  return null;   // 'cancelled', or an enum added later
  }
}

export function trackingSteps(
  status: string,
  companionName: string,
  opts?: TrackOpts,
): { steps: TrackStep[]; activeIdx: number } {
  const s = status.toLowerCase();
  const all: TrackStep[] = [
    { title: 'Booking Confirmed', desc: `${companionName} has been assigned to your visit.` },
    { title: 'Companion En Route', desc: `${companionName} is on the way to your location.` },
    { title: 'Visit In Progress', desc: `${companionName} is with the patient at the hospital.` },
    { title: 'Visit Completed', desc: 'Medicines collected and patient safely returned.' },
  ];

  // A live trip outranks the booking row: it is finer-grained and it is what
  // the companion is actually tapping through.
  const fromTrip = opts?.tripStatus ? stepFromTripStatus(opts.tripStatus, companionName) : null;
  if (fromTrip) {
    if (fromTrip.desc) all[fromTrip.idx] = { ...all[fromTrip.idx], desc: fromTrip.desc };
    return { steps: all.slice(0, Math.max(fromTrip.idx + 1, 2)), activeIdx: fromTrip.idx };
  }

  let activeIdx = 1;
  if (s.includes('assigned') || s.includes('accepted')) {
    // When caller supplies location context, stay at "Confirmed" until trip
    // actually starts. Without opts (legacy call site + self-check), keep 1
    // so the existing check stays green.
    if (opts) {
      const enRoute = !!(opts.tripStarted || opts.hasLocation);
      activeIdx = enRoute ? 1 : 0;
    } else {
      activeIdx = 1;
    }
  } else if (s.includes('progress') || s === 'active') activeIdx = 2;
  else if (s === 'completed') activeIdx = 3;
  return { steps: all.slice(0, Math.max(activeIdx + 1, 2)), activeIdx };
}

export function trackingHeadline(
  status: string,
  opts?: TrackOpts,
): string {
  const s = status.toLowerCase();

  // Same precedence as trackingSteps: the trip knows where the companion is.
  const trip = opts?.tripStatus?.toLowerCase();
  switch (trip) {
    case 'en_route_pickup':   return 'Your companion is on the way';
    case 'picked_up':         return 'Your companion is with the patient';
    case 'en_route_hospital': return 'On the way to the hospital';
    case 'arrived':           return 'Arrived at the hospital';
    case 'completed':         return 'Visit completed';
  }

  if (s.includes('assigned') || s.includes('accepted')) {
    // A trip sitting at 'assigned' has not left yet, whatever coordinates the
    // companion's phone has already sent. Drop the location guess and let the
    // scheduled-time wording below answer instead — it is the difference
    // between "on the way" and "assigned for Saturday".
    if (trip === 'assigned') {
      opts = { ...opts, hasLocation: false, tripStarted: false };
    }
    // Legacy call site (no opts) keeps the pre-honesty-fix string so old
    // callers and the bare self-check stay green.
    if (!opts) return 'Your companion is on the way';
    if (opts.tripStarted || opts.hasLocation) return 'Your companion is on the way';
    if (opts.scheduled_start_time) {
      const when = new Date(opts.scheduled_start_time);
      if (!isNaN(when.getTime())) {
        const now = new Date();
        const startOfTomorrow = new Date(now);
        startOfTomorrow.setHours(0, 0, 0, 0);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        // Future booking (tomorrow+) -> show assigned with date, not "on the way"
        if (when.getTime() >= startOfTomorrow.getTime()) {
          const label = when.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
          return `Companion assigned for ${label}`;
        }
      }
    }
    // Today / instant booking (no scheduled_start_time) / imminent, but the
    // trip hasn't actually started — the case this whole fix exists for.
    return 'Companion assigned — location will be shared when trip starts';
  }
  if (s.includes('progress') || s === 'active') return 'Your companion is with the patient';
  if (s === 'completed') return 'Visit completed';
  return 'Finding your companion';
}
