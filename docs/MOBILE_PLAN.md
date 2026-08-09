# Mobile plan — Expo native app

_Written 2026-08-07. Decision recorded in [ADR-0009](ADR/0009-expo-native-mobile.md)._

Target architecture: the website, companion portal, and admin dashboard stay
exactly as they are; `apps/mobile` becomes a real Expo / React Native app on the
same Supabase backend. One database, one auth system, one business-logic layer,
four platform-specific UIs.

```
  Website (Next.js)   Companion Portal   Admin Dashboard   Mobile (Expo)
         │                    │                  │               │
         └────────────────────┴──────────────────┴───────────────┘
                                    │
                   Shared packages — types • utils • validation
                          (platform-independent logic only)
                                    │
                            Supabase backend
              Auth • Postgres • RLS • Storage • Realtime • Edge Functions
```

---

## What the plan assumed vs. what is on disk

Three conflicts, found by reading the repo. Each has a decision below; none
changes the target architecture.

### 1. `@caresy/auth` cannot be shared with React Native

`packages/auth` is built on `@supabase/ssr` — `createBrowserClient`, cookies
scoped to `.caresy.co.in`, Next middleware, plus `@caresy/ui` and `lucide-react`
in its dependency list and `next@^16` as a peer.

None of that exists in React Native. Mobile needs `createClient` from
`@supabase/supabase-js` with an AsyncStorage/SecureStore session adapter, and
`expo-auth-session` for the Google OAuth round-trip.

**Decision:** one auth *system*, two client *adapters*. Same Supabase project,
same `auth.users`, same `is_admin()`, same RLS. `packages/auth` stays web-only;
mobile gets `apps/mobile/lib/supabase.ts`. This is not duplicated auth logic —
the logic is in Postgres. It is two transports to the same door.

**New work this implies** (not shareable, must be built):

- Google OAuth client IDs for Android (needs the release SHA-1) and iOS.
- A native redirect scheme (`caresy://auth/callback`) added to Supabase's
  redirect allowlist alongside the three web callbacks.
- Session persistence in SecureStore, not cookies.

### 2. `@caresy/utils` is not platform-independent today

`packages/utils/src/serviceArea.ts` line 1:

```ts
import { createClient } from '@caresy/auth/supabase/client';
```

and `packages/utils/package.json` lists `@caresy/auth` as a dependency. So
importing `pricing.ts` from React Native pulls in Next, React DOM, and
`lucide-react` through the package graph.

`pricing.ts`, `phone.ts`, and `slots.ts` are otherwise pure — they import
nothing. Only `serviceArea.ts` is dirty, and only because it runs a query.

**Decision:** cut the edge. `checkPincodeServed()` takes a Supabase client as an
argument instead of constructing one; each app passes its own. Drops
`@caresy/auth` from `packages/utils/package.json` entirely and makes the whole
package importable from Metro. Two-line change, and it must happen in Phase 0
before any mobile code imports pricing.

### 3. `packages/validation` does not exist and should not yet

The plan lists a `validation` package. Validation today is `phone.ts` and
`serviceArea.ts` inside `packages/utils`, each with an `assert`-based
`.check.ts` beside it. `packages/types/src/index.ts` is four lines.

**Decision:** do not create a fifth package for one concern. Once `utils` is
clean it *is* the shared logic package. Split `validation` out the day it has
enough in it to justify its own `package.json` — not before. Same reasoning as
[ADR-0002](ADR/0002-npm-workspaces-monorepo.md): the monorepo exists to share
code, not to collect manifests.

---

## Sharing boundary

**Shared** (`packages/types`, `packages/utils` after Phase 0): domain types,
enums, constants, pricing math, phone/pincode validation, slot logic, any pure
helper. Every shared module keeps its `.check.ts`.

**Never shared:** React components, JSX for the DOM, Tailwind classes, CSS,
`@caresy/ui`, website pages, website navigation, `@caresy/auth`.

Rule of thumb: if it imports from `react-dom`, `next`, `lucide-react`, or
`@caresy/ui`, it is web-only. If it imports nothing, it is shareable.

---

## Phases

Each phase ends with something runnable. Do not start a phase before its
predecessor is on a device.

### Phase 0 — Unblock sharing (no mobile code yet) ✅ done 2026-08-07

- `checkPincodeServed(supabase, pincode)` and `listServedAreas(supabase)` now
  take the client as an argument. Four call sites updated in `apps/website`
  (`booking`, `quick-help`, `LocationBadge` ×2); `apps/admin/service-areas` only
  used the pure `isValidPincode` and needed no change.
