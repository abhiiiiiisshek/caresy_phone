// The single source of truth for what a booking costs.
//
// Before this existed the price list was copied into booking/page.tsx,
// services/page.tsx, terms/page.tsx and admin/utils/pricing.ts, and the admin
// copy openly admitted it was re-deriving the rules to guess revenue. Four
// copies of a price list drift the first time a rate changes. Import from here.
//
// Money is integer paise everywhere. Rupees as floats give you ₹1249.9999997
// on a real bill and an afternoon of reconciliation you will not enjoy.

export interface Slab {
  minutes: number;
  paise: number;
  label: string;
}

/**
 * Duration slabs, cheapest first. Rates set by Abhishek, 2026-07-28.
 *
 * Two, deliberately. The 2-hour and 4-hour slabs were dropped on 2026-07-28
 * after checking them against the meter: they never moved a bill by more than
 * ₹40, and every one of them added a boundary a customer could not verify.
 * Corelatin — the direct competitor in Delhi NCR — quotes a single ₹299/hr and
 * nothing else, so a formula only has to be short enough to say out loud:
 *
 *   "₹299 for the first hour, then ₹4 a minute. Full day is ₹1,599,
 *    and we always charge whichever is less."
 *
 * Add a slab back only if it earns its explanation.
 */
export const SLABS: Slab[] = [
  { minutes: 60, paise: 29_900, label: '1 hour' },
  { minutes: 480, paise: 159_900, label: 'Full day' },
];

/**
 * Time past a slab, per minute.
 *
 * ₹4/min is ₹240/hr against a ₹100/hr companion. Always quote it per minute:
 * "₹4 a minute" reads as nothing, "₹240 an hour" reads as a lot, and it is the
 * same money.
 */
export const OVERTIME_PAISE_PER_MINUTE = 400;

/**
 * Free minutes past a slab before overtime starts.
 *
 * Discharge paperwork runs over constantly. Billing someone because a nurse was
 * slow is how every booking turns into a refund argument, and at this volume one
 * bad review costs more than the grace does.
 */
export const GRACE_MINUTES = 15;

/**
 * The slab a duration is billed under: the longest one the time actually
 * reaches. Under an hour still lands on the 1-hour slab — that is the minimum
 * charge, since the companion still travelled.
 */
function applicableSlab(used: number): Slab {
  let best = SLABS[0];
  for (const s of SLABS) if (used >= s.minutes) best = s;
  return best;
}

/**
 * What to charge for `actualMinutes` of companion time, in paise.
 *
 * Rule: the slab the time reaches, plus ₹4/min for anything past it, and never
 * more than a longer slab would have cost.
 *
 * The obvious-looking alternative — take the cheapest of every "slab + overtime"
 * route — is wrong, and wrong in a way that costs real money. Overtime is
 * cheaper per hour than any slab, so the 1-hour route always won: four hours
 * would have billed ₹299 + 165 min = ₹959 instead of the ₹999 slab, eight hours
 * ₹299 + 405 min = ₹1,919 capped down, and the ladder would have collapsed into
 * "₹299 plus per-minute forever". Slabs have to bind from below, not compete.
 *
 * The cap from above is what keeps it monotonic. Without it, 7h59m on the
 * 4-hour slab bills ₹1,895 while 8h00m bills ₹1,599 — staying longer would cost
 * less, which is indefensible on a phone call.
 *
 * Bills time ACTUALLY used, not the slab booked, so the app must show a running
 * total during the visit. A ₹299 quote settling at ₹999 with no warning is a
 * dispute in any market.
 */
export function priceForMinutes(actualMinutes: number): number {
  const used = Math.max(0, Math.ceil(actualMinutes));
  const slab = applicableSlab(used);
  const route = slab.paise + Math.max(0, used - slab.minutes - GRACE_MINUTES) * OVERTIME_PAISE_PER_MINUTE;
  const cap = Math.min(...SLABS.filter((s) => s.minutes >= used).map((s) => s.paise), Infinity);
  return Math.min(route, cap);
}

/** Minutes between two timestamps, or null while the visit is still running. */
export function billableMinutes(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null;
  const ms = Date.parse(endIso) - Date.parse(startIso);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.ceil(ms / 60_000);
}

/**
 * What the visit has cost so far, for the meter both apps show while a job is
 * IN_PROGRESS. Returns null before the companion has tapped Start.
 *
 * Mirrors complete_booking() in 26_BILLING.sql, including the evening
 * surcharge — the first version of the companion's RunningTotal left the
 * surcharge out and so ran ₹99 under the real bill for every evening visit,
 * which is exactly the surprise this meter exists to prevent.
 *
 * `eveningSurchargePaise` comes from the quote stored in
 * `bookings.service_metadata`, which is client-written, so anything other than
 * the one surcharge that exists is treated as zero. The server clamps
 * identically; keep the two in step.
 *
 * Still only an estimate: the amount owed is whatever the server computes from
 * its own clock at Complete. Label it as running, never as final.
 */
export function runningTotalPaise(
  startedAtIso: string | null,
  nowIso: string,
  eveningSurchargePaise: number | null = 0,
): { minutes: number; paise: number } | null {
  const minutes = billableMinutes(startedAtIso, nowIso);
  if (minutes === null) return null;
  const evening = eveningSurchargePaise === EVENING_SURCHARGE_PAISE ? EVENING_SURCHARGE_PAISE : 0;
  return { minutes, paise: priceForMinutes(minutes) + evening };
}

/**
 * A plain-language breakdown for the bill screen.
 *
 * When the cap wins — the customer stayed long enough that a longer slab is
 * cheaper than their slab plus overtime — the bill names that longer slab and
 * shows no overtime, because that is what they are actually being charged.
 */
