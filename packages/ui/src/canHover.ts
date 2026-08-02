/**
 * Does this device actually hover?
 *
 * The card and button components lift on `onMouseEnter`. A touchscreen fires
 * that on tap and often never fires `onMouseLeave`, so the element stays lifted
 * — on a phone the last button you pressed sits 2px above the rest of the page
 * until something else is tapped. Every hover-only visual effect asks this
 * first; CSS says the same thing with `@media (hover: hover)`.
 *
 * Checked per call rather than once at module load: this runs during SSR where
 * `window` does not exist, and a laptop with a touchscreen can change its answer.
 */
export function canHover(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true;
}
