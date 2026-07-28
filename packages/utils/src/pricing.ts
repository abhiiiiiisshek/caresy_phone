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

/** Duration slabs, cheapest first. Rates set by Abhishek, 2026-07-28. */
export const SLABS: Slab[] = [
  { minutes: 60, paise: 29_900, label: '1 hour' },
  { minutes: 120, paise: 49_900, label: '2 hours' },
  { minutes: 240, paise: 99_900, label: '4 hours' },
  { minutes: 480, paise: 159_900, label: '8 hours' },
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
