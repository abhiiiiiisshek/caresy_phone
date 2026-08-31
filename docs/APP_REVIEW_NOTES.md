# App Review notes — paste into App Store Connect

Copy the block below into **App Store Connect > Your App > App Review > Notes**,
and into **Play Console > App content > App access** for the Play review — both
ask for working sign-in credentials when the app is behind a login.

**Fill the two credential lines in as you paste. They are deliberately blank
here**: this repo is public, so a live email and password in a tracked file is a
published credential. The Console fields are the right home for them — private,
and where the reviewer actually looks.

---

**Caresy operates only in Noida, India (service area: Noida, Greater Noida, Greater Noida West).** The booking flow validates an Indian mobile number (`+91` 10-digit, 6-9 start) and a served pincode — this is intentional, not a bug. A reviewer signing in with their own Apple ID will see an empty phone field; entering `+91 9999999999` and pincode `201301` (Fortis Hospital, Sector 62, Noida) lets the flow complete.

**Fastest path — use the pre-seeded demo account:**

- **Email:** _(fill in as you paste — the dedicated review account)_
- **Password:** _(fill in as you paste — never write it into this file)_
- **Phone on file:** `+91 99999 99999` (valid, passes `isValidIndianMobile`)
- **Booking:** one scheduled visit (HOSPITAL_COMPANION, Fortis Hospital → Home, pincode 201301) is already in **My Bookings** after sign-in. No ntfy page is triggered — the demo booking's ADMIN notification is marked SKIPPED.

Sign in with the demo account (email + password) OR with your own Apple ID:

1. Open the app → **Sign in with Apple** (or Google).
2. If you use your own Apple ID, go to **Profile → Mobile number → +91 99999 99999 → Save**.
3. Go to **Booking** → pick any hospital (e.g. Fortis Hospital) → pincode `201301` auto-fills as **"We serve Noida"** (green check via `CheckCircle2` icon).
4. Choose department/doctor, pick tomorrow's date, and confirm. The booking appears in **My Bookings** with live tracking stub.

---

## Which account, and seeding it

**`github.com/abhiiiiiisshek/caresy_phone` is a public repo**, so neither the
review email nor its password goes in a tracked file — not here, not in the seed
script. They name a real account on production Supabase carrying a profile, a
patient record and a booking. `DemoAppReview2026!` on `app-review@caresy.co.in`
was committed in plaintext from 2026-08-30 to 2026-08-31; **that pair is burned**
and should be deleted from Supabase rather than reused.

The account App Review uses is set by environment, so switching to a new one is a
config change and not a code change:

```
# apps/website/.env.local  (gitignored)
DEMO_APP_REVIEW_EMAIL=<the dedicated review account>
DEMO_APP_REVIEW_PASSWORD=<its password>
```

```
node --experimental-strip-types scripts/seed-app-review-demo.ts
```

**A freshly created account is not enough on its own — it must be seeded.** A
bare sign-up has no phone, no saved location and no booking, so a reviewer lands
on an empty "My Bookings" and hits the Indian-phone/served-pincode validation
with nothing pre-filled. That is the exact wall this demo path exists to avoid.
The script attaches the phone, the Noida location and one scheduled booking to
whichever account the env names, and it is idempotent, so re-running is safe.

The password then lives in App Store Connect, Play Console and your password
manager — nowhere else. Do not run booking writes casually: production Supabase
is live, and ops ntfy would be paged if the ADMIN notification were not
suppressed.

Validator: `packages/utils/src/phone.ts` `isValidIndianMobile` is deliberately India-only (service area Noida). Expanding to E.164 would not help — `enforce_service_area()` (migration 11) still rejects out-of-area pincodes. The demo account is the honest path; there is no reviewer-specific bypass (Apple regards that as grounds for rejection).

---
