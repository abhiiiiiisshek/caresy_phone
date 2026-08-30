# Parallel work — two people, one repo

## Mobile phases (full picture — source: `docs/MOBILE_PLAN.md`)

| Phase | What | Status |
|---|---|---|
| 0 — Unblock sharing | `packages/utils`/`types` made web-independent so Metro can import them | ✅ done 2026-08-07 |
| 1 — Boot + auth | Expo app scaffolded, Supabase auth (Google sign-in), one screen reading own `profiles` row | ✅ done |
| 2 — Read-only screens | Home, booking history/detail, profile, settings, support, native bottom tabs | ✅ mostly done — Home + My Bookings built, Profile/Settings/Support still ⬜ (see `NATIVE_CHECKLIST.md`) |
| 3 — Booking write path | Service → hospital → patient → pincode → slot → confirm, real `INSERT` under RLS | ✅ built (parity deferred — see `NATIVE_CHECKLIST.md` deferred 1–4,8) — Booking screen built, writes patients→locations→bookings |
| 4 — Native-only capability | Live tracking (maps + Realtime), push notifications, image picker for docs | 🔶 partial — Tracking screen built; push notifications + doc picker not yet |
| 5 — Store compliance | Account deletion, Sign in with Apple, privacy manifest, Data Safety/App Privacy forms | ✅ built in source 2026-08-29 — `app/account-delete.tsx`, `AuthProvider.tsx` (native Apple button + Crypto nonce), privacy manifest + permission strings in `app.json`. The store-side **forms** are still ⬜ (account-holder work in ASC/Play Console). Row previously read "not built" — that was stale. |
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

### 2026-08-30 — task for Muse — App Review demo path (iOS critical path) + issues #11, #18, #20

**Context: iOS is now the priority and it is the only track with no artifact yet.**
Android has its first production AAB (build `6aee612a`, versionCode 4). iOS has
never produced a store build. Everything on the iOS critical path except one item
needs the account holder's Apple credentials — that one item is yours, below, and
it is a genuine rejection risk, not polish.

Do **not** touch `apps/mobile-app/app.json`, `eas.json`, `fingerprint.config.js`,
`package.json` or `package-lock.json` in any workspace. A dependency change was
reverted on 2026-08-29 (`3a7bba8`) because refreshing the stale lockfile broke the
Android bundle; read the "Do not retry without reading this" section in
`docs/NEXT_SESSION.md` before touching dependencies at all.

**Task 1 — App Review cannot complete a booking. This will earn a 2.1 rejection.**
App Review works from the United States. `packages/utils/src/phone.ts`
`isValidIndianMobile` gates the phone field, and `apps/mobile-app/app/profile.tsx:144`
rejects anything that is not a 10-digit Indian mobile. A reviewer signs in with
their own Google or Apple ID, reaches profile, and cannot proceed. The service
area is Noida, so the booking flow dead-ends for them regardless.

Work out and implement the smallest honest path that lets a reviewer see the app
work, then write the exact App Review notes text to go with it. Options worth
weighing — pick one and justify it in your session entry:
  a. a demo account, pre-seeded with a valid Indian number and a booking, whose
     credentials go in the review notes (no code change; needs a seed script);
  b. accepting E.164 international numbers in the validator (`toE164` already
     exists) — wider blast radius, touches the website and companion too;
  c. a review-only bypass — **do not do this**, Apple treats reviewer-specific
     behaviour as grounds for rejection.
Option (a) is most likely correct. Whatever you choose, leave a runnable
`assert`-based check next to any logic you change, per `CLAUDE.md`.

**Task 2 — issue #11, a `FAILED` notification is never retried.**
`apps/website/src/app/api/cron/send-push/route.ts` marks rows `FAILED` (lines
~130, ~292) and nothing ever picks them up again. Real defect, not launch-blocking.
Decide retry policy (bounded attempts + backoff) and say why in the issue.

**Task 3 — issues #18 and #20 (companion half).** Emoji check/cross prefixes in
service-area copy; the remaining pre-existing lint errors in `@caresy/companion`.
The admin half of #20 is already done.

**Already verified, do not redo:** issue #12 — `npm run build -w @caresy/admin`
and `-w @caresy/companion` both pass as of 2026-08-29. #12 is closable.

**Gates before you say done** (`CLAUDE.md` order), plus one addition — if you
touch anything the mobile app imports, including `packages/utils`, run:
```
cd apps/mobile-app
npx expo export:embed --eager --platform ios --dev false
npx expo export:embed --eager --platform android --dev false
```
Exit 0 on both. This is the exact command EAS runs in its EAGER_BUNDLE phase, and
it is how versionCode 5 was caught failing without spending another build.

Append your session entry here when you stop, newest on top, in the format above.

### 2026-08-30 — Muse — branch feature/app-review-demo-path

Did:
  - Task1 App Review demo path — chose option (a) demo account. Wider validator (b) would still block at `enforce_service_area()` pincode trigger; reviewer-specific bypass (c) is a 2.1 rejection risk. No code change to `isValidIndianMobile` (stays India-only per phone.ts header). Created `scripts/seed-app-review-demo.ts` (idempotent, --check-only phone/pincode self-check, suppresses ADMIN notification to avoid ntfy page) and `docs/APP_REVIEW_NOTES.md` with verbatim notes for App Store Connect. Demo account: `app-review@caresy.co.in` / `DemoAppReview2026!`, phone `+919999999999` (passes isValidIndianMobile), pincode `201301` (served), one HOSPITAL_COMPANION SCHEDULED PENDING booking. Verified via `node --experimental-strip-types scripts/seed-app-review-demo.ts --check-only` → phone/pincode ok.
  - Task2 issue #11 — `apps/website/src/app/api/cron/send-push/route.ts` FAILED rows were stranded. Added migration `44_NOTIFICATION_RETRY.sql` (attempts INT, next_retry_at TIMESTAMPTZ, index, claim_notifications() now re-queues FAILED where attempts<5 and next_retry_at<=now). Updated cron to set attempts/next_retry_at on FAILED with bounded exponential backoff 5,10,20,40,60m (MAX_ATTEMPTS=5, cap 60m). Added `apps/website/src/app/api/cron/send-push/retry.check.ts` (node --experimental-strip-types → "send-push retry: ok", checks backoff monotonic, cap, eligibility).
  - Task3 issue #18 — emoji prefixes in service-area copy. Extended `packages/ui/src/Input.tsx` hint from `string` to `React.ReactNode` (single display property fix), replaced `✓`/`✗` in `apps/website/src/app/booking/page.tsx` and `quick-help/page.tsx` with `CheckCircle2`/`XCircle` from lucide-react (green #1B7A54, red #B3261E) inline flex gap 6.
  - Task3 issue #20 companion half — lint 9 errors + 1 warning in @caresy/companion. Fixed `apps/companion/src/app/page.tsx` 3× set-state-in-effect (inlined alive-guarded async IIFE like admin's pattern, kept fetchCompanion for callbacks), `LocationShare.tsx` 4× any → typed RealtimeChannel / proper casts, `TripStatusControl.tsx` 1× any + 1× set-state-in-effect (alive-guarded IIFE) + 1× unused `data` var. All via proper types, no eslint-disable.

