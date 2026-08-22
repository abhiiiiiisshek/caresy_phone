# Android Parallel Development Workflow

_Created 2026-08-22 for `caresy_phone_xcode`. Companion to `docs/MOBILE_PLAN.md` and `apps/mobile-app/NATIVE_CHECKLIST.md`. Read `docs/CURRENT.md` first — this file only covers how to run Android work in parallel with web._

## Goal

Ship `apps/mobile-app` (Expo native, package `in.co.caresy.app`) to Play Store without blocking `apps/website`, `apps/companion`, `apps/admin`. One Supabase project, two delivery tracks.

```
Track A — Web (existing)          Track B — Android (parallel)
  website / companion / admin       apps/mobile-app (Expo)
           \                              /
            ───── shared ─────────────────
              packages/types, packages/utils
              Supabase (Postgres + RLS + Auth)
```

`apps/mobile` (Capacitor shell) is frozen — no edits until Phase 6 retirement. See `docs/MOBILE_PLAN.md:Constraints`.

---

## 1. Branching model

| Branch | Purpose | Merge target |
|---|---|---|
| `main` | Always deployable. Vercel auto-deploys web from here. | — |
| `feature/structured-data` | Current in-flight web work (you are here). | `main` |
| `feature/android-*` | One branch per Android milestone (e.g. `feature/android-profile`, `feature/android-push`). Branch from `main`, not from web feature branches. | `main` |
| `feature/android` (optional) | Integration branch if >1 dev on Android. Merge milestone branches here first, then PR to `main` weekly. | `main` |

**Rules**

1. Android branches touch **only** `apps/mobile-app/**`, `docs/**`, and `app.json`/`google-services.json` when needed. Never edit `apps/website`, `apps/companion`, `apps/admin`, `packages/ui`, `packages/auth`, `supabase/migrations` without a separate ADR + review — those are Track A owners.
2. Shared packages (`packages/types`, `packages/utils`) are read-only from Android branches. If a type or helper must change, open a PR against `main` from a `fix/shared-*` branch, get web review, then rebase Android. Phase 0 already decoupled `utils` from `@caresy/auth` — do not reintroduce web deps.
3. Rebase on `main` daily (`git fetch && git rebase origin/main`) — do not merge `main` into feature branches. Keeps history linear for `graphify update .`.
4. One PR = one milestone (table §3). Squash on merge.

**Starting now**

```bash
git fetch origin
git checkout main && git pull
git checkout -b feature/android-next        # e.g. feature/android-quick-help
# work in apps/mobile-app only
git push -u origin feature/android-next
```

If two people start Android tomorrow:

```bash
git checkout -b feature/android            # integration branch from main
git push -u origin feature/android
# each dev: git checkout -b feature/android-profile feature/android
```

---

## 2. Repo boundaries (what parallel means here)

*   **Safe to edit in parallel:** `apps/mobile-app/**` (isolated Expo app, own `package.json`, own Metro).
*   **Locked in parallel:** `apps/mobile/android/**` and `apps/mobile/ios/**` — untouched until Phase 6. Edits here break the Play Store signing chain.
*   **Shared, needs coordination:** `packages/types`, `packages/utils`, `supabase/migrations/*`. Any change here blocks both tracks — coordinate via `docs/CURRENT.md` or a 5-minute call, then single PR.
*   **Owned by web, do not touch from Android:** `apps/website`, `apps/companion`, `apps/admin`, `packages/ui`, `packages/auth`.

Metro config already isolates `apps/mobile-app` (`watchFolders` + `disableHierarchicalLookup` per `MOBILE_PLAN.md:Phase 1`). No codegen touches web.

---

## 3. Milestones — next parallel work (ordered)

Current state: `apps/mobile-app` has Home, Booking, My Bookings, Tracking ✅. Everything else is in `NATIVE_CHECKLIST.md:Deferred`. Pick top-to-bottom — each is one PR.

| # | Milestone (branch name) | Scope | Done when |
|---|---|---|---|
| A1 | `feature/android-quick-help` | Urgent-booking screen (reuse `booking.tsx` contract: patients→locations→bookings, 60-min lead via `slots.ts`) | `INSERT` succeeds under RLS on device; pull-to-refresh shows it in My Bookings |
| A2 | `feature/android-profile` | Profile + Settings (read `profiles` row, edit name/phone, logout, SecureStore clear) | Name edit persists after app restart |
| A3 | `feature/android-care-guides` | Care topic list + detail (static content, no DB write) | Offline render works (cached JSON) |
| A4 | `feature/android-reschedule` | Reschedule sheet on My Bookings (`reschedule_booking` RPC, slot re-check) + keep Cancel | Rescheduled row has new `expires_at` and not swept |
| A5 | `feature/android-served-area` | Wire `checkPincodeServed(supabase, pincode)` into Booking (was format-only) | Out-of-area pincode blocked client-side AND server-side `enforce_service_area()` |
| A6 | `feature/android-maps-location` | Hospital autocomplete (`hospitals` table) + map picker (`expo-location` + `react-native-maps`) → `latitude/longitude` not null | Companion "Open in Maps" uses coords, not address fallback |
| A7 | `feature/android-notifications` | `expo-notifications` → `push_tokens` write; verify `api/cron/send-push` drains to device | Booking status change buzzes device within 60s |
| A8 | `feature/android-docs-upload` | Camera/file picker → `patient-docs` bucket (RLS) | Photo visible in website `my-bookings` detail |
| A9 | `feature/android-account-delete` | **Store blocker** — in-app delete (soft-delete + `auth.users` cleanup via RPC) + web `/account/delete` parity | Apple 5.1.1(v) + Play compliant |
| A10 | `feature/android-store-compliance` | Apple Sign-In, `PrivacyInfo.xcprivacy`, Data Safety, permission strings, offline states, a11y audit | Checklists in `NATIVE_CHECKLIST.md:Store-submission blockers` all ticked |
| A11 | `feature/android-eas-release` | EAS Build → AAB (Play Signing) + closed testing 12×14d, TestFlight | AAB on Play Internal track, IPA on TestFlight |

