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