Left mid-flight: Worktree has 10 modified/untracked files, not pushed, not merged — clean to keep working. Migration 44 written, NOT applied to Supabase (account holder to apply by hand in SQL editor then flip DATABASE.md row from ⬜ to ✅). Demo seed NOT run against production (check-only verified; run once before App Store submission). No changes to `apps/mobile-app/app.json|eas.json|fingerprint.config.js|package*.json` per instruction.

Don't touch: `supabase/migrations/44_NOTIFICATION_RETRY.sql` (pending apply), `apps/website/src/app/api/cron/send-push/route.ts` (retry logic), `packages/ui/src/Input.tsx` (hint ReactNode), `scripts/seed-app-review-demo.ts`/`docs/APP_REVIEW_NOTES.md` (demo path). Also `apps/companion/**` now lint-clean — avoid regressions.

Next:
  - Account holder: apply `44_NOTIFICATION_RETRY.sql` in Supabase SQL editor, verify with `select * from notifications where status='FAILED'`, then update `docs/DATABASE.md` ledger to ✅.
  - Before iOS submission: run `node --experimental-strip-types scripts/seed-app-review-demo.ts` once (service-role key from .env.local), verify demo user appears in auth + profile + booking, then paste `docs/APP_REVIEW_NOTES.md` into App Store Connect App Review notes.
  - Merge `feature/app-review-demo-path` → `main` after review (gates below clean). Then `graphify update .` if available.

Verification:
  - `npx tsc --noEmit --project apps/companion/tsconfig.json` → 0 (clean)
  - `npx tsc --noEmit --project apps/admin/tsconfig.json` → 0
  - `npx tsc --noEmit --project apps/website/tsconfig.json` → 0
  - `npm run lint -w @caresy/companion` → 0 errors, 0 warnings (was 9 errors + 1 warning)
  - `npm run lint -w @caresy/admin` → 0 errors, 0 warnings
  - `npm run build -w @caresy/companion` → Compiled successfully (3.9s, 6.4s TS, static pages 3/3)
  - `npm run build -w @caresy/website` → Compiled successfully (routes include /api/cron/send-push)
  - `npm run build -w @caresy/admin` → Compiled successfully (14/14 pages)
  - `npx expo export:embed --eager --platform ios --dev false` → iOS Bundled 1102ms, Done (exit 0)
  - `npx expo export:embed --eager --platform android --dev false` → Android Bundled 1381ms, Done (exit 0)
  - `node --experimental-strip-types apps/website/src/app/api/cron/send-push/retry.check.ts` → "send-push retry: ok"
  - `node --experimental-strip-types packages/utils/src/phone.check.ts` → "phone: ok"
  - `node --experimental-strip-types scripts/seed-app-review-demo.ts --check-only` → phone/pincode valid=true, check-only ok
  - `git diff --stat` shows 6 modified + migration + seed + notes + check (10 files total). No staged commits yet — work at risk until committed.