Do **one** at a time per dev. Current branch `feature/structured-data` is web-only — do not mix A-items into it.

---

## 4. Per-milestone workflow (repeat for each A#)

```
1. Branch    git checkout -b feature/android-<slug> main
2. Spec      30-min: screen states (loading/empty/error/success via components/ui.tsx),
                        RLS queries, haptics, a11y labels. Update NATIVE_CHECKLIST.md row to "in progress".
3. Build     Code in apps/mobile-app/** only. Reuse @caresy/types, @caresy/utils (pure helpers).
             Never import from @caresy/ui, @caresy/auth, next, lucide-react (see MOBILE_PLAN.md:Sharing boundary).
4. Self-check npx tsc --noEmit                          # inside apps/mobile-app
             node --experimental-strip-types packages/utils/src/<module>.check.ts  # if utils touched
5. Device    Expo Go on physical Android: npx expo start
             Verify: Auth redirect, RLS read/write, SecureStore persist, haptics, safe-area, keyboard.
             (Do not run `npm run dev` in sandbox per CLAUDE.md — device or Vercel preview only.)
6. PR        Push, open PR to `main`. Title: `feat(mobile-app): <milestone>`.
             Include: device screenshot/recording + Supabase query proof (row in dashboard).
             Update NATIVE_CHECKLIST.md + docs/CURRENT.md in same PR.
7. Merge     Squash → main → delete branch → `graphify update .`
```

**Definition of Done for every A#**

- [ ] `npx tsc --noEmit` clean in `apps/mobile-app`
- [ ] Runs on physical Android (Expo Go) — auth, RLS, SecureStore, no `service-role` key in bundle
- [ ] `NATIVE_CHECKLIST.md` row moved from ⬜ to ✅ with notes
- [ ] `docs/CURRENT.md` updated if in-flight state changed
- [ ] No files outside `apps/mobile-app` (and docs) touched — or explicit ADR for shared change
- [ ] PR has device evidence (screen recording or `adb logcat` excerpt)

---

## 5. Parallel hygiene (prevent collisions)

*   **Daily sync (5 min):** Track A lead + Track B lead compare `docs/CURRENT.md:In flight` — if both need `packages/utils` or a migration, one goes first.
*   **Migrations:** Still hand-run in Supabase SQL editor per `docs/DATABASE.md`. Never commit a migration from Android branches unless it is the account-deletion RPC (A9) — and then it is the only migration in that PR, idempotent, ends in `ASSERT`.
*   **Env:** `apps/mobile-app` needs `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (same Supabase project as web). Keep them in `apps/mobile-app/.env.local` (gitignored) and EAS secrets — never commit. `google-services.json` is already at `apps/mobile-app/google-services.json` and `apps/mobile/android/app/google-services.json` — keep them in sync when Firebase project changes.
*   **Node:** Repo has Node 23.11; Expo wants LTS 20/22. Use `nvm use 22` (`.nvmrc` if added) for `apps/mobile-app` work.

---

## 6. Build & release (Android only)

| Command | When |
|---|---|
| `npx expo start` | Daily dev on device (Expo Go) |
| `npx expo start --android` | Emulator if available |
| `eas build --platform android --profile preview` | APK for internal QA (A1–A8) |
| `eas build --platform android --profile production` | AAB for Play Store (A10+) — enables Play App Signing on first upload |
| `eas update` | JS-only OTA fix (no store review) — never for native changes |

Play Console 12-tester × 14-day closed testing (personal account) starts at A2 — open the track early, clock runs in background.

---

## 7. What to do Monday

1. **Create integration branch if team >1:** `feature/android` from `main`.
2. **Pick A1 (`quick-help`)** — smallest closed loop, unblocks demos. Branch `feature/android-quick-help` from `main`.
3. **Kick off Play Console closed testing** with current AAB (even empty) so the 14-day clock starts.
4. **Do not touch `apps/mobile` Capacitor tree** — it ships to Play today per `docs/CURRENT.md:Play Store`.

---

## 8. Where to look when stuck

| Question | File |
|---|---|
| What's in flight / known broken? | `docs/CURRENT.md` |
| What does the Expo app already do / defer? | `apps/mobile-app/NATIVE_CHECKLIST.md` |
| Phasing + sharing rules | `docs/MOBILE_PLAN.md` |
| Module ownership + request flow | `docs/ARCHITECTURE.md` |
| RLS / security boundary | `docs/SECURITY.md` |
| Migration ledger | `docs/DATABASE.md` |
| Coding standards (do not substitute deps) | `CLAUDE.md` |
| Knowledge graph | `graphify query "<question>"` → `graphify-out/GRAPH_REPORT.md` |

No new workflow tool is needed — npm workspaces + Expo + Supabase already isolate the tracks. This file is the workflow.
