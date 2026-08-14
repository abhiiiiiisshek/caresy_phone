# Parallel work — two people, one repo

## Mobile phases (full picture — source: `docs/MOBILE_PLAN.md`)

| Phase | What | Status |
|---|---|---|
| 0 — Unblock sharing | `packages/utils`/`types` made web-independent so Metro can import them | ✅ done 2026-08-07 |
| 1 — Boot + auth | Expo app scaffolded, Supabase auth (Google sign-in), one screen reading own `profiles` row | ✅ done |
| 2 — Read-only screens | Home, booking history/detail, profile, settings, support, native bottom tabs | ✅ mostly done — Home + My Bookings built, Profile/Settings/Support still ⬜ (see `NATIVE_CHECKLIST.md`) |
| 3 — Booking write path | Service → hospital → patient → pincode → slot → confirm, real `INSERT` under RLS | ✅ done — Booking screen built, writes patients→locations→bookings |
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