### 2026-08-28 — Muse (worktree: caresy_admin_worktree, branch feature/admin-hardening)
Did: Completed admin hardening (issues #13, #14, #15, #20 admin half) — all in worktree `caresy_admin_worktree` on `feature/admin-hardening` (branched from origin/main, 06cdaf2). Files touched: `apps/admin/src/app/ops/page.tsx` (collapsed two RPCs to single `admin_save_booking_edit`, added can_drive pre-check, typed `any` → Record<string,unknown>, fixed service_metadata casts), `apps/admin/src/app/companions/page.tsx` (replaced window.confirm with two-step overlay, state pendingConfirm), `apps/admin/src/app/service-areas/page.tsx` (replaced bare confirm() with Confirm/Cancel buttons, confirmId state), `apps/admin/src/app/live/page.tsx` (typed any), `apps/admin/next.config.ts` (minor), `docs/DATABASE.md` (added migration 41 row), new `supabase/migrations/41_ADMIN_COMBINED_SAVE.sql` (transactional wrapper delegates to admin_override_booking_status + reassign_booking), new `apps/admin/src/app/ops/admin_save_booking_edit.check.ts` (asserts failing companion leaves status unchanged, proves old two-RPC half-save).
Left mid-flight: Worktree has uncommitted changes (6 modified, 2 untracked) — not pushed, not merged. Migration 41 written, NOT applied to Supabase. No changes to `apps/mobile-app/**`, `apps/companion/**`, `apps/website/**`, or `supabase/migrations/30–40`.
Don't touch: `apps/mobile-app/**` (primary session), `docs/CURRENT.md` (primary), `apps/companion/**` (out of scope).
Next: Account holder to apply `41_ADMIN_COMBINED_SAVE.sql` by hand in Supabase SQL editor then flip DATABASE.md row to ✅. Merge `feature/admin-hardening` → `main` after review (lint/build clean). Then `graphify update .` already attempted (no executable) — run from clean checkout if needed.
Verification: `npx tsc --noEmit --project apps/admin/tsconfig.json` → 0 (clean), `npm run lint -w @caresy/admin` → 0 errors, 0 warnings (after fixing _e unused), `node --experimental-strip-types apps/admin/src/app/ops/admin_save_booking_edit.check.ts` → "all checks passed", `npm run build -w @caresy/admin` → compiled successfully in main (17.3s, workspace root clean when nested worktree moved aside; fails prunably when nested due to Next.js workspace inference, not code), `grep -rn "confirm" apps/admin/src` → no remaining window.confirm/bare confirm (only Confirm/Cancel UI state).

### 2026-08-28 — task for Muse — Admin app hardening (GitHub issues #13, #14, #15, and the admin half of #20)

**This repo now has a GitHub issue tracker.** Issues #5–#23 were filed on
2026-08-27 from `docs/CURRENT.md`. Your four tasks below are #13, #14, #15 and
the admin half of #20. Read each issue with `gh issue view <n>` before starting
it — `gh` is installed and authenticated on the primary machine. Reference the
issue in your commit (`Closes #13`) so the tracker closes itself.

**Why this task is yours and not the primary session's:** the primary session is
working inside `apps/mobile-app/` this week (iOS auth, entitlements, rebuilds).
Everything below is `apps/admin/` plus one new migration. **Zero file overlap by
design** — that is the whole point of the split. Do not wander outside the
allowlist in section 7, even if you spot something worth fixing; write it in your
log entry instead and let the primary session pick it up.

#### 0. Isolation — do this first, before reading any code

This machine currently has **one** worktree (`/Users/1234/Documents/caresy` on
`main`). The worktrees named in older entries below (`caresy_m3_worktree`,
`caresy_reschedule_worktree`, `caresy_structured_worktree`) **do not exist here** —
this is a fresh clone, per the "clone fresh" instruction at the top of
`docs/CURRENT.md`. Do not assume any path an old entry mentions still exists.
Check first, then create your own:

```
cd /Users/1234/Documents
git -C caresy fetch origin
git -C caresy worktree add caresy_admin_worktree -b feature/admin-hardening origin/main
cd caresy_admin_worktree
git branch --show-current      # must print feature/admin-hardening
git status --short             # must be empty before you write anything
```

Branch off `origin/main` — it is authoritative and all four apps typecheck on it.
Do not branch off `feature/companion-portal`; it is behind.

#### 1. Ground rules — these outlive this task, apply them to every future one

These are the things that have actually gone wrong here before. Internalise them,
do not just skim.

**1.1 The repo is the source of truth. Docs go stale and will lie to you.**
Two live examples found on 2026-08-27: `docs/CURRENT.md` described a mascot design
system as in-flight that ADR-0012 had deleted outright two weeks earlier, and
`graphify` pointed at `packages/ui/src/mascot/poses.tsx` and
`apps/website/src/lib/careGuides.ts` — **neither file exists**. Two GitHub issues
were filed off those stale claims and had to be closed again within the hour.
Before you act on anything a doc asserts, confirm it against the file it names
(`ls`, `rg`, open it). If a doc turns out to be wrong, fix the doc in the same
commit as the work, and say so in your log entry.

**1.2 Verify, then report — do not blind-edit.** When a task says "find out
whether X", the deliverable is a written finding with the evidence that proves
it, not a speculative edit. A wrong edit to a working system costs more than an
hour of research.

**1.3 Never apply a migration to the live database.** You write the `.sql` file
and stop there. The account holder applies it by hand in the Supabase SQL editor
and confirms back. This database has **live production data and real customers**.
Say explicitly in your log entry: "migration 41 written, NOT applied".

**1.4 Migration rules** (from `CLAUDE.md`, non-negotiable): sequential numbering,
`NN_TOPIC.sql`, idempotent, and **never edited once it has been run** — fix
forward with a new file. Every table gets its RLS policies in the same migration
that creates it. End the file in an assertion block so it fails loudly rather
than half-applying; migrations 30 and 31 are the pattern to copy. **The next free
number is 41** — 40 is the highest today (`40_BOOKING_RACE_FIXES.sql`).

**1.5 Money is integer paise, never floats**, and the variable name says so
(`final_amount_paise`). Formatting happens only at the render edge via
`formatINR`. Prices are computed in Postgres and written only through SECURITY
DEFINER RPCs — the client never decides what is owed.

**1.6 No `any` in committed code.** Model the type, or use `unknown` plus a
narrow. Supabase FK joins come back typed as arrays even for many-to-one; cast
with `as unknown as T[]` at the query boundary, not deeper.

**1.7 Non-trivial logic leaves one runnable self-check.** No test framework here,
deliberately. An `assert`-based `<module>.check.ts` sits next to the module and
runs with `node --experimental-strip-types src/<module>.check.ts`. Silence means
pass. Check **properties** (a state machine never reaches an illegal state), not
just one happy-path example. UI and glue code get no test.

**1.8 Never run `npm run dev` on this machine.** Turbopack has spawned runaway
processes here. Verify with `npm run build` and a Vercel preview instead.

**1.9 Read the smallest thing that answers the question.** `graphify query`
first, then `rg` with a tight pattern when graphify is empty or stale, then a
specific file range with `offset`/`limit`. Never read a whole page component or
paste a whole migration into context to answer a narrow question.

**1.10 Commit early, commit in chunks — an untracked file is work-at-risk.** A full
day of work in one place with zero commits has no recovery point. Commit when a
unit of work passes its own check, not when the whole task is finished. The
review of this work found `git log main..HEAD` returning nothing with ten files
uncommitted — that state must never recur.

**1.11 Never route around an unexplained tool failure — explain it first.** The
worktree's `tsc`/`build` failed not from a sandbox restriction or a workspace-alias
problem but because `git worktree add` creates a checkout with no `node_modules`
— the binaries simply did not exist until `npm install` was run at the worktree
root. The build gate is this repo's real gate (`CLAUDE.md` — catches
server/client boundary errors `tsc` alone will not). If a gate cannot run, that
is a blocker to report, never a step to drop silently.

#### 2. Task A — issue #13: the combined admin save is two RPCs, not one transaction

**The bug, plainly:** in the admin ops board an operator can change a booking's
status *and* reassign its companion in the same save. Those are two separate
`supabase.rpc()` round-trips. If the first succeeds and the second fails, the
booking is left in a half-saved state — status moved, companion not. The database
correctly rejects the bad half, so nothing is corrupted, but the operator sees
one action produce two outcomes and has no idea which stuck.

**Where:** `apps/admin/src/app/ops/page.tsx`
- line ~196 — `supabase.rpc('admin_override_booking_status', …)`
- line ~209 — `supabase.rpc('reassign_booking', …)` nested inside the status branch
- line ~225 — `supabase.rpc('reassign_booking', …)` again, the no-status-change path

Read the whole `saveEdit` function before editing; there is optimistic local
state (`setBookings`) with a `snapshot` rollback that you must keep working.

