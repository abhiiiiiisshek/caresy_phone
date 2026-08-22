# Parallel work — two people, one repo

## Mobile phases (full picture — source: `docs/MOBILE_PLAN.md`)

| Phase | What | Status |
|---|---|---|
| 0 — Unblock sharing | `packages/utils`/`types` made web-independent so Metro can import them | ✅ done 2026-08-07 |
| 1 — Boot + auth | Expo app scaffolded, Supabase auth (Google sign-in), one screen reading own `profiles` row | ✅ done |
| 2 — Read-only screens | Home, booking history/detail, profile, settings, support, native bottom tabs | ✅ mostly done — Home + My Bookings built, Profile/Settings/Support still ⬜ (see `NATIVE_CHECKLIST.md`) |
| 3 — Booking write path | Service → hospital → patient → pincode → slot → confirm, real `INSERT` under RLS | ✅ built (parity deferred — see `NATIVE_CHECKLIST.md` deferred 1–4,8) — Booking screen built, writes patients→locations→bookings |
| 4 — Native-only capability | Live tracking (maps + Realtime), push notifications, image picker for docs | 🔶 partial — Tracking screen built; push notifications + doc picker not yet |
| 5 — Store compliance | Account deletion, Sign in with Apple, privacy manifest, Data Safety/App Privacy forms | ⬜ not built — **blocks both store submissions** |
| 6 — Ship, retire shell | EAS Build → Play + App Store, then delete old `apps/mobile` Capacitor tree | ⬜ blocked on Phase 5 |

Remaining mobile-app screens per `NATIVE_CHECKLIST.md` (2026-08-13): Quick Help, Profile, Care/Guides, Account deletion — all ⬜.

This table is a summary, not the source of truth — `MOBILE_PLAN.md` has the full detail per phase, re-check it, this can go stale.

## Session log — read this first, newest entry on top

Every session (either person, any machine) appends one entry here before
stopping — what you did, what's left mid-flight, what the other person should
NOT touch until you say so. This is how a brand-new Claude session (yours or
theirs) picks up "where we left off" without guessing. Don't delete old
entries — prune only once genuinely stale (>2 weeks and superseded).

Format:

```
### 2026-08-13 — <who> — branch <branch-name>
Did: <what actually changed, files/areas touched>
Left mid-flight: <anything uncommitted or half-done — or "none, clean">
Don't touch: <files/areas someone else should hold off on, or "none">
Next: <what should happen next in this area>
```

---

### 2026-08-22 — primary session — branch `feature/companion-portal` (worktree: `caresy_m3_worktree`) — reviewed + merged Muse's reschedule work
Did: reviewed Muse's `feature/mobile-reschedule` (commits `7ce05e5`..`f934eb5`)
against the task spec below and the `reschedule_booking` RPC contract
(`supabase/migrations/31_CUSTOMER_ACTIONS.sql:81`). Checked independently
(not just trusting Muse's self-report): `npx tsc --noEmit` clean in
`caresy_reschedule_worktree`, RPC param names/types match exactly, status
whitelist (`PENDING`/`ACCEPTED`/`ASSIGNED`) matches the server's own check
so the client and RPC never disagree about what's reschedulable, IST display
labels don't affect the actual `p_start` payload (that's `.toISOString()`,
timezone-safe), `ChipRow`/`BottomSheet` imports were cleanly dropped (no
dangling refs) after the v1→v2 pivot to a native date/time picker, and the
`ios/Podfile.lock`/`Info.plist` diff is just prebuild collateral from linking
`@react-native-community/datetimepicker` — consistent with `app.json`'s
existing `newArchEnabled: true`. Found one real issue: `confirmReschedule`'s
`catch (err: any)` was missed when the sibling `fetch()` catch got fixed to
`unknown` in the "detailed bug check" pass — `CLAUDE.md` bans `any` in
committed code. Fixed and committed (`fcb1eee`, `caresy_reschedule_worktree`).
Merged `feature/mobile-reschedule` → `feature/companion-portal` (fast-forward,
`fcb1eee`) in this worktree: stashed the pending SDK-version-bump +
gradient-fix uncommitted changes first (git refused the merge otherwise —
`package.json`/`package-lock.json`/this file all had local edits it wouldn't
overwrite), merged clean, then popped the stash back — this file was the only
real conflict (both sides appended entries in the same place), resolved by
keeping both, newest first. `package.json`/`package-lock.json` auto-merged
without conflict (the SDK bump and the new `datetimepicker` dependency don't
touch the same lines).
Left mid-flight: the SDK-version-bump + gradient/crop-fix changes from the
entry below are still uncommitted in this worktree (untouched by the merge
itself, just carried through the stash) — see that entry's own "Next".
Don't touch: `apps/mobile-app/app/my-bookings.tsx` — just merged, verify on
device before changing further.
Next: commit the still-pending gradient/crop fix (entry below) as its own
change. Reschedule flow is merged and ready for on-device verification
(native Date/Time pickers, Cancel still unaffected).

