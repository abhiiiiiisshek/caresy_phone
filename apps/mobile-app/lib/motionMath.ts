// Pure motion arithmetic, deliberately free of any react-native import so it
// stays runnable under plain `node --experimental-strip-types` for its
// self-check. `lib/motion.ts` is the React/Animated layer on top of this.

// Entrance delay for the Nth child, capped so long lists do not make the tail
// wait on choreography. `reduce` collapses the cadence for Reduce Motion.
export function staggerDelay(index: number, reduce = false, step = 56, cap = 7): number {
  if (reduce) return 0;
  return Math.min(Math.max(index, 0), cap) * step;
}

// Exponential backoff with full jitter. Jitter keeps N failed images on one
// screen from retrying in the same frame.
export function backoffMs(attempt: number, base = 400, ceiling = 8000, rand: () => number = Math.random): number {
  const exp = Math.min(base * 2 ** Math.max(attempt, 0), ceiling);
  return Math.round(exp / 2 + rand() * (exp / 2));
}

// How much longer a loading state must stay on screen to avoid a flicker.
// `elapsed` is null when the state was never shown.
export function holdFor(elapsed: number | null, floor = 350): number {
  if (elapsed === null) return 0;
  return Math.max(0, floor - elapsed);
}
