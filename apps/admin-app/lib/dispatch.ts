import type { BookingStatus } from '@caresy/types';

// The desk's decision rules, kept pure so dispatch.check.ts can cover them.
// Everything the board sorts, groups or colours by is decided here; the screens
// only render what these functions return.

export interface AdminBooking {
  id: string;
  reference_code: string | null;
  status: BookingStatus | string;
  created_at: string;
  scheduled_start_time: string | null;
  expires_at: string | null;
  service_type: string | null;
  booking_type: string | null;
  transport_mode: string | null;
  special_instructions: string | null;
  companion_user_id: string | null;
  final_amount_paise: number | null;
  patient?: { full_name: string | null; age: number | null; emergency_contact_phone: string | null } | null;
  pickup_location?: { title: string | null; address_line_1: string | null } | null;
}

export const BOOKING_SELECT = `
  id,
  reference_code,
  status,
  created_at,
  scheduled_start_time,
  expires_at,
  service_type,
  booking_type,
  transport_mode,
  special_instructions,
  companion_user_id,
  final_amount_paise,
  patient:patients ( full_name, age, emergency_contact_phone ),
  pickup_location:locations!pickup_location_id ( title, address_line_1 )
`;

export type Bucket = 'action' | 'upcoming' | 'active' | 'done';
export type Urgency = 'critical' | 'warn' | 'calm';

export const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'action', label: 'Needs action' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
];

const TERMINAL = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

/**
 * Which column a booking belongs in. Every status lands in exactly one bucket —
 * the admin website's board once dropped ACCEPTED and EXPIRED rows entirely and
 * accepted jobs vanished from dispatch, so the default here is "action", never
 * "nowhere".
 */
export function bucketOf(b: Pick<AdminBooking, 'status' | 'companion_user_id' | 'scheduled_start_time'>, now = Date.now()): Bucket {
  const s = String(b.status).toUpperCase();
  if (TERMINAL.includes(s)) return 'done';
  if (s === 'IN_PROGRESS') return 'active';
  // No companion yet is always the desk's problem, whatever the status says.
  if (!b.companion_user_id) return 'action';
  const start = b.scheduled_start_time ? new Date(b.scheduled_start_time).getTime() : null;
  if (start !== null && start > now) return 'upcoming';
  return 'active';
}

const MIN = 60_000;

/**
 * How loudly a card should shout.
 *
 * Two clocks matter and they are different: an unassigned request ages from
 * when it was placed (and dies at expires_at), while an assigned-but-unstarted
 * visit is judged against when it is due to begin. Anything already staffed and
 * running is calm — noise there trains the operator to ignore the colour.
 */
export function urgency(b: Pick<AdminBooking, 'status' | 'companion_user_id' | 'created_at' | 'scheduled_start_time' | 'expires_at'>, now = Date.now()): Urgency {
  const s = String(b.status).toUpperCase();
  if (TERMINAL.includes(s)) return 'calm';

  if (!b.companion_user_id) {
    // About to expire outranks everything: past this point the request is lost.
    const expires = b.expires_at ? new Date(b.expires_at).getTime() : null;
    if (expires !== null && expires - now <= 15 * MIN) return 'critical';
    // A scheduled visit with nobody on it, starting soon.
    const start = b.scheduled_start_time ? new Date(b.scheduled_start_time).getTime() : null;
    if (start !== null && start - now <= 60 * MIN) return 'critical';
    const age = now - new Date(b.created_at).getTime();
    if (age >= 15 * MIN) return 'critical';
    if (age >= 5 * MIN) return 'warn';
    if (start !== null && start - now <= 3 * 60 * MIN) return 'warn';
    return 'calm';
  }

  // Staffed but not started, and the start time has come and gone.
  const start = b.scheduled_start_time ? new Date(b.scheduled_start_time).getTime() : null;
  if (s !== 'IN_PROGRESS' && start !== null && start <= now) return 'warn';
  return 'calm';
}

/** Sort key: loudest first, then by whichever clock is running on that card. */
export function sortForBoard(list: AdminBooking[], now = Date.now()): AdminBooking[] {
  const rank: Record<Urgency, number> = { critical: 0, warn: 1, calm: 2 };
  return [...list].sort((a, b) => {
    const byUrgency = rank[urgency(a, now)] - rank[urgency(b, now)];
    if (byUrgency !== 0) return byUrgency;
    const key = (x: AdminBooking) =>
      bucketOf(x, now) === 'upcoming' && x.scheduled_start_time
        ? new Date(x.scheduled_start_time).getTime()        // soonest start first
        : -new Date(x.created_at).getTime();                 // newest request first
    return key(a) - key(b);
  });
}

/**
 * "in 40m", "2h ago", "now". One function for both directions so a card that
 * crosses its own deadline just flips sign instead of changing vocabulary.
 */
export function relTime(iso: string | null, now = Date.now()): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = t - now;
  const ahead = diff >= 0;
  const mins = Math.round(Math.abs(diff) / MIN);
  if (mins < 1) return 'now';
  const body = mins < 60
    ? `${mins}m`
    : mins < 1440
      ? `${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ''}`.trim()
      : `${Math.round(mins / 1440)}d`;
  return ahead ? `in ${body}` : `${body} ago`;
}

/** Enum → sentence case, e.g. HOSPITAL_COMPANION → "Hospital companion". */
export function pretty(raw: string | null | undefined): string {
  if (!raw) return '';
  const s = raw.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const TRANSPORT_LABEL: Record<string, string> = {
  CUSTOMER_ARRANGED: 'Family arranges the ride',
  COMPANION_ARRANGED: 'Companion books a cab',
  CUSTOMER_VEHICLE: 'Companion drives',
};

/** Statuses an admin may set by hand, in lifecycle order. */
export const STATUS_OPTIONS: BookingStatus[] = [
  'DRAFT', 'PENDING', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED',
];

export function initials(name: string | null | undefined): string {
  if (!name) return '··';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