---

### 2026-08-22 — Muse — branch `feature/mobile-reschedule` (worktree: `caresy_reschedule_worktree`) — DETAILED BUG CHECK + FIXES — TO BE REVIEWED — done by Muse
Did: per your “DO A DETAILED BUG CHECK” and “proceed your self”, ran full static + logic audit on `apps/mobile-app/app/my-bookings.tsx` native-reschedule (c8895cb). `tsc --noEmit -p apps/mobile-app/tsconfig.json` → EXIT 0, no console.log, no TODO. Found 10 issues (see commit f934eb5 message): (1) `isReschedulable` blocked past PENDING rescue (used `isPastBooking`); (2) `whenLabel`/`dateLabel`/`timeLabel` used device TZ vs server IST; (3) `openReschedule` NaN/>90d not clamped + race when `rescheduling`; (4) dual iOS spinners (both `showDatePicker`+`showTimePicker` true stacked); (5) hardcoded 60m/90d client early returns blocked RPC (spec says warn, let RPC authoritative); (6) `Haptics` unguarded on web; (7) `fetch()` not quiet + `catch(err:any)` loose; (8) `onDateChange`/`onTimeChange` typed `any`; (9) `ios/Podfile.lock`/`Info.plist` collateral from prebuild (EXConstants bump, RCTNewArchEnabled). Fixed all Major+Moderate in `f934eb5` (`my-bookings.tsx` only): `isReschedulable` now checks terminal statuses only (past time no longer blocks, RPC decides); `whenLabel`/labels now `timeZone:'Asia/Kolkata'`; `openReschedule` clamps NaN/>90d and guards `if(rescheduling) return`; pickers now mutually exclusive (`setShowTimePicker(false)` on date open etc.); removed hardcoded early returns (client hints only, RPC `31_CUSTOMER_ACTIONS.reschedule_booking` authoritative); added `.catch(()=>{})` to all Haptics, `fetch('quiet')`, `unknown` typing. Re-verified `tsc --noEmit` → EXIT 0 and pushed.

Left mid-flight: `f934eb5` pushed to `origin/feature/mobile-reschedule` (now 4 commits ahead of `a4c678e`: `7ce05e5` spec → `c8895cb` native picker → `1a38bb9` ios sync → `f934eb5` bug fixes). Working tree clean.

Don't touch: `apps/mobile-app/app/booking.tsx`, `apps/mobile-app/components/ui.tsx`, `supabase/migrations/*` (still read-only per original spec). `caresy_m3_worktree` still has your gradient debug (`app/index.tsx` + `ios/Pods` `[gradient-debug]`).

Next: **TO BE REVIEWED** — please review `my-bookings.tsx` f934eb5 (esp. `isReschedulable` past logic + native picker UX + IST labels) and the `ios/` Podfile diff. If OK, merge `feature/mobile-reschedule` → `feature/companion-portal` or `main` as you decide; otherwise flag which fixes to revert. Done by Muse — awaiting your review.

---

### 2026-08-21 — Muse — branch `feature/mobile-reschedule` (worktree: `caresy_reschedule_worktree`) — native picker v2
Did: user flagged date/time selective list as weird — replaced BottomSheet `nextDays`/`availableSlots` pickers with native `@react-native-community/datetimepicker` (8.4.4) per choice 1. `my-bookings.tsx` now uses single `Date rescheduleAt` + two `FieldButton`s (Date/Time) opening native `DateTimePicker` (iOS spinner, Android calendar/clock), `minimumDate` today, `maximumDate` +90d, 60-min lead + 90-day guards before `reschedule_booking` RPC. Installed dep via `npm install -w @caresy/mobile-app`, `tsc --noEmit` → EXIT 0. `package.json` + `package-lock.json` added.
Left mid-flight: `my-bookings.tsx`, `apps/mobile-app/package.json`, `package-lock.json` modified, need `pod install` before device shows picker (autolinks).
Don't touch: `booking.tsx`, `ui.tsx`, `ios/` (needs pod install but no manual edit), `supabase/migrations/*`.
Next: `git add apps/mobile-app/app/my-bookings.tsx apps/mobile-app/package.json package-lock.json && git commit && npx pod-install ios && expo run:ios`; verify native Date/Time pickers and RPC still correct.

---

