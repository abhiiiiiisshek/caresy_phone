# ADR-0004: The Android app is a Capacitor shell pointing at the live site

- **Status:** Accepted
- **Date:** 2026-07-26
- **Code:** `apps/mobile/capacitor.config.ts`

## Context

Customers in Noida expect an app icon, and push notifications need a native
container. But the product changes several times a week, and a solo founder
cannot serialise every fix behind a Play Store review.

## Decision

Capacitor 7 webview loading `https://caresy.co.in` directly (`server.url`), with
`allowNavigation` limited to Caresy hosts, Google accounts, Supabase and
WhatsApp. Native plugins only where the web cannot reach: push, haptics, network
state, splash, status bar. **No product logic lives in `apps/mobile`** — every
web deploy updates the app instantly, no store release.

## Alternatives rejected

- **React Native / Expo app** — a second implementation of every screen, for a
  product whose entire surface is already a responsive web app.
- **Static export bundled into `webDir`** — offline support and faster first
  paint, but every fix would need a store release. Not worth it yet.
- **PWA only** — no Play Store presence, and push on Android via PWA is weaker
  for the trust-sensitive audience here.

## Consequences

- The app is offline-blind: no network means the error page.
- Apple review is stricter than Google's about pure webview wrappers; iOS may
  force the static-export path (the `ponytail:` note in the config marks this).
- A broken web deploy breaks the installed app instantly — the smoke tests in
  `docs/ARCHITECTURE.md` are the guard.