export function explainPrice(actualMinutes: number): { slab: Slab; overtimeMinutes: number; paise: number } {
  const used = Math.max(0, Math.ceil(actualMinutes));
  const paise = priceForMinutes(used);
  const slab = applicableSlab(used);
  const route = slab.paise + Math.max(0, used - slab.minutes - GRACE_MINUTES) * OVERTIME_PAISE_PER_MINUTE;
  if (paise < route) {
    const capped = SLABS.filter((s) => s.minutes >= used && s.paise === paise)[0];
    if (capped) return { slab: capped, overtimeMinutes: 0, paise };
  }
  return { slab, overtimeMinutes: Math.max(0, used - slab.minutes - GRACE_MINUTES), paise };
}

/**
 * Extension offers, shown ~10 minutes before the booked time runs out.
 *
 * Every one is cheaper per minute than the ₹4/min meter, and they get cheaper
 * the longer they are. That ordering is the whole point and it is easy to get
 * backwards: if extending cost MORE than overstaying, nobody would ever accept
 * one — they would let the meter run and you would keep the bill shock that
 * these exist to prevent. The meter is the penalty for not deciding; extending
 * is the discount for deciding early.
 *
 * Three, not five. The decoy only works when the middle option is obviously the
 * value pick, and a phone popup with five prices is a menu, not a decision.
 * 1 hour is the target: twice the time of the 30-minute option for 1.8x the
 * price. Add 15-minute and 45-minute rows here if the middle stops winning.
 */
export interface Extension {
  minutes: number;
  paise: number;
  label: string;
}

export const EXTENSIONS: Extension[] = [
  { minutes: 30, paise: 10_900, label: '30 minutes' },
  { minutes: 60, paise: 19_500, label: '1 hour' },
  { minutes: 120, paise: 35_900, label: '2 hours' },
];

/** What the same minutes would cost on the meter — the "you save" comparison. */
export function extensionSaving(e: Extension): number {
  return e.minutes * OVERTIME_PAISE_PER_MINUTE - e.paise;
}

/**
 * Cancellation fee, in paise. Set at ₹99 by Abhishek on 2026-07-28.
 *
 * Goes to the companion in full, not to Caresy — the Urban Company model. One
 * policy then covers both the customer's incentive and the companion's dead
 * trip, and it costs Caresy nothing because Caresy never keeps it.
 */
export const CANCELLATION_PAISE = 9_900;

/** Free-cancellation window before a scheduled booking starts. */
export const SCHEDULED_FREE_HOURS = 6;

/** Grace after placing an urgent booking, during which cancelling is free. */
export const URGENT_FREE_MINUTES = 30;

/**
 * Whether cancelling costs the customer ₹99.
 *
 * `companionDispatched` overrides everything. Once someone has set out, their
 * trip is spent no matter which window the clock is in, and that is exactly the
 * loss the fee exists to cover — so it is checked before the free windows, not
 * after.
 */
export function cancellationPaise(o: {
  isScheduled: boolean;
  companionDispatched: boolean;
  bookedAtIso: string;
  startsAtIso: string | null;
  nowIso: string;
}): number {
  if (o.companionDispatched) return CANCELLATION_PAISE;
  const now = Date.parse(o.nowIso);
  if (o.isScheduled) {
    const starts = o.startsAtIso ? Date.parse(o.startsAtIso) : NaN;
    // Unknown start time: treat as inside the window rather than billing
    // someone on the strength of a missing timestamp.
    if (!Number.isFinite(starts)) return 0;
    return starts - now >= SCHEDULED_FREE_HOURS * 3_600_000 ? 0 : CANCELLATION_PAISE;
  }
  const booked = Date.parse(o.bookedAtIso);
  if (!Number.isFinite(booked)) return 0;
  return now - booked <= URGENT_FREE_MINUTES * 60_000 ? 0 : CANCELLATION_PAISE;
}

/**
 * Evening surcharge: ₹99 flat on bookings that START between 6pm and 8pm,
 * urgent or scheduled. Services stop at 8pm, so this is the last-slots premium
 * — companions heading out at dinner time, returning after dark.
 *
 * Flat, not a percentage, for the same reason the rest of the sheet is one
 * sentence: "₹99 extra for evening slots" survives being said out loud.
 */
export const EVENING_SURCHARGE_PAISE = 9_900;
export const EVENING_FROM_HOUR = 18; // 6pm, inclusive
export const EVENING_TO_HOUR = 20;   // 8pm, exclusive — nothing starts at 8

/**
 * Surcharge for a booking starting at the given LOCAL hour (0–23). Callers pass
 * the customer's wall-clock hour — the booking form's "18:00" slot string, or
 * the current hour for an urgent booking — never a UTC hour, which would be
 * 5½ hours off in India and surcharge the lunch slots.
 */
export function eveningSurchargePaise(startHour: number): number {
  return startHour >= EVENING_FROM_HOUR && startHour < EVENING_TO_HOUR ? EVENING_SURCHARGE_PAISE : 0;
}

/** ₹1,599 — grouped Indian-style, no paise (every price here is whole rupees). */
export function formatINR(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

/**
 * UPI deep link. Opens the Android app chooser with the amount prefilled and
 * locked — GPay, PhonePe, Paytm, SuperMoney, whatever the customer has.
 * No gateway, no fee, no signup. iOS has no generic upi:// handler.
 */
export function upiPayUrl(o: { vpa: string; name: string; paise: number; ref: string }): string {
  const q = new URLSearchParams({
    pa: o.vpa,
    pn: o.name,
    am: (o.paise / 100).toFixed(2),
    cu: 'INR',
    tn: `Caresy ${o.ref}`,
    tr: o.ref,
  });
  return `upi://pay?${q}`;
}