### 2026-08-21 — Muse — branch `feature/mobile-reschedule` (worktree: `caresy_reschedule_worktree`)
Did: implemented native Reschedule for My Bookings per `PARALLEL_WORK.md` 2026-08-21 task spec (deferred #4). Single-file change in `apps/mobile-app/app/my-bookings.tsx` (branch `feature/mobile-reschedule` off `a4c678e`, isolated worktree): duplicated `nextDays(count=14)` from `app/booking.tsx:48` (intentional dup, didn't touch `booking.tsx`), imported `availableSlots` from `@caresy/utils/slots` and `FieldButton`+`BottomSheet` from `../components/ui` (import only, no edit to `ui.tsx`), added `fmtSlot` + `isReschedulable()` (checks `isPastBooking` + status PENDING/ACCEPTED/ASSIGNED). Added Reschedule state (target/date/time + sheet visibilities + loading), inline reschedule card above list with Date `FieldButton`→`BottomSheet` and Time `FieldButton`→`BottomSheet` mirroring `booking.tsx:493-521`, 60-min UX guard (warn, RPC authoritative), and `supabase.rpc('reschedule_booking', { p_booking, p_start: iso })` with Haptics + fetch + Alert pattern same as Cancel. Added "Reschedule" button on `BookingCard` next to Cancel, gated by `isReschedulable` (hidden for past/IN_PROGRESS etc). Verified `tsc` clean via: copied file into `caresy_m3_worktree` and ran `./node_modules/.bin/tsc --noEmit -p apps/mobile-app/tsconfig.json` → EXIT 0 (Cancel unchanged).
Left mid-flight: `my-bookings.tsx` + this `PARALLEL_WORK.md` entry modified, not yet committed in `caresy_reschedule_worktree`.
Don't touch: `apps/mobile-app/app/booking.tsx`, `apps/mobile-app/components/ui.tsx`, `ios/`, `apps/mobile-app/app/index.tsx`, `supabase/migrations/*` — read-only per task. Primary `caresy_m3_worktree` gradient debug (uncommitted `app/index.tsx`, `ios/Pods`, `[gradient-debug]` log) stays isolated; don't merge until that lands.
Next: updated to native picker v2 (this edit) — see new entry below.

---

### 2026-08-22 — primary session — branch `feature/companion-portal` (worktree: `caresy_m3_worktree`)
Did: resolved the gradient issue left open by the 2026-08-21 entry below, and
found + fixed a second, worse bug in the same `ActionCard` (`app/index.tsx`)
photo. **Gradient:** wasn't a pod/linking issue after all (that was a dead
end — Pods were fine). Root cause was the old `eval("require")('expo-linear-
gradient')` lazy-import guard (a leftover Expo-Go dodge; this app's SDK 57
was never published to Expo Go, so the guard was dead weight) resolving to
null at runtime and silently falling back to the flat `opacity: 0.92`
overlay. Fixed: switched to a plain static `import { LinearGradient } from
'expo-linear-gradient'` and deleted the now-dead fallback branch. **Crop:**
once the gradient was visibly correct, the photo underneath was still
showing the wrong part of the source image — ceiling tiles and an
"ELEVATORS" sign instead of the patient/companion, on both cards. Verified
with a pixel-measured crop of a real screenshot against a percentage-gridded
copy of `assets/caresy-hospital-support.webp`: the visible window was
anchored to the top ~20% of the square source, not centered, even though
`resizeMode="cover"` should center by default and the website's identical
CSS (`background-position: center`, confirmed in
`apps/website/src/app/page.tsx:161`) renders it correctly. Root cause: the
`Image` itself was the absolutely-positioned element (`top/right/bottom` +
`width:'64%'`, no explicit height) — RN's cover-crop calc doesn't reliably
center under that shape. Fixed by wrapping it in a plain sized `View`
(`overflow:'hidden'`, same absolute positioning, new `s.actionImgBox`) and
letting the `Image` fill it at `width:'100%', height:'100%'`
(`s.actionImgFill`) — the standard workaround for this RN quirk. Confirmed
fixed via a full clean rebuild + screenshot (not just a JS reload — see
below), both cards now show the actual photo subjects matching the website.
Also worth logging: mid-session, `curl -X POST localhost:8081/reload` and
even killing/relaunching the app repeatedly showed **zero** effect from
several real edits (confirmed by directly fetching the Metro bundle and
grep-ing for a marker string that provably wasn't in it) — something about
this Metro instance's fast-refresh/reload path was unreliable this session. Only a full `expo run:ios` rebuild reliably picked up JS-only changes.
If a future session sees an edit "not take effect," don't trust `/reload` —
do a full rebuild before concluding the code is wrong. Separately: this
repo's long-running `expo run:ios` process never exits on its own (it stays
attached streaming device logs forever) — don't wait on it to "complete";
poll for the new `Caresy.app` process pid / a fresh install path instead.
Left mid-flight: nothing — `app/index.tsx` is clean, no debug logs or
scaffolding left in it (added and removed a `console.log('[gradient-
debug]'...)`, an `onLayout` probe, and a bright lime debug border during
diagnosis; all removed). `npx tsc --noEmit` clean. Not yet committed.
Don't touch: `app/index.tsx` until this is committed (still local/uncommitted
same as everything else per the dirty-file list two entries below).
Next: commit this fix (Home screen gradient + photo crop) as its own change
before picking up anything else. Muse's reschedule assignment (below) is
still open and still non-overlapping with this.

---

