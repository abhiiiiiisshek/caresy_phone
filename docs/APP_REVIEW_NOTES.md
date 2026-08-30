# App Review notes — paste into App Store Connect

Copy the block below verbatim into **App Store Connect > Your App > App Review > Notes**.
Update the demo credentials if you re-seed with a different password.

---

**Caresy operates only in Noida, India (service area: Noida, Greater Noida, Greater Noida West).** The booking flow validates an Indian mobile number (`+91` 10-digit, 6-9 start) and a served pincode — this is intentional, not a bug. A reviewer signing in with their own Apple ID will see an empty phone field; entering `+91 9999999999` and pincode `201301` (Fortis Hospital, Sector 62, Noida) lets the flow complete.

**Fastest path — use the pre-seeded demo account:**

- **Email:** `app-review@caresy.co.in`
- **Password:** `DemoAppReview2026!`
- **Phone on file:** `+91 99999 99999` (valid, passes `isValidIndianMobile`)
- **Booking:** one scheduled visit (HOSPITAL_COMPANION, Fortis Hospital → Home, pincode 201301) is already in **My Bookings** after sign-in. No ntfy page is triggered — the demo booking's ADMIN notification is marked SKIPPED.

Sign in with the demo account (email + password) OR with your own Apple ID:

1. Open the app → **Sign in with Apple** (or Google).
2. If you use your own Apple ID, go to **Profile → Mobile number → +91 99999 99999 → Save**.
3. Go to **Booking** → pick any hospital (e.g. Fortis Hospital) → pincode `201301` auto-fills as **"We serve Noida"** (green check via `CheckCircle2` icon).
4. Choose department/doctor, pick tomorrow's date, and confirm. The booking appears in **My Bookings** with live tracking stub.

Seed: `node --experimental-strip-types scripts/seed-app-review-demo.ts` (requires `SUPABASE_SERVICE_ROLE_KEY`). The script is idempotent; re-running updates the demo user to the password above. Do not run booking writes casually — production Supabase is live and ops ntfy would be paged if the ADMIN notification were not suppressed.

Validator: `packages/utils/src/phone.ts` `isValidIndianMobile` is deliberately India-only (service area Noida). Expanding to E.164 would not help — `enforce_service_area()` (migration 11) still rejects out-of-area pincodes. The demo account is the honest path; there is no reviewer-specific bypass (Apple regards that as grounds for rejection).

---
