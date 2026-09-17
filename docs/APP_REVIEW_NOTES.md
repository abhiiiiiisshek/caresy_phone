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

# Caresy Admin (`in.co.caresy.admin`) — a second listing, a second set of notes

`apps/admin-app` is its own App Store record (ADR-0014), so it gets its own
review notes. Do not paste the consumer block above into it — the reviewer would
go looking for a booking flow that this app does not have.

## Paste into App Store Connect > App Review > Notes

---

**Caresy Admin is the staff companion to the Caresy app (`in.co.caresy.app`, same developer). It is the dispatch desk: the operations team uses it to see incoming care-visit requests and assign a companion to each one. It is not a second consumer app and has no consumer-facing flow — the same work is done on the web at `admin.caresy.co.in`.**

**Sign-in is email + password only.** There is no third-party or social login anywhere in this app, so Sign in with Apple does not apply (Guideline 4.8). Accounts are not self-serve: an address must already be on the operations allowlist in our database, and signing in with any other account shows an explicit "Not an ops account" screen rather than an empty app.

- **Email:** _(fill in as you paste — the dedicated admin review account)_
- **Password:** _(fill in as you paste — never write it into this file)_

**What to do after signing in:**

1. The app opens on **Dispatch**, a board with four tabs: **Needs action**, **Upcoming**, **Active**, **Done**. Every real booking in the system appears in exactly one of them.
2. Tap any card to open the booking. **Needs action** holds requests with no companion assigned yet — those are the ones the desk works first, and their cards are outlined in orange.
3. On the booking screen, pick a name under **Companion**, then tap **Save changes**. That is the app's single core action.
4. Changing **Status** requires typing a reason — this is an audited override, and the field is intentionally mandatory.
5. **Call** opens the system dialer with the patient's emergency contact. Nothing is dialled without a further tap.

**Push notifications:** the app alerts the on-duty operator when a new request arrives or when a scheduled visit is still unstaffed as it approaches. Notifications are only sent to signed-in operations accounts; there is no marketing or promotional push.

**No purchases, no subscriptions, no advertising, no tracking, no account creation.**

---

## Before you submit

- **The review account must be on the allowlist.** Add its address to
  `admin_users` (migration 10) and give it a password — the app does not offer
  OAuth, and a Supabase account created by OAuth has no password to type. Set
  one with the Supabase dashboard or `auth.admin.updateUserById`.
- **Do not reuse the consumer review account.** It is not an admin, so it would
  land the reviewer on the "Not an ops account" screen and earn a 2.1 rejection
  for a non-functional app.
- **Expect the 4.2 / business question.** An ops tool can read as
  "internal-use-only", which Apple pushes toward Apple Business Manager rather
  than the public App Store. The answer above is the honest one and is the
  answer to give: this is the staff half of a published consumer service, the
  same relationship as any delivery platform's courier app. If it is rejected on
  those grounds, the fallback is TestFlight internal distribution — no review,
  100 testers, builds expire every 90 days.

## The part that is a real decision, not a checkbox

A working admin account shows the reviewer **live production data** — real
patient names, ages and emergency contact numbers on real bookings. There is no
reviewer-only view: `is_admin()` is all-or-nothing by design (migration 43
exists because it once failed *open*), and adding a "demo mode" that hides real
rows would be a second, weaker authorization path through the same screens.

So this is a deliberate trade, and the mitigation is procedural rather than
technical:

1. Add the review account to `admin_users` when the build goes to review.
2. **Remove it the moment the app is approved**, and rotate its password.
3. Keep it off the allowlist between submissions. A rejected build that needs a
   resubmission needs it back for a few days, not permanently.

Revisit if reviews become frequent enough that the account is effectively always
live — at that point a review-scoped role with its own RLS policies is worth the
migration it would cost.