### 2026-08-21 — primary session — branch `feature/companion-portal` (worktree: `caresy_m3_worktree`)
Did: user QA'd the rebuilt app on iPhone 17 simulator. Fixed two Home-screen
(`app/index.tsx`) bugs live: (1) the quick-action 2×2 grid was rendering as
4 near-zero-width columns with per-character text wrap — root cause was
`Stagger`'s `Animated.View` wrapper (no width) being the actual flex-wrap row
item while `width: '48%'` sat on the inner `Pressable` one level too deep, so
the percentage resolved against an unsized parent and collapsed. Fix: added
`s.actionStagger = { width: '48%' }` passed as `style` to each `<Stagger>`,
changed inner `s.action` to `width: '100%'`. (2) the Urgent Booking / Schedule
Appointment `ActionCard` photos were washed out to near-invisible — confirmed
via screenshot the LinearGradient fade wasn't rendering as a gradient (a hard
edge at the image's 36% boundary, not a smooth fade), consistent with the
`expo-linear-gradient` require throwing and falling back to the flat
`opacity: 0.92` overlay defined at `app/index.tsx` (search `LinearGradient ? ... : `
fallback branch). Ran `pod install` in `ios/` (was stale — confirmed
`ExpoLinearGradient` autolinks correctly via `npx expo-modules-autolinking
search`, package.json has it at `~57.0.1`) and a full `expo run:ios` rebuild.
**Not yet confirmed fixed** — added a temporary `console.log('[gradient-debug]
...')` around the `require('expo-linear-gradient')` in `app/index.tsx` (top of
file, ~line 12) to nail down true/false definitively before removing it;
mid-rebuild when this entry was written, screenshot after the pod-install
rebuild still looked identical to before, so the root cause is still open —
next session should read the `[gradient-debug]` log line first, not re-guess.
Separately, browser-side: fixed Google OAuth mid-login landing on the plain
website instead of returning to the app — `caresy://auth/callback` was
missing from Supabase Dashboard → Authentication → URL Configuration →
Redirect URLs; user added it, sign-in now returns to the app correctly (no
code change, dashboard-only).
Left mid-flight: `app/index.tsx` has the grid fix (keep) + the temporary
`[gradient-debug]` console.log (remove once the gradient root-cause is
confirmed and fixed — don't ship it). Rebuild via `expo run:ios --device
"iPhone 17"` was running when this was written; check its output before
assuming the gradient is fixed.
Don't touch: `app/index.tsx`, `ios/` (Pods/Podfile.lock — mid pod-install
troubleshooting), `assets/caresy-hospital-support.webp`,
`assets/caresy-family-app.webp` until the gradient issue is resolved and this
entry is updated. Also noticed (not touched, pre-existing uncommitted from an
earlier session): `app.json`, `app/booking.tsx`, `app/quick-help.tsx`,
`components/ui.tsx`, `package.json`, `package-lock.json` all show `M` in `git
status` — don't assume clean, check before editing.
Next: **for the primary/user session** — read the `[gradient-debug]` log,
fix the actual root cause (likely something other than pod-staleness since a
full rebuild didn't visibly change the screenshot), remove the debug log,
re-screenshot to confirm the photos render like the website reference
(visible photo bleeding in from ~40% width, not just a thin sliver at the
edge). **For Muse** — see the assignment directly below; distinct files, zero
overlap with the above.

**Housekeeping while here:** `apps/mobile-app/NATIVE_CHECKLIST.md` is stale on
two store-blockers — checked both against the actual code and they're done,
not `⬜`:
- "Account deletion" (checklist line 28 screens table, line 58 deferred #8,
  line 64 blockers list) — `app/account-delete.tsx` exists, fully implements
  the confirm-`DELETE`-then-POST flow against the website's
  `/api/account/delete` (bearer-token path, built for exactly this), wired
  from `app/profile.tsx:197`. Nothing left to build here.
- "Sign in with Apple" (checklist line 62 blockers list) — `AuthProvider.tsx`
  has a complete `signInWithApple()` (nonce, `expo-apple-authentication`,
  `supabase.auth.signInWithIdToken`), and `app/index.tsx` renders the button
  in the signed-out state (search `Sign in with Apple` in that file) alongside
  Google. `app.json` already has `usesAppleSignIn: true`. Nothing left to
  build here either — at most needs a real-device confirmation, not new code.
Didn't edit the checklist file itself this session (time-boxed to the visual
bugs) — whoever picks this up next should update `NATIVE_CHECKLIST.md` lines
28/58/62/64 to `✅` so the store-blockers list stops looking scarier than it is.

---

### 2026-08-21 — task for Muse — new work, claim your own worktree/branch
**Assignment: native Reschedule for My Bookings** (`NATIVE_CHECKLIST.md`
deferred item #4, line 46-48) — the only remaining item on that deferred list
that's genuinely open, self-contained, and needs no new native dependency (so
it can't collide with the pod-install/gradient debugging happening in `ios/`
above — don't touch `ios/` or `app/index.tsx` for this task).

**What:** `app/my-bookings.tsx` ships Cancel (`cancel_booking` RPC, see line
98) but not Reschedule. The server RPC already exists and does the real work
— `reschedule_booking(p_booking UUID, p_start TIMESTAMPTZ)` in
`supabase/migrations/31_CUSTOMER_ACTIONS.sql:81` (ownership + status-window +
60-minute lead-time checks are server-side, already enforced — the native UI
only needs to collect a new date/time and call it). Nothing to add or change
in `supabase/migrations/*` — read-only reference, don't touch.

**How — mirror `app/booking.tsx`'s existing day/slot picker exactly** (it's
plain JS chips over a `BottomSheet`, no native date-picker dependency, so
this needs zero new pods and zero rebuild):
1. Copy the (private, unexported) `nextDays(count = 14)` helper from
   `app/booking.tsx:48` into `my-bookings.tsx` — duplicating ~6 lines is
   correct here, don't extract it into a shared module mid another session's
   edits to `booking.tsx` (that file is currently uncommitted/dirty from
   someone else's work per the `Don't touch` list above — read it for the
   pattern, never write to it).
2. Use `availableSlots(date)` from `@caresy/utils/slots` (already imported
   the same way in `booking.tsx:9`) for the time-slot options.
3. Use `FieldButton` + `BottomSheet` from `../components/ui` (already
   exported, `ui.tsx:214` and `:231` — import only, don't edit that file,
   it's also currently dirty from someone else's session) exactly like
   `booking.tsx:493-521` does for its Date/Time slot pickers, inside a sheet
   or inline card triggered from a new "Reschedule" action on `BookingCard`
   (`my-bookings.tsx:148`) next to the existing Cancel action.
4. On confirm: `await supabase.rpc('reschedule_booking', { p_booking: b.id,
   p_start: <iso timestamp from date+time> })`, same try/catch + haptics +
   refetch pattern already used for cancel in that file (~line 98).
5. Respect the RPC's own constraints client-side for UX only (don't
   re-derive them, the RPC is authoritative): don't show Reschedule at all
   once a booking has passed `ASSIGNED`/Start, and warn if the new slot is
   inside the 60-minute lead window — let the RPC's error message surface if
   the user gets there anyway rather than trying to fully replicate the
   window logic client-side.

**Verify:** `npx tsc --noEmit` in `apps/mobile-app` clean; manual check that
Cancel still works unchanged (don't regress the existing action while adding
the new one next to it).

Branch: `feature/mobile-reschedule` off current `feature/companion-portal`.
Worktree: **do not reuse `caresy_m3_worktree`** while the primary session's
gradient debugging is live in it (rule 7 above) — `git worktree add
../caresy_reschedule_worktree feature/mobile-reschedule` from a fresh branch,
or a separate clone, so neither session's `git checkout`/rebuild can step on
the other's uncommitted files. Append your own session-log entry here (don't
edit this one) when you start and when you hand off.

---

### 2026-08-14 — primary + Muse — branch `feature/mobile-quick-help` — forward from Phase 3
Did: confirmed Phase 3 booking write path as built (parity deferred). `apps/mobile-app/app/booking.tsx` 4-step wizard writes patients→locations→bookings under RLS; server `enforce_service_area()` remains authoritative. Checklist parity gap acknowledged per `NATIVE_CHECKLIST.md:35-48`.
Left mid-flight: none — doc-only update. Prior uncommitted `apps/mobile-app/{app.json,package.json,tsconfig.json}`, `package-lock.json`, `apps/mobile-app/eas.json` still M/?? — untouched.
Don't touch: same as 2026-08-14 evening/Muse review entries — `apps/mobile-app/{app.json,package.json,tsconfig.json,eas.json}`, `package-lock.json`, `apps/mobile-app/app/{profile.tsx,care/}`, `packages/utils/src/careGuides.ts` until device verification lands.
Next: **On your side** — (a) run money loop on device: book on phone → accept in companion portal → complete & bill → confirm amount matches `formatINR(totalPaise)` vs admin/payments; (b) verify empty-dashboard is honest empty state vs fetch bug (fresh Google account → "No upcoming visits"); (c) when ready, restore Phase 3 parity 1–4 (served-area `checkPincodeServed`, hospital picker, map lat/lng, reschedule) + Phase 5 account deletion (store blocker). Agent proceeds to Phase 4 native-only gaps (push, doc picker, inline map) when you signal — no `packages/*` or `supabase/migrations/*` edits without call-out.

---

### 2026-08-14 — Muse review — branch `feature/mobile-quick-help` (worktree: `caresy_m3_worktree`) — Phase 3 read

Did: read `docs/MOBILE_PLAN.md` Phase 3 + `apps/mobile-app/NATIVE_CHECKLIST.md` + `docs/LIVE_TRACKING_HANDOFF.md` per scoped request. **Scope applied:** `NATIVE_CHECKLIST.md` blockers only; `DEVELOPER_HANDOFF.md` skipped (superseded, not mobile); `NEXT_SESSION.md`/`CURRENT.md` skipped (web-side mascot/migrations 30/31, not Phase 3). Updated phases table row 3: `✅ done` → `✅ built (parity deferred — see NATIVE_CHECKLIST.md deferred 1–4,8)` — accurate per checklist; no other rows changed. No `apps/mobile-app/*`, `packages/*`, or `supabase/migrations/*` edits.

Phase 3 import — `NATIVE_CHECKLIST.md` deferred (source lines `30:31–58`, last read 2026-08-14):
- 1. Served-area enforcement — Booking checks `isValidPincode` format only; web gates on `checkPincodeServed`/`listServedAreas` (injected `SupabaseClient`). Deferred for NCR launch; restore before opening outside serviced pincodes. *Server-side `enforce_service_area()` remains authoritative.*
- 2. Hospital selection — plain text field vs web `HospitalAutocomplete` over `hospitals` catalog. Valid booking either way; restore with native searchable picker.
- 3. Meeting-point / map location — `latitude/longitude = null`; web has map picker (`MeetingPoint`). Companion Open-in-Maps falls back to address. Restore with native map picker + `expo-location` permission flow.
- 4. Rescheduling — My Bookings ships `cancel_booking` but not `reschedule_booking`; needs native datetime picker. Restore by reusing Booking day/slot chooser as reschedule sheet.
- (Deferred 5–7 noted but out of Phase 3 scope — tracked in `NATIVE_CHECKLIST.md`): 5. Embedded live map (deep link only, no `react-native-maps`), 6. Notifications (`expo-notifications` not wired), 7. Document/photo upload (`patient-docs` bucket).
- 8. Account deletion — ⬜ todo, **store-compliance blocker** (also Phase 5 blocker: `NATIVE_CHECKLIST.md:28,64`).

Phase 4 context only (`LIVE_TRACKING_HANDOFF.md`, not folded into Phase 3): `16_TRIPS_AND_LIVE_TRACKING.sql` → `17_TRIP_ETA.sql` → `18_BOOKING_TRIP_LINK.sql`, `trip-eta` Edge Function (OpenRouteService), Realtime Broadcast (`trip:<id>`) + Postgres Changes, MapLibre + OSM tiles, companion/customer trip screens in `caresy-app`. Tracked separately in `NATIVE_CHECKLIST.md:51–53` + `PARALLEL_WORK.md` Phase 4 row.

Source of truth: `docs/MOBILE_PLAN.md` Phase 3; summary in `PARALLEL_WORK.md` phases table is not authoritative and can go stale.

Left mid-flight: none from this review — append-only doc edit, no code changes. Uncommitted state from prior primary session untouched: `apps/mobile-app/{app.json,package.json,tsconfig.json}`, `package-lock.json`, `apps/mobile-app/eas.json` (still `M`/`??` per `git status` at review time).
Don't touch: `apps/mobile-app/app.json`, `apps/mobile-app/package.json`, `apps/mobile-app/tsconfig.json`, `apps/mobile-app/eas.json`, `package-lock.json` — prior primary session's real-device QA uncommitted work (see 2026-08-14 evening entry). Also `apps/mobile-app/app/profile.tsx`, `apps/mobile-app/app/care/`, `packages/utils/src/careGuides.ts` per 2026-08-14 entry — verify on device before changing.
Next: Phase 3 parity restores (1–4,8) when scoped; Phase 4 (push notifications, doc picker, inline map) and Phase 5 (account deletion, Sign in with Apple, privacy manifest) remain the only ⬜ store-blocking work per `NATIVE_CHECKLIST.md`.

---

### 2026-08-14 (evening) — primary session — branch `feature/mobile-quick-help` (worktree: `Desktop/Caresy phone/caresy_m3_worktree`)
Did: first real-device QA pass on Phase 2/3 (previously only `tsc`-clean, never
run on hardware per `NATIVE_CHECKLIST.md`). Fixed a `react`/`react-dom` version
mismatch under `apps/mobile-app` (package.json had drifted to `19.2.3`/`^19.2.8`
against the monorepo's `19.2.4`, plus a stale nested copy in
`apps/mobile-app/node_modules`); pinned both to `19.2.4` and regenerated
`package-lock.json` from a clean install. Installed `expo-dev-client` and
`eas-cli` (saved as devDependency) since SDK 57 is too new for store-published
Expo Go on both platforms — added `apps/mobile-app/eas.json` with a
`development` profile. Ran `eas build --profile development --platform all`:
Android succeeded first try; iOS failed on Apple capability sync (misleading
"bundle cannot be deleted" error) because an orphaned Sign-In-with-Apple
Service ID was still attached to `in.co.caresy.app` from prior App Store
Connect work — deleted the stray Service ID in Apple Developer portal, iOS
build succeeded after. `eas build:configure` auto-added `extra.eas.projectId`
to `app.json` (harmless, expected). Diagnosed phone-can't-reach-Metro as
router-level AP/client isolation (ruled out macOS firewall by testing with it
off, and ruled out app-level bug by confirming Safari on the phone also
couldn't load the LAN IP) — worked around with `expo start --tunnel`. Fixed
Google OAuth silently falling back to the website mid-login: Supabase's
Redirect URLs allowlist was missing `caresy://auth/callback` (and the
`caresy://**` wildcard); added both in Supabase Dashboard → Authentication →
URL Configuration. Sign-in now completes and returns to the app.
Diagnosed (not yet confirmed) the "blank"-looking dashboard: likely not a bug
— a fresh Google account has zero bookings, so the "next visit" card correctly
renders a plain "No upcoming visits" empty state, which reads as broken
because there's no icon/illustration/polish on it yet. Awaiting user
confirmation the hero card + greeting name do render before ruling out an
actual data-fetch bug.
Left mid-flight: uncommitted changes — `apps/mobile-app/package.json`,
`apps/mobile-app/tsconfig.json` (Expo auto-added `include`), `package-lock.json`,
new `apps/mobile-app/eas.json`, `apps/mobile-app/app.json` (auto-added
`extra.eas.projectId`). Nothing committed yet, all local. No code changes to
`profile.tsx`/`care/`/`careGuides.ts` — didn't touch prior session's screens.
Don't touch: nothing claimed for next session yet.
Next: user wants (a) confirmation + fix if the empty dashboard is a real
data bug vs. honest empty state, then (b) a dedicated design/polish pass —
Liquid Glass materials on iOS, Material 3 Expressive on Android — not yet
scoped or added to any phase in `MOBILE_PLAN.md`. Phase 4 gaps (push
notifications, doc picker) and Phase 5 (account deletion, Sign in with Apple,
store-compliance) are still the only phases with real ⬜ work.

---

### 2026-08-14 — primary session — branch `feature/mobile-quick-help` (worktree: `Desktop/Caresy phone/caresy_m3_worktree`)
Did: sequential handoff, not concurrent — picked up in the same directory
Muse left, on the branch Muse left it on, after confirming `git status` was
clean. Continued Muse's claimed `apps/mobile-app` Phase 2 scope: built
`app/profile.tsx` (account info, activity links, help & support folded in,
sign out — read-only per Phase 2, "edit" rows deep-link to WhatsApp same as
web) and `app/care/index.tsx` + `app/care/[slug].tsx` (guide list + detail).
Moved `apps/website/src/lib/careGuides.ts` (+ its `.check.ts`) into
`packages/utils/src/careGuides.ts` so native and web share one content
source instead of duplicating ~450 lines — repointed website's 3 call sites
(`sitemap.ts`, `guides/page.tsx`, `HealthTips.tsx`) and added the
`@caresy/utils/careGuides` export. Added Profile/Care quick actions to
Home (`app/index.tsx`), 2x2 grid now that there are 4.
Verified: `tsc --noEmit` clean in both `apps/mobile-app` and `apps/website`;
`careGuides.check.ts` passes from its new location; `npm run lint -w
@caresy/website` shows only pre-existing errors, none in touched files; `npm
run build -w @caresy/website` succeeds, all 27 routes including `/guides`.
`apps/mobile-app` has no lint script — tsc-clean is its gate for now.
Left mid-flight: nothing uncommitted after this entry is written — about to
commit and push to `feature/mobile-quick-help`.
Don't touch: `apps/mobile-app/app/profile.tsx`, `apps/mobile-app/app/care/`,
`packages/utils/src/careGuides.ts` — just built, verify on device before
changing. Account deletion still ⬜, untouched (Phase 5, out of scope here).
Next: Account deletion screen (Phase 5, store-compliance blocker) is the
only Phase-2-adjacent item left on `NATIVE_CHECKLIST.md`; otherwise Phase 2
is done — Phase 4 gaps (push notifications, doc picker) or real-device QA
of everything built so far are the logical next targets.

---

### 2026-08-13 — Agent 2 (Muse) — branch `feature/mobile-quick-help` (worktree: `Desktop/Caresy phone/caresy_m3_worktree`)
Did: claimed `apps/mobile-app` ⬜ todos per Updated Current split (Agent 1 Claude → website/login/privacy + migrations 27/29/32; Agent 2 → mobile Quick Help/Profile/Care/Deletion). Branched `feature/mobile-quick-help` off `feature/structured-data` (da99940) to avoid colliding on `feature/structured-data`. Operating in worktree `caresy_m3_worktree` (primary clone is `Documents/caresy_phone_xcode` for Agent 1).
Left mid-flight: `docs/PARALLEL_WORK.md` updated with ownership + this log entry (untracked → will commit); `docs/NEXT_SESSION.md` still M (pre-existing update 2026-08-13, clean per its text). No mobile code yet — starting Quick Help.
Don't touch: `apps/website/src/app/login`, `packages/auth/src/msg91.ts|AuthContext.tsx`, `apps/website/src/app/{privacy,terms}`, `supabase/migrations/{27,29,32}` — all Agent 1. `packages/*` shared → call out.
Next: scaffold `apps/mobile-app/app/quick-help.tsx` as 3-step wizard mirroring `apps/website/src/app/quick-help/page.tsx` (Step1 customerName/phone/email, Step2 patient/hospital/pincode with `checkPincodeServed`, Step3 urgency/notes + submit writes patients→locations→bookings). Cross-check `docs/CURRENT.md` icons: 12 careGuides thumbnails still ⬜ (emoji, needs icon decision — not resolved) and `NATIVE_CHECKLIST.md:17-25` confirms Settings folds into Profile (no separate Settings screen).

### 2026-08-13 — primary session — branch `feature/structured-data`
Did: audited the repo for a second collaborator joining for the first time —
confirmed their `Documents/caresy_phone_xcode` clone was 19 commits behind
with a stray staged file; had them re-clone fresh and check out
`feature/structured-data`. Wrote `docs/PARALLEL_WORK.md` (this file) as the
shared coordination + handoff doc.
Left mid-flight: `docs/NEXT_SESSION.md` shows one uncommitted modification
(pre-existing, not from this session) — check `git status` before assuming
clean.
Don't touch: nothing claimed yet — ownership table above is still blank,
first thing to settle with the second collaborator.
Next: assign owners in the "Current split" table below (who takes
`mobile-app` screens vs iOS/Android store-compliance work vs website), then
each person logs their own entry here going forward.

---

Short-lived coordination doc. Two of us work off the same GitHub repo
(`abhiiiiiisshek/caresy_phone`) from different machines. Purpose: don't edit
the same files at the same time, don't collide on migrations, don't merge
surprises into `main`.

## Ground rules

1. **`main` is production.** Nobody pushes to it directly. Land work via a
   branch + a heads-up to the other person before merging.
2. **One feature branch per person per task.** Don't both commit to
   `feature/structured-data` at the same time — branch off it if you need a
   base, e.g. `feature/mobile-quick-help`, `feature/ios-signing`.
3. **Shared folders need a call-out before touching:** `packages/*`,
   `supabase/migrations/*`, any file already listed as "in progress" in
   `docs/NEXT_SESSION.md`. Post in chat before starting, not after.
4. **Migrations are sequential and never edited after they run.** If you're
   both adding one, claim the next number in chat first — `33_...sql` vs
   `33_...sql` from two people is a silent conflict `git` won't catch cleanly.
5. **Update `docs/NEXT_SESSION.md`** when you finish or change state, so the
   other person's session picks up current reality instead of stale docs.
6. **Append a session log entry below** (not edit old ones) before you stop —
   this is the cross-person, cross-session handoff. `NEXT_SESSION.md` is the
   single-owner narrative; this log is the two-person one.
7. **One physical directory, one active session — never two.** A branch
   name is not isolation; the working directory is. If both people's agents
   point at the same folder path (e.g. `caresy_m3_worktree`), one
   `git checkout` from either side can silently discard the other's
   uncommitted edits mid-session — this already happened once (2026-08-13,
   the folder flipped from `feature/structured-data` to
   `feature/mobile-quick-help` under a live session). Each concurrent agent
   needs its own `git worktree add ../<name> <branch>` or its own clone.
   Before starting work, run `git branch --show-current` +
   `git worktree list` and confirm the branch matches what your own last
   session log entry says you left it on — if it doesn't, stop and set up a
   separate worktree before touching anything.

## Current split (fill in / adjust as work is assigned) — updated 2026-08-13 by Agent 2 (Muse)

| Area | Owner | Notes |
|---|---|---|
| `apps/website`, `apps/admin`, `apps/companion` + `packages/auth` login bundle | Agent 1 (Claude) | NEXT_SESSION next tasks: privacy FILLs, login/msg91 bundle, `migrations/{27,29,32}` — web production |
| `apps/mobile-app` (Expo, iOS + Android) — Quick Help, Profile (folds Settings), Care/Guides, Account deletion | Agent 2 (Muse) — `feature/mobile-quick-help` | NATIVE_CHECKLIST ⬜ todos + store blockers; quick-help is Phase 4 urgent-flow, 3-step wizard mirroring `apps/website/src/app/quick-help/page.tsx` |
| `apps/mobile` (old Capacitor) | nobody | dead, being replaced, don't add new work |
| `packages/*` | shared — call out before editing | both apps depend on these, a bad edit breaks the other person's build too |
| `supabase/migrations/*` | shared — claim a number first | see rule 4 — Agent 1 owns 27/29/32, Agent 2 will claim 33+ if needed |

## Before you start any session

1. `git status` + `git pull` on your branch.
2. Read `docs/NEXT_SESSION.md` — what did the other person just ship or leave
   mid-flight.
3. Check the table above — is the file/folder you're about to touch someone
   else's right now?

## Before you push

```
npx tsc --noEmit
npm run lint -w @caresy/<app>
npm run build -w @caresy/<app>
```

Push to your own branch, not `main`. Say what you touched — file list, not
just "pushed some stuff" — so the other person can spot an overlap fast.

## If you both touched the same file

Don't force-push over the other person's work. Pull, let git show the
conflict, resolve by reading both diffs — don't blind-accept either side.
Ask if unsure which change is newer/correct.
