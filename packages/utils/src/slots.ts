/**
 * Which appointment slots are still bookable.
 *
 * Every slot used to be offered on every date, so at 6pm somebody could pick
 * "today, 9am" and submit a request timestamped nine hours in the past. Nothing
 * downstream caught it: the companion feed sorted it to the top as the most
 * overdue job, and ops only noticed by reading the clock on the card.
 *
 * Lives here rather than in the booking page so it has a runnable check beside
 * it — the boundary conditions (a slot exactly on the cutoff, a date that rolls
 * over at midnight) are the kind that are wrong silently.
 */

/** The slots the booking form offers, as 24-hour "HH:MM" wall clock. */
export const TIME_SLOTS = [
  '09:00', '10:00', '11:30', '13:00', '14:30', '16:00', '17:00', '18:00', '19:00',
] as const;

/**
 * Least notice we can act on. Ops has to find a companion, brief them, and get
 * them to a hospital; an hour is the floor, not a target.
 */
export const MIN_LEAD_MINUTES = 60;

/**
 * Slots still bookable on `dateIso` (a local "YYYY-MM-DD").
 *
 * Future dates keep the whole list. Today loses everything inside the lead
 * window. `now` is injectable so the check does not depend on the wall clock.
 */
export function availableSlots(dateIso: string, now: Date = new Date()): string[] {
  if (!dateIso) return [...TIME_SLOTS];

  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const picked = new Date(dateIso + 'T00:00:00');

  // A later date is entirely in the future; an earlier one should not be
  // reachable (the calendar disables past days) but yields nothing if it is.
  if (picked.getTime() > midnight.getTime()) return [...TIME_SLOTS];
  if (picked.getTime() < midnight.getTime()) return [];

  const cutoff = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  return TIME_SLOTS.filter((t) => new Date(`${dateIso}T${t}:00`).getTime() >= cutoff);
}
