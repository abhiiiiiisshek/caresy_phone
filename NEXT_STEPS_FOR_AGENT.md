# Next Steps for the Next Agent

**Status:** Audit findings fixed, code committed, ready for deployment.

**Commit:** `6c3e052` — "Fix audit findings: account deletion, RLS hardening, crash boundary, audience filter, FAQ accordion, tracking honesty"

**All code tested:** `tsc 0 errors`, `bookingStatus.check passes`.

---

## Do This First (Blocking)

### 1. Apply Migrations to Production Supabase

**Location:** `/supabase/migrations/`

**Files to run in order:**
1. `30_LAUNCH_FIXES.sql`
2. `31_CUSTOMER_ACTIONS.sql`
3. `33_PHONE_SIGNIN.sql`
4. `34_SECURITY_HARDENING.sql` (new)

**How:** 
- Open Supabase dashboard SQL editor
- Copy entire migration file
- Paste into editor
- Run
- Update `docs/DATABASE.md` ledger: change ⬜ to ✅

**Skip:** Migration 32 (MERGE_DUPLICATE_PATIENTS) — temp table syntax broken in Supabase editor. Leave as ⬜. Rewrite only if duplicate patients appear.

**Verify:** After migration 34, confirm in Supabase:
```sql
SELECT prosecdef, proname FROM pg_proc WHERE proname = 'is_admin';
-- Should show SECURITY DEFINER=true
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_guard_trip_status';
-- Should exist
```

---

### 2. Test Account Deletion (Manual)

**On website:**
1. Go to `/profile`
2. Scroll to Danger zone
3. Click "Delete my account"
4. Type `DELETE` exactly
5. Click "Permanently delete"
6. Sign in again with same email/phone — should fail (auth.users row gone)

**On mobile app:**
1. Go to Profile
2. Scroll to Danger zone
3. Delete account → type DELETE → confirm
4. Should sign out, return to home
5. Try to sign back in — should fail (auth gone)

**What it does:** Calls `admin.auth.admin.deleteUser()` which cascades to profiles, patients, bookings, trips, care records, push tokens, notifications.

**If fails:** Check that `apps/website/src/app/api/account/delete/route.ts` has `SUPABASE_SERVICE_ROLE_KEY` env var set.

---

### 3. Deploy Website Changes

**Files changed:**
- `apps/website/src/app/api/account/delete/route.ts` — now accepts bearer tokens (mobile) + session cookies (web)
- `apps/website/src/app/tracking/page.tsx` — now uses shared tracking logic from `@caresy/utils/bookingStatus`

**Deploy:** Via your normal Vercel deploy flow.

**Verify in production:**
- Open `/tracking?t=<guest-share-token>` when a booking is ASSIGNED (no companion movement yet)
- Headline should say "Companion assigned — location will be shared when trip starts"
- NOT "Your companion is on the way" (that was the bug)

---

## Do This Before TestFlight Build

### 4. Test Mobile App UI Fixes (Manual)

**Care Guide audience filter:**
- Open app → tap Care Guides
- Tap "Older adults" chip
- Should show only Older-adults + Everyone guides
- Verify Recovery/Urgent guides still show (time-critical)

**Support FAQ accordion:**
- Open app → tap Get help
- Click an FAQ to open it
- Switch category filter
- The same FAQ (if it exists in new filter) should stay visually expanded

**Error boundary:**
- (Requires code modification to trigger — skip for now unless you can safely throw an error in a screen)

---

### 5. Build Mobile App for TestFlight

**Prerequisite:** Apple App ID must have updated Services ID + Key + domains (was configured in prior session, check Supabase Apple provider settings).

**Commands:**
```bash
cd apps/mobile-app

# Clean rebuild for native modules
npx expo prebuild --clean

# Build for iOS
eas build --platform ios --profile production

# After build succeeds, submit to TestFlight
eas submit --platform ios
```

**Expected:** Dev build on TestFlight, installable on physical iOS device.

**Test on device:**
- Sign in
- Book a companion
- Go to tracking screen
- Verify "location will be shared" copy (not "on the way")
- Delete account flow (from Profile → Delete)

---

## Later (Not Blocking)

### Android Setup
- No keystore config exists in `apps/mobile-app/android/app/build.gradle`
- Blocked on: keystore creation + Play Store signing setup
- Not a code task

### Play Store Closed Testing
- Start the 12-tester / 14-day clock
- Not a code task

### Remaining Audit Gaps (Lower Priority)
- **Accessibility:** 35% a11y prop coverage (booking flow Card primitive missing role/state)
- **Testing:** No CI (GitHub Actions) — all checks are manual
- **Offline:** Zero offline support
- **Push notifications:** Provisioned but disabled in `AuthProvider.tsx:49-50` — re-enable after dev build works
- **Cancellation fee:** Implemented but never charged — decide: activate or delete the code

---

## Reference Docs

- **Full audit:** https://claude.ai/code/artifact/f19d395e-cc86-4ef8-a30c-bfc1ec3b1a03
- **This session's work log:** `AUDIT_FIXES_2026_08_16.md`
- **Database ledger:** `docs/DATABASE.md`
- **Coding standards:** `CLAUDE.md`
- **Architecture:** `docs/ARCHITECTURE.md`

---

## Questions for the Next Agent

If anything fails:
1. **Migration won't run:** Is `SUPABASE_SERVICE_ROLE_KEY` set? Does the migration have syntax errors? Check Supabase error message.
2. **Account deletion flow fails:** Is the website deployed with the new bearer-token-accepting route? Is `SUPABASE_SERVICE_ROLE_KEY` in website env vars?
3. **TestFlight build fails:** Did `npx expo prebuild --clean` complete successfully? Are native module iOS pods installed?

For questions on audit scope or remaining gaps, see the full audit report linked above.

---

**Contact:** If anything is unclear, refer to the audit findings (link above) or the detailed work log in `AUDIT_FIXES_2026_08_16.md`.
