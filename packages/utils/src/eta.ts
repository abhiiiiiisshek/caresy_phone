// How an arrival time is worded on the tracking screen.
//
// Branchy enough to be worth pinning down: a family reads this while anxious,
// and the failure modes are all the same shape — a number that sounds more
// certain than it is. OpenRouteService gives free-flow durations with no live
// traffic, refreshed off a position that is itself up to ~12s stale, so nothing
// here should read as a promise.
//
// Rules, in order:
//   - Under a minute is "less than a minute", never "0 min".
//   - Under an hour rounds UP to the minute. Rounding down lets 119s render as
//     "1 min" and then still be waiting at 2:00, which is the one outcome worth
//     engineering against.
//   - An hour or more switches to "1 h 20 min", because "83 min" is arithmetic
//     the reader has to do.
//   - Anything beyond three hours is not an ETA to a hospital gate, it is a bad
//     route or a stale ping. Say nothing rather than something absurd.

/** Longer than this and the number is noise, not an estimate. */
export const ETA_MAX_SECONDS = 3 * 60 * 60;

/**
 * A duration in seconds as customer-facing text, or null when there is nothing
 * honest to say. Null covers: no value, a negative or non-finite one, and
 * anything past ETA_MAX_SECONDS.
 */
export function formatEta(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  if (seconds < 0 || seconds > ETA_MAX_SECONDS) return null;
  if (seconds < 60) return 'less than a minute';

  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min`;

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * The whole line, target included. 'pickup' is the only target that can name
 * the person waiting — after pickup the companion is already with them.
 */
export function etaSentence(seconds: number | null | undefined, target: string | null | undefined): string | null {
  const pretty = formatEta(seconds);
  if (!pretty) return null;
  // "less than a minute" is already a full phrase; the duration wordings are
  // bare quantities and need the sentence built around them.
  const imminent = pretty === 'less than a minute';
  if (target === 'destination') {
    return imminent ? 'Less than a minute from the hospital' : `About ${pretty} from the hospital`;
  }
  return imminent ? 'Arriving in less than a minute' : `About ${pretty} away`;
}
