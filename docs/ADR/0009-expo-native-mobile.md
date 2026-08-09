# ADR-0009 — Native mobile with Expo, not a WebView shell

- **Status:** Accepted, 2026-08-07
- **Supersedes:** [ADR-0004](0004-capacitor-remote-url-shell.md) (Capacitor remote-URL shell)

## Context

ADR-0004 chose a Capacitor shell pointing at `https://caresy.co.in`: one
codebase, every web deploy shipping to the app instantly, no store re-release.
That was the right call to get *something* installable while the web product was
still moving weekly.

It has two ceilings we have now hit:

1. **App Store guideline 4.2 (minimum functionality).** A wrapper around a
   website is the textbook rejection. We hold an Apple Developer account now, so
   this stops being theoretical.
2. **The interactions we want are native ones.** Live tracking maps, gestures,
   bottom sheets, image picker, permissions, background push — each is a fight
   inside a webview and a primitive outside it.

The backend is not the problem. Supabase + RLS + SQL functions already serve
three clients; a fourth is a client, not a new architecture.

## Decision

Build `apps/mobile` as a real **Expo / React Native** app with Expo Router and
TypeScript, talking directly to the existing Supabase project.

- **One database, one auth system, one business-logic layer.** Postgres stays
  the source of truth. RLS stays the security boundary. No mobile backend, no
  duplicate API, no second user store.
- **UI is platform-specific.** No React component, Tailwind class, or page
  layout crosses from web to mobile. Only platform-independent logic is shared —
  types, validation, pricing, constants.
- **Website and mobile coexist indefinitely.** The website stays the SEO,
  desktop, and marketing surface. Feature parity is a direction, not a gate:
  a feature may live on the web for months before it lands on mobile.
- **The Capacitor shell is deprecated.** No further investment. It is retired
  once the Expo build is on both stores.

## Consequences

**Cost we take on**

- Two UIs to maintain for every customer-facing feature, by one developer.
- Store review latency re-enters the loop: a mobile fix is a build + review, not
  a `git push`. Expo Updates covers JS-only fixes; native changes still queue.
- `@caresy/auth` does **not** port. It is built on `@supabase/ssr` — cookies,
  Next middleware, `lucide-react`, `@caresy/ui`. Mobile needs
  `@supabase/supabase-js` with an AsyncStorage adapter and `expo-auth-session`
  for Google OAuth. Same *auth system* (same Supabase project, same users, same
  `is_admin()`); two *client adapters*. The plan's "one authentication system"
  holds at the system level, not the file level.
- `@caresy/utils` is not importable from React Native today: `serviceArea.ts`
  imports `@caresy/auth/supabase/client`, which drags Next and React DOM behind
  it. That edge must be cut before mobile can use `pricing.ts`.
- Expo inside npm workspaces needs Metro monorepo config (`watchFolders`,
  `disableHierarchicalLookup`). Known, solved, but not free.

**What we keep**

- Every migration, policy, trigger, and SECURITY DEFINER function, unchanged.
- Server-authoritative money: mobile calls `complete_booking()` /
  `record_payment()` like every other client. It cannot compute a bill either.
- The three web apps and their Vercel deploys, untouched.

## Alternatives rejected

- **Keep the Capacitor shell.** Cheapest, but 4.2 makes iOS a coin flip and the
  native interactions stay out of reach.
- **React Native without Expo (bare CLI).** More control over native modules,
  much more maintenance surface. Wrong trade for a solo developer; EAS handles
  signing, builds, and store submission we would otherwise hand-roll.
- **Flutter / native Swift + Kotlin.** Two more languages, three codebases.
  Rejected on maintenance cost alone.
- **PWA only.** Already have it. Does not give push reliability on iOS, store
  presence, or the native feel; the store accounts are already bought.