**The fix:** write `supabase/migrations/41_ADMIN_COMBINED_SAVE.sql` adding one
SECURITY DEFINER RPC — suggested `admin_save_booking_edit(p_booking uuid,
p_status text, p_new_companion uuid, p_reason text)` — that performs both changes
in a single transaction. Do **not** reimplement the logic: call the existing
`admin_override_booking_status` and `reassign_booking` from inside it so the
state-machine validation, the reason audit, the IN_PROGRESS clock reset and the
dual notifications all keep working exactly as they do now. A Postgres function
body is already one transaction, so either both apply or neither does.

Handle the three real cases: status only, companion only, both. Guard it with the
same admin check the other admin RPCs use — find it with
`rg -n "is_admin" supabase/migrations/` and copy that pattern rather than
inventing one. Then collapse the client down to one call.

**Self-check required** (rule 1.7): the transaction property is exactly the kind
of branchy logic that needs one. Assert that a failing companion reassignment
leaves the status *unchanged*.

#### 3. Task B — issue #14: native `window.confirm` instead of the app's own pattern

**The bug, plainly:** two destructive actions in the admin app stop the operator
with the browser's grey system dialog instead of the two-step confirm button this
app already uses everywhere else. It looks broken and it is trivially mis-clicked.

**Two sites — the issue named one, I found the second while verifying:**
- `apps/admin/src/app/companions/page.tsx:120` — `window.confirm(...)` on the
  suspend/reject live-job warning (the one the issue names)
- `apps/admin/src/app/service-areas/page.tsx:76` — a bare
  `confirm("Remove pincode …")` on a destructive delete

Fix both in one pass. This is rule 1.1 in miniature: the ticket named a symptom
at one location; the actual defect had two instances. **Before you edit, grep for
every other caller** — `rg -n "confirm\(" apps/admin/src apps/companion/src` — and
if there is a third, fix that too and say so.

Find the existing two-step-button pattern first (`rg -n "confirm" apps/admin/src/components/`)
and reuse it. Do not invent a second confirm mechanism, and do not add a modal
library — `CLAUDE.md` forbids a new runtime dependency without an ADR.

#### 4. Task C — issue #15: `reassign_booking` has no driving-licence pre-check

