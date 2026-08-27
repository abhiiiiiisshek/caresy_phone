# ADR-0013: OTA updates via expo-updates, gated by fingerprint

- **Status:** Accepted
- **Date:** 2026-08-21
- **Code:** `apps/mobile-app/app.json` (`updates`, `runtimeVersion`), `apps/mobile-app/eas.json` (channels)

## Context

Before this, the mobile app had no OTA path — `eas.json` already had
`development`/`preview`/`production` channels scaffolded, but without the
`expo-updates` package and an `updates` block in `app.json` they were inert.
Every change, including pure JS/UI edits with zero native surface, required a
full `eas build` + App Store/TestFlight resubmission cycle to reach an
installed IPA.

## Decision

Installed `expo-updates` and wired `app.json`:
`runtimeVersion: { policy: "fingerprint" }` plus an `updates.url` pointing at
this project's EAS Update endpoint. Fingerprint policy hashes the actual
native surface (config + native deps) rather than trusting a hand-bumped
version string — an update only reaches a build if its JS is compatible with
that build's actual native code, computed automatically. The three existing
build channels (`development`/`preview`/`production`) become the OTA release
tracks unchanged.

## Alternatives rejected

- **`runtimeVersion` policy `appVersion`** — ties compatibility to `expo.version`,
  which is bumped by hand and easy to forget when a native dependency changes,
  silently serving an incompatible JS bundle to an old native build.
- **No OTA (status quo)** — every copy/spacing/logic fix costs a full native
  build + store review cycle, even when nothing native changed.

## Consequences

JS-only changes (styling, most business logic, most bug fixes) can ship via
`eas update --channel <name>` instantly to installed apps — no store review,
no new IPA. Native changes (new native module, permission, Expo SDK bump, app
icon) still always need a fresh `eas build` + resubmission — OTA cannot touch
those, and `expo-updates` will refuse to apply a JS update whose fingerprint
doesn't match the running native binary. This ADR only wires the mechanism —
it takes effect starting with the *next* native build; the currently-running
dev client and any already-shipped IPA predate `expo-updates` and won't pick
up OTA updates until rebuilt.