- `@caresy/auth` removed from `packages/utils/package.json`, replaced by a
  type-only `@supabase/supabase-js` dependency.
- Verified: `tsc --noEmit` clean in all three apps, all `*.check.ts` pass, all
  three `next build`s succeed.

**Done when:** `packages/utils` imports nothing web-specific. ✅ — `utils` and
`types` now import only `@supabase/supabase-js` types, so Metro can consume
them.

### Phase 1 — Expo app boots and authenticates

- Expo (latest SDK) + Expo Router + TypeScript in `apps/mobile`.
- Metro monorepo config: `watchFolders` to repo root,
  `disableHierarchicalLookup`, `expo/metro-config` monorepo preset.
- `lib/supabase.ts` — `createClient` + SecureStore session adapter.
- Google sign-in via `expo-auth-session`; native redirect registered in Supabase.
- One screen behind auth that reads the signed-in user's `profiles` row.

**Done when:** sign in on a physical Android device and see your own name, read
through RLS with no service-role key anywhere in the bundle.

### Phase 2 — Read-only screens

Home, booking history (`bookings` for the signed-in user), booking detail,
profile, settings, support. Native bottom tabs. All reads, no writes — cheapest
way to validate the query layer and RLS from a new client.

### Phase 3 — The booking write path

Service selection → hospital picker → patient details → pincode check → slot →
confirm. Straight `INSERT` under RLS, exactly as the website does it.
`enforce_service_area()` still rejects out-of-area rows server-side regardless of
what the app allows.

**Done when:** the money loop closes end to end from mobile — book on the phone,
accept in the companion portal, complete & bill, and the amount matches on both.

### Phase 4 — Native-only capability

Live tracking (native maps + Supabase Realtime broadcast on `trip:<id>`), push
notifications via Expo Notifications writing to the existing `push_tokens` table
(migration 21) so `api/cron/send-push` drains to it unchanged, image picker for
patient documents into the `patient-docs` bucket, permissions, gestures, bottom
sheets.

### Phase 5 — Store compliance

Blocking for both stores, none of it built yet:

- **In-app account deletion** — required by Apple 5.1.1(v) and Play. Needs a
  migration (soft-delete + `auth.users` removal) plus a screen in mobile *and* a
  page on the website.
- **Sign in with Apple** — required by Apple 4.8 because Google sign-in is
  offered. Supabase provider + Apple Services ID + native button.
- **Privacy manifest** (`PrivacyInfo.xcprivacy`) — Expo config plugin.
- Data Safety form (Play), App Privacy answers (Apple), privacy policy URL
  (`/privacy` exists).

### Phase 6 — Ship, then retire the shell

EAS Build → AAB for Play, IPA for App Store. Google Play App Signing enabled at
first upload. Only after both are live: delete `apps/mobile`'s Capacitor
artifacts and close out ADR-0004.

---

## Deployment

| Surface | How |
|---|---|
| Website / companion / admin | Vercel, unchanged — three projects, three root directories |
| Mobile | EAS Build → AAB (Play) + IPA (App Store), submitted independently |
| Database | Migrations still applied by hand in the Supabase SQL editor, ledger in `DATABASE.md` |

JS-only mobile fixes can ride Expo Updates without a store review. Native
changes cannot.

---

## Constraints and gotchas

- **Node 23.11 is installed.** Expo targets Node LTS (20/22). Expect warnings;
  pin 22 via `.nvmrc` if anything gets weird.
- **`apps/mobile` currently holds the Capacitor Android and iOS projects**,
  including a `google-services.json` and Firebase App Distribution wiring. Do not
  overwrite it in place — the Expo app lands beside it and the old tree is
  deleted only in Phase 6.
- **The Play Console 12-tester / 14-day closed-testing requirement** applies to
  new personal developer accounts and gates the production track. Start that
  clock during Phase 2, not at launch.
- **Service-role key never enters the mobile bundle.** Anything needing it stays
  in `apps/website` server routes.
- **Website stays live throughout.** No phase above touches `apps/website`
  except Phase 0's two-line refactor and Phase 5's deletion page.

---

## Next action

Phase 1 — scaffold the Expo app. Phase 0 is done; `packages/utils` is now
importable from Metro.

Open decision before Phase 1 starts: `apps/mobile` still holds the Capacitor
Android and iOS projects. The Expo app should land in a new directory
(`apps/mobile-app`, renamed to `apps/mobile` in Phase 6) rather than overwrite a
tree that contains `google-services.json` and Firebase App Distribution wiring.