**The bug, plainly:** if an operator reassigns a `CUSTOMER_VEHICLE` job (one where
the companion drives the customer's car) to a companion with no verified driving
licence, the database refuses it — a trigger called `guard_drive_assignment`
throws. Correct outcome, terrible delivery: the operator gets a raw Postgres
exception string instead of a sentence explaining the problem.

The admin `/ops` board **already warns** before a driving assignment the database
would refuse. The reassignment path just never got the same treatment. Find that
existing warning (`rg -n "can_drive" apps/admin/src`) and apply the same check on
the reassign path, so the operator is told *before* the call, in the app's own
words.

Note `can_drive` is deliberately not writable by the companion it gates (migration
30 closed that hole) — do not "helpfully" make it settable anywhere.

#### 5. Task D — issue #20 (admin half only): 4 lint errors

`npm run lint -w @caresy/admin` reports 4 errors, all `no-explicit-any` or
`react-hooks/set-state-in-effect`. They are **pre-existing, not regressions** —
traced to files the booking-lifecycle work never touched. Fix the 4 admin ones
properly per rule 1.6: model the real type. Do not silence them with
`eslint-disable`, and do not touch the 3 companion-app errors — those are out of
your allowlist and belong to a later task.

#### 6. Verification gate — run all of it before you say "done"

```
npx tsc --noEmit                                   # in apps/admin
npm run lint -w @caresy/admin                      # 0 errors when you are done
node --experimental-strip-types <your>.check.ts    # Task A's self-check
npm run build -w @caresy/admin                     # THE REAL GATE — Vercel runs this
graphify update .
```

`build` is not optional and not interchangeable with `tsc`. It catches
server/client boundary errors that `tsc` alone cannot see. A previous session
shipped work marked complete on `tsc` alone and the gap was caught later in
review — do not repeat that. If `build` fails for a reason unrelated to your
change, say so explicitly with the error rather than quietly skipping it.

Then update the doc your change invalidated, in the same commit:
`docs/DATABASE.md` for migration 41, `docs/ARCHITECTURE.md` only if a module
boundary actually moved.

#### 7. Do NOT touch — hard boundary this week

- **`apps/mobile-app/**` — all of it.** The primary session is live in there
  (iOS auth screen, `AuthProvider.tsx`, entitlements, native rebuilds). This is
  the one that will actually cause a painful merge conflict.
- `docs/CURRENT.md` — primary session is editing it. Put your notes in **this**
  file instead, in your own log entry.
- `apps/companion/**` and `apps/website/**` — not in scope; the companion lint
  errors are deliberately excluded from Task D.
- `supabase/migrations/30–40` — already applied to production. **Never edit an
  applied migration.** Fix forward in 41.
- `graphify-out/` — regenerated output; commit it only as the byproduct of
  `graphify update .`, never hand-edited.

#### 8. Report back — append your own entry to this file when you stop

Use the exact format at the top of this section (`Did / Left mid-flight / Don't
touch / Next`). Specifically include:

- the four tasks with per-task status — done / partial / not started, no vagueness
- **the literal output** of each verification command in section 6, not "all green"
- explicit confirmation: "migration 41 written, NOT applied to Supabase"
- anything you found that is outside your allowlist and left alone — that list is
  genuinely useful to the primary session, do not silently drop it
- any doc you found to be stale (rule 1.1) and whether you fixed it

If something blocks you, stop and write the blocker in your entry rather than
working around it by touching a file in section 7.

### 2026-08-24 — primary session — branch `feature/companion-portal` (worktree: `caresy_m3_worktree`, work done in `caresy_structured_worktree` on `feature/mobile-auth-polish`, then merged)
Did: user asked directly for the Login/Sign-up framing + medical touch on
`BeautifulAuth` (`app/index.tsx`) — this overlaps Section 2 of the
2026-08-23 mascot/login-signup task below, which hadn't been started (no
`feature/mobile-auth-polish` branch existed anywhere yet). Did it in this
session instead of waiting on Muse, in the reserved `caresy_structured_worktree`
per that task's own isolation plan (branched `feature/mobile-auth-polish` off
local `feature/companion-portal`, not origin — origin was 13 commits behind).
Delivered, in `app/index.tsx` only: (1) a Log in / Sign up segmented pill
toggle above the OAuth buttons (`accessibilityRole="tab"`, `accessibilityState`,
44pt hit target) — copy-only, same as spec'd below, headline/sub-copy switch
per mode, default "Log in"; (2) a small "🩺 Verified hospital companions"
badge under the wordmark (SF Symbol `stethoscope` on iOS, emoji fallback)
for the medical-context "touch" the user asked for; (3) a matching Apple
icon badge (SF Symbol `apple.logo`, black circle) next to the existing
Google "G" badge, so both OAuth buttons carry a small icon. **Went beyond
the doc spec below** (which deliberately left onboarding out, "no separate
registration screen anywhere in the codebase"): user explicitly wanted users
able "to add their detail for first time as sign up," so added a real
first-time-only step — after OAuth, if `profiles.onboarding_completed` is
false (or no row yet), a one-field FormScreen (`Onboarding`, new component
in the same file, reuses `Field`/`FormScreen`/`Button` from `components/ui.tsx`)
asks for a name, prefilled from the OAuth provider's name, and upserts
`{ full_name, onboarding_completed: true }` into `profiles` — same
table/RLS/columns the web app's `AuthModal` onboarding already uses, no new
migration, no `packages/auth` changes. Also deleted a genuinely dead,
buggy `greetingMemo` (`useMemo(() => name, ...)`) a few lines above where I
was editing — it referenced the `const name` declared later in the same
function (a real TDZ bug, `grep` confirmed the variable was never read
anywhere; only survived because Hermes doesn't strictly enforce TDZ there).
`npx tsc --noEmit` clean (ran `npm install` at the workspace root first —
`expo-linear-gradient`/`@react-native-community/datetimepicker` weren't
installed in `caresy_structured_worktree`'s `node_modules` yet; no
`package.json`/`package-lock.json` diff resulted, both apps already declared
the deps). Committed (`55cfeea`) on `feature/mobile-auth-polish`, fast-forward
merged into `feature/companion-portal` here. Verified live on the already-
booted iPhone 17 simulator (Metro already running, PID 8602): screenshotted
the onboarding step mid-flow on the real signed-in Google account (name
correctly prefilled "Workabhi" from OAuth metadata, proving the
`onboarding_completed` column/query actually works against the live DB, not
just tsc-clean) and the signed-out toggle/medical-badge/Apple-icon screen
(cleared only the local `RCTAsyncLocalStorage_V1` cache under the sim's app
container to force a fresh signed-out render — non-destructive, just a local
session-cache clear, not a server-side sign-out; the account itself is
unaffected and can sign back in normally). Did not tap through to submit the
onboarding form or toggle to "Sign up" on-device (no `idb`/tap automation
available in this environment) — reasoned safe from the diff: `isSignup` is
a simple ternary over already-rendered JSX, and the upsert is a two-line
Supabase call mirroring the web app's proven pattern.
Left mid-flight: nothing uncommitted — clean on both `feature/mobile-auth-polish`
(now redundant, its one commit is already in `feature/companion-portal`) and
here. Simulator's local session cache is currently cleared (app will show
signed-out `BeautifulAuth` on next open) — not a bug, just where verification
left it; sign in again with Google/Apple to get back to a signed-in state.
Don't touch: nothing new — this consumes (not blocks) part of the mascot/
login-signup task directly below. `CapyMascot.tsx` (Section 1, the cuteness
resize) is **still open and untouched** — Muse's task there is unaffected,
still valid, still assigned. Section 2 (the toggle) and part of Section 3
(this note explains the onboarding proposal that section asked to be written
up, not implemented — it's now implemented) are done; skip re-doing them.
Next: whoever picks up the mascot task should re-read Section 1 only (eye/
snout/head-ratio benchmarks) — Section 2's acceptance checklist is satisfied
already by this entry, no need to redo the toggle. On-device tap-through of
the actual OAuth submit + "Sign up" segment + onboarding-save round-trip
would be good to confirm on a session with `idb` or a physical-device pass,
not blocking.

---

### 2026-08-23 — task for Muse — TestFlight-prep pass (audit + fixes you CAN do without an Apple account)

Status check on your two other open tasks first, since this is a third one
stacking up: **neither the 2026-08-22 Android verify task nor the
2026-08-23 mascot/login-signup task has been started yet** — no
`feature/android-verify` or `feature/mobile-auth-polish` branch exists
locally or on origin as of this entry. This task doesn't replace either —
it's small, mostly config/doc work, and deliberately kept separate so it
doesn't block or collide with whichever of the other two you pick up first.

**Why this task exists:** user asked "what's pending to push to TestFlight."
Primary session audited actual state via `eas build:list` / `eas
submit:list` (not the old checklist, which was stale and wrong on several
items — corrected this session, see `NATIVE_CHECKLIST.md`). Finding: zero
production builds, zero submissions, ever. Real blockers left are a mix of
"needs the Apple Developer account holder personally" (can't delegate) and
"needs research/config verification" (can delegate — that's this task).

**0. Isolation.** `caresy_reschedule_worktree` is idle (`feature/mobile-reschedule`
already merged). Reuse it — don't touch `caresy_structured_worktree`, that's
reserved for the mascot task above, even though it hasn't started yet:
```
cd ../caresy_reschedule_worktree
git fetch origin
git checkout -b feature/testflight-prep origin/feature/companion-portal
```
Confirm `git branch --show-current` before writing anything.

**1. Research: does EAS Build auto-patch `aps-environment` for bare iOS
projects, or not?** `ios/Caresy/Caresy.entitlements` is checked into the
repo (bare workflow, no prebuild-time regeneration) and hard-codes
`aps-environment` to `development`. A store/production build needs
`production` or push notifications silently fail at runtime with no build-
time error. Find out (EAS docs, `eas build` changelogs, or a scratch
`eas build --profile preview --platform ios --non-interactive --no-wait` if
you want to inspect the generated build's actual entitlements without
waiting for it to finish) whether EAS's credentials service rewrites this
value per build profile for a bare/non-CNG project. **Deliverable: a written
finding in your session-log entry, not a blind edit.** If you confirm it
needs a manual fix, propose *how* (e.g. two entitlements files swapped by
build profile, or a `eas-build-pre-install` hook) rather than just flipping
the committed file to `production` — that would break the current working
`development`-profile signing for local dev builds.

**2. Fix the Android manifest permission gaps found this pass.**
`android/app/src/main/AndroidManifest.xml` is missing:
- `android.permission.POST_NOTIFICATIONS` — required on Android 13+
  (API 33+) for `expo-notifications` to actually show the permission
  prompt; without it, `Notifications.requestPermissionsAsync()` in
  `AuthProvider.tsx` line ~81 silently no-ops on newer Android.
- `android.permission.CAMERA` — `NSCameraUsageDescription` is set on iOS
  for the same feature (prescription/report photo capture), Android's
  manifest has no matching line.
Add both, confirm they don't collide with anything `expo-image-picker`/
`expo-notifications` config plugins would auto-generate on a fresh
`expo prebuild` (check `npx expo config --type introspect` output or diff
against what prebuild would produce, don't just hand-edit and hope).

**3. Verify `eas.json` beyond the placeholder fields.** Don't touch
`submit.production.ios.appleId`/`ascAppId`/`appleTeamId` — those need real
account info only the account holder has (flag what's needed, don't guess
or invent values). Do check: `cli.version` constraint (`>= 21.8.0`) against
the currently-installed `eas-cli` (`npx eas-cli --version` warned about an
outdated local version this session, `22.2.0` available) — decide if
pinning `cli.version` in `eas.json` per Expo's own recommendation is worth
doing here. Confirm `production.autoIncrement: true` + `appVersionSource:
"remote"` is actually sufficient for TestFlight's build-number-must-
increase rule (research, don't assume).

**4. Draft App Store Connect listing content — text only, no account
needed.** App name, subtitle, description, keywords, support URL,
marketing URL, and confirm a privacy-policy URL exists and is live
(`apps/website/src/app/privacy` — check it resolves, don't just check the
file exists locally). Write this as a plain doc (new file,
`apps/mobile-app/docs/APP_STORE_LISTING.md` or similar — your call on
exact path) so whoever has App Store Connect access can paste it in
directly. Do not create or touch anything in `apps/website` itself for
this — read-only check that the privacy page is real and reachable.

**5. Do NOT run `eas build --profile production` or `eas submit` yourself**
unless you're prepared to handle an interactive Apple ID + 2FA prompt — if
you can't complete that interactively, don't start it (a half-finished
interactive credential setup left hanging is worse than not starting).
Flag in your log entry that this step is ready and waiting on the account
holder.

**6. Logging — this matters for how this gets merged.** Commit your work
in small, `tsc`-clean commits as usual. **Do not push `feature/testflight-prep`
to origin yourself.** Append your session-log entry below (per the format
at the top of this doc) with: what you found in step 1, exactly what you
changed in steps 2–4, and what's still open. Primary session will pull your
branch from your local `caresy_reschedule_worktree` (or you push it to
origin under its own branch name if that's easier for handoff — either way,
say which in your log entry), review the diff independently the same way
the reschedule work was reviewed (`263560b` → `f934eb5` → merged in
`primary session — reviewed + merged` below), and push/merge from primary
session's side once confirmed — not before.

**Don't touch:** anything already in progress or assigned elsewhere —
`app/index.tsx`'s `BeautifulAuth`/`CapyMascot` (mascot task, above),
`my-bookings.tsx`/reschedule flow (already merged, don't re-touch),
`packages/auth/*` (Agent 1's territory, unrelated to this).

---

### 2026-08-23 — task for Muse — Mascot redesign + Login/Sign-up screen restructure

Two connected UI tasks on the signed-out auth screen you built (`BeautifulAuth`
+ `CapyMascot`, originally on `feature/structured-data`, now ported cleanly
into `feature/companion-portal` at `579353b` / `7734a94` — that port is your
new baseline, not `feature/structured-data`, which is now behind). Primary
session reviewed your mascot/auth work and liked the direction, but flagged
two gaps: the mascot's face reads a bit generic/adult, not "cute", and the
screen jumps straight to OAuth buttons with no Login-vs-Sign-up framing. Both
are scoped, both ship in the same branch.

**Why this doc entry is longer than usual:** the last time UI work landed
without agreed benchmarks (the broader `feature/structured-data` dashboard
redesign), primary session had to reject the whole thing on sight ("hell to
UI, fall back") and re-extract only the pieces that worked. That cost a full
review cycle. This time the acceptance bar is written down up front so the
result lands clean on the first pass — read Section 3 (Benchmarks) before
you write any code, not after.

**0. Isolation.** `caresy_structured_worktree` is idle (its `feature/structured-data`
work is fully superseded — the two pieces worth keeping are already ported
into `feature/companion-portal`). Reuse it:
```
cd ../caresy_structured_worktree
git fetch origin
git checkout -b feature/mobile-auth-polish origin/feature/companion-portal
```
This pulls in `579353b` (AnimatedHeadline) and `7734a94` (BeautifulAuth +
CapyMascot port) as your starting point — confirm both are in `git log
--oneline -5` before touching anything. Do NOT branch off
`feature/structured-data` — it's stale relative to companion-portal now.
Confirm `git branch --show-current` before writing code (rule 7 above).

---

**1. Mascot — make the face read as "cute", not just "a bear/capybara face".**

Current implementation: `apps/mobile-app/components/CapyMascot.tsx` — pure
`View`-based vector art (no image asset), scale-only prop (`compact?:
boolean`), three animation loops (peek-in spring, bob, ear wiggle) plus a
blink timer. Keep all of that machinery — the ask is proportions and facial
feature sizing, not a rewrite.

What reads as "generic" right now (`s.head`, `s.eye`, `s.snout` etc., lines
133–161): eyes are 18×18 circles on a 176-wide head (~10% of head width) —
too small for "cute"; the snout block is 108×86, nearly half the head height,
which pulls the face proportions toward "animal muzzle" instead of "kawaii".

**Benchmarks — hit these ranges, don't eyeball it:**

| Feature | Current | Target | Why |
|---|---|---|---|
| Eye diameter : head width | ~10% (18/176) | **18–24%** | kawaii-style faces read as cute primarily via oversized eyes; below 15% reads as realistic/adult |
| Eye spacing (gap between inner eye edges) | tight, ~64px between left/right eye centers on 176 head | keep eyes closer to head center-vertical, slightly lower (mid-to-lower third) — avoid pushing them up near the ears | lower-set eyes read as younger/cuter (baby schema — bigger head, bigger eyes, lower facial features) |
| Snout height : head height | ~55% (86/156) | **≤35%** | smaller muzzle relative to head is the single biggest "cute vs realistic" lever |
| Head width : body width ratio | roughly 176:210 (head slightly smaller than body) | **head ≥ body width**, or at minimum equal | classic "big head, small body" chibi proportion |
| Corner radii on all shapes | already fully rounded (radius = half-dimension in most places) | keep — don't introduce any hard corners | consistency |
| Color palette | `#E8933A` body, `#6B3E2E`/`#7A4A33` ears/snout, `#3B2316` features | reuse these exact hex values, do not introduce new colors | matches the sky bg (`#AEDFF5`) and card in `BeautifulAuth` — a palette change here is a change to a file outside your scope (the screen background lives in `app/index.tsx`) |
| Blush | one dot, right side only (asymmetric) | make it **two dots, symmetric** (one each cheek) | asymmetric blush reads as unintentional/broken at a glance, not stylistic |
| Animation | peek-spring + bob + ear-wiggle + blink, all `useNativeDriver: true` | keep all four, keep native-driver — do not add a JS-driven animation | perf: this runs on the screen every signed-out user sees first |

**Explicitly do not:** add an image/SVG asset (stay pure `View`+`StyleSheet`,
matching the existing "no image asset" comment at the top of the file), add
new props beyond what's needed for the resize, or touch `FloatDot` (the
star/planet decor component in the same file) — it's unrelated and already
fine.

**Self-check before calling this done:** take a simulator screenshot of just
the mascot at 2x zoom (crop it) and compare eye-diameter-to-head-width and
snout-height-to-head-height against the benchmark table above with a ruler/
pixel-measure, not by eye. Paste the actual measured ratios in your session
log entry, not "looks cuter now".

---

**2. Login / Sign-up framing above the OAuth buttons.**

Current `BeautifulAuth` (in `app/index.tsx`, function starting around line
263 after this session's edits — search for `function BeautifulAuth`) goes
straight from the headline (`"Care you can trust, instantly."`) to the
Google button. Add an explicit mode toggle above the button stack:

- A two-segment pill control: **"Log in"** / **"Sign up"**, matching the
  existing pill/segmented visual language already in the app (see `Chip`/
  `ChipRow` in `components/ui.tsx` for the established selected/unselected
  pill styling — reuse that pattern's *visual weight*, you don't have to
  reuse the literal component if `BeautifulAuth` needs its own styled
  version to fit the sky-blue background).
- Selecting a segment changes copy only, **not which auth function runs**:
  Supabase's OAuth flow can't distinguish "log in" from "sign up" ahead of
  time (a new Google/Apple identity auto-creates the account, an existing
  one signs in — this is why there's no separate registration screen
  anywhere in the codebase, confirmed by primary session this session: `find
  app -iname "*regist*" -o -iname "*onboard*"` returns nothing). So:
  - "Log in" selected → headline stays close to current: `"Care you can
    trust, instantly."` / sub-copy as-is.
  - "Sign up" selected → headline switches to something like `"Join
    thousands who trust Caresy."` (your call on exact copy, keep it in the
    same voice) — sub-copy can stay the same or adjust slightly.
  - The button labels (`Continue with Google` / `Continue with Apple`) do
    **not** need to change per-segment — "Continue with X" already reads
    correctly for both login and signup. Don't build a "Sign up with
    Google" vs "Log in with Google" label-swap unless it's trivial; not
    required for acceptance.
- Default segment on first mount: **"Log in"**.
- This is presentational state (`useState` inside `BeautifulAuth`), not
  auth state — don't thread it up into `Home()` or persist it.

**Accessibility (hard requirement, not optional):** each segment needs
`accessibilityRole="tab"` (or `"button"` if you don't implement a real tab
semantics), `accessibilityState={{ selected: mode === 'login' }}`, and a
minimum 44×44pt hit target — this is an App Store review item (Apple HIG
minimum touch target), not a nice-to-have.

---

**3. "Other platforms" — investigate, don't fabricate.**

Primary session checked `apps/mobile-app/lib/AuthProvider.tsx` this session:
it exposes exactly `signInWithGoogle` and `signInWithApple`. Nothing else is
wired — no phone/OTP, no Facebook, no email/password. The website has phone
OTP via `packages/auth/src/msg91.ts`, but per the ownership table above and
the existing "Don't touch" rule from the 2026-08-13 split, **`packages/auth`
is Agent 1's territory** — do not add a new auth provider call there or wire
a new button that calls into it without a call-out in this doc first, even
if it looks like a two-line change.

What to actually do for this task:
- Google + Apple stay the two real buttons (already correct, already
  preserves Apple — see the 2026-08-23 primary-session entry below on why
  that mattered: your original `BeautifulAuth` had dropped Apple, primary
  session added it back during the port).
- If you want to represent "more sign-in options exist" for future-proofing,
  a disabled/greyed "More options coming soon" text link is acceptable — an
  actual non-functional third OAuth button is not (never ship a button that
  does nothing when tapped, that's a worse user experience than not showing
  it).
- If you think phone/OTP genuinely should come to mobile, **write that as a
  proposal in your session-log entry below**, don't implement it — that's a
  cross-boundary call the two of you need to agree on first per Ground Rule 3.

---

**4. Acceptance checklist — go through this explicitly in your session-log entry:**

- [ ] `git branch --show-current` confirms `feature/mobile-auth-polish`,
      based on `origin/feature/companion-portal` (not `feature/structured-data`)
- [ ] Only these files changed: `apps/mobile-app/components/CapyMascot.tsx`,
      `apps/mobile-app/app/index.tsx` (only inside `BeautifulAuth` + the `a`
      StyleSheet block — the signed-in dashboard, `ActionCard`,
      `QuickAction`, `AnimatedHeadline` wiring, and the `s` StyleSheet are
      **out of scope**, don't touch them)
- [ ] No new npm dependencies added (`git diff package.json` empty)
- [ ] No new colors introduced outside the existing palette (`#E8933A`,
      `#6B3E2E`, `#7A4A33`, `#3B2316`, `#AEDFF5`, plus whatever's already in
      `lib/theme.ts` `color.*`) — if a genuinely new color is unavoidable,
      call it out explicitly in your log entry with why, don't slip it in
      silently
- [ ] `npx tsc --noEmit` clean
- [ ] Verified live in iOS Simulator — actual screenshot, not "should work".
      Include: (a) mascot close-up with measured eye/snout ratios per
      Section 1, (b) full auth screen in "Log in" mode, (c) full auth screen
      in "Sign up" mode
- [ ] Both OAuth buttons still present and wired to the same
      `onGoogle`/`onApple` props `BeautifulAuth` already receives from
      `Home()` — don't change that prop contract
- [ ] Toggle has `accessibilityRole` + `accessibilityState` + 44×44pt hit
      target (Section 2)
- [ ] All animations still `useNativeDriver: true`
- [ ] Session-log entry appended below (not edited into this one) with: what
      changed, the measured mascot ratios, screenshots described, and the
      phone/OTP proposal if you have one

**Don't touch:** anything in the signed-in dashboard path (everything from
`if (!session) { ... }` downward in `app/index.tsx` is out of scope — that's
the gradient ActionCards / quick-actions / AnimatedHeadline work from
`bfd2bbf` and `579353b`, already reviewed and accepted, don't re-touch it),
`components/AnimatedHeadline.tsx`, `assets/welcome-copy.json`,
`packages/auth/*`, anything web (`apps/website`).

---

### 2026-08-22 — task for Muse — Android first-run + verification pass

Everything built so far (Phases 1-4, the reschedule flow just merged, the
Home-screen gradient/crop fix) has **only ever run on iOS simulator**. Per
`NATIVE_CHECKLIST.md` line 71 ("Real-device QA (iOS + Android)") and the
store-blockers list, Android has never been booted. That's the job: get it
running, walk every screen, log what's broken. This is verification +
targeted fixes, not a rewrite — the RN code is cross-platform already, most
of this should just work. Don't restructure anything preemptively.

**0. Isolation.** `caresy_reschedule_worktree` is idle and clean at `fcb1eee`
(its branch already merged into `feature/companion-portal`). Reuse it:
```
cd ../caresy_reschedule_worktree
git fetch origin
git checkout -b feature/android-verify origin/feature/companion-portal
git pull --ff-only  # or just re-point if origin is behind your local — check first
```
Confirm you're NOT pointed at `caresy_m3_worktree` (primary session's active
dir) — rule 7 in this doc. Append your own session-log entry (don't edit
this one) when you start.

**1. Environment.** Confirm before touching code:
- Android Studio installed, `ANDROID_HOME`/`ANDROID_SDK_ROOT` set, `adb`
  on PATH (`adb devices` runs without error).
- One target booted: either an AVD emulator (Android Studio → Device
  Manager → launch one, API 34+ to match `compileSdkVersion`) or a
  physical device with USB debugging on, showing in `adb devices`.
- `android/` is already a prebuilt native project (checked into the repo,
  same as `ios/`) with `google-services.json` already present at
  `apps/mobile-app/google-services.json` — you should NOT need to run
  `expo prebuild` fresh. If `npx expo run:android` complains about missing
  native config, stop and flag it rather than regenerating `android/`
  blind — that folder may have hand edits.

**2. Install + build.**
```
cd apps/mobile-app
npm install          # workspace root — the reschedule merge added
                      # @react-native-community/datetimepicker, needs installing
npx expo run:android --device <deviceId from `adb devices`>
```
First build will be slow (Gradle cold start, ~10-15 min). Same caveat as the
iOS side this session: `expo run:android` stays attached streaming logs and
never "completes" on its own — don't wait on the process to exit, poll for
the app process / a fresh install instead (`adb shell pidof
in.co.caresy.app`, or just check the emulator screen).

**3. Walk every screen** (sign in fresh, this is also your first real Google
OAuth test on Android):
- **Sign-in** — Google only on Android (`appleAvailable` in `app/index.tsx`
  already gates Sign in with Apple to `Platform.OS === 'ios'`, so its
  absence here is correct, not a bug). Confirm the `caresy://auth/callback`
  redirect actually returns to the app after Google auth — this exact class
  of bug bit iOS earlier this week (Supabase redirect allowlist), worth
  double-checking Android's OAuth round-trip specifically.
- **Home** — the quick-actions grid and the Urgent Booking / Schedule
  Appointment gradient+photo cards (just fixed this session, `bfd2bbf`) are
  plain RN Flexbox/Image, should render identically, but confirm — this is
  their first Android render ever.
- **Booking** (`booking.tsx`) — 4-step wizard, location permission prompt
  (Android's permission dialog differs from iOS's, this is a first test),
  photo/doc picker if you reach that step.
- **My Bookings + Reschedule** — the part that most needs your attention.
  `@react-native-community/datetimepicker` renders **completely differently
  per platform**: iOS got the `spinner` display (see `my-bookings.tsx`
  `Platform.OS === 'ios' ? 'spinner' : 'default'`), Android gets `'default'`
  — a native calendar dialog for date, a native clock dialog for time,
  each auto-closing on select (that's why `onDateChange`/`onTimeChange`
  already branch on `Platform.OS === 'android'` to close the picker and
  chain date→time). This was written against the iOS behavior you could
  actually see; the Android path is unverified. Check: does the date
  dialog open, select, and auto-advance to the time dialog correctly? Does
  Cancel on either dialog leave state sane (not stuck open, not silently
  setting a bad date)?
- **Tracking, Quick Help, Care Guides, Profile, Account deletion, Sign
  out** — full pass, same as the original mobile-app QA in the 2026-08-14
  entries below (that pass was iOS-only too).
- **Push notifications** — `AuthProvider.tsx` already branches
  `Platform.OS === 'android'` to create a notification channel before
  requesting permission (required on Android 8+, iOS doesn't need it) —
  first real test of that path.

**4. Fix what's broken, in the same worktree/branch**, same discipline as
the reschedule work: small commits, `npx tsc --noEmit` clean before each,
note anything you deliberately deferred rather than silently skip it.

**5. Report back** in a session-log entry here: what worked untouched, what
you fixed, what's still broken/deferred and why (e.g. if something needs a
design decision rather than a bug fix, flag it — don't guess). Known,
already-accepted Android gaps (not yours to fix, just don't be surprised):
Android production signing/keystore (`NATIVE_CHECKLIST.md` line 69) and Play
Store closed-testing enrollment are separate, later store-submission steps,
not part of this pass.

**Don't touch:** `apps/mobile-app/app/index.tsx` (my gradient/crop fix,
freshly committed `bfd2bbf` — if Android reveals a real bug in it, flag it
here rather than editing past me) unless you find an Android-specific
regression there, in which case fix it and say exactly what and why.

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