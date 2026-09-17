# ADR-0014: A separate admin iOS app, not admin screens inside the customer app

- **Status:** Accepted
- **Date:** 2026-09-16
- **Code:** `apps/admin-app/`, `packages/native/`, `supabase/migrations/51_ADMIN_DEVICE_PUSH.sql`

## Context

The dispatch desk is a phone job. A booking arrives, somebody has to see it and
put a companion on it, and until now the only ways to notice were `admin.caresy.co.in`
open in a browser tab or a Telegram channel. Telegram tells you something
happened; it cannot assign a companion, and it is the same channel the ops team
uses for everything else, so it is easy to scroll past at 2am.

The customer app (`apps/mobile-app`) already exists in Expo and already carries
the hard parts: Supabase auth with encrypted session storage, push registration,
EAS build and submit credentials. Whatever the admin surface is, rebuilding
those from scratch would be the expensive way to get nowhere new.

## Decision

A second Expo app, `apps/admin-app`, bundle id `in.co.caresy.admin`, shipped as
its own App Store listing. It shares `packages/native` (the Supabase client and
its encrypted session storage), `@caresy/types` and `@caresy/utils` with the
customer app, and nothing else — a separate design language, a separate binary,
a separate release cadence.

Its writes go through the same guarded RPCs the admin website uses
(`admin_save_booking_edit`, migration 41/42); it holds no service-role key and
gets no new privileges. `is_admin()` gates the UI, RLS gates the data.

## Alternatives rejected

- **Admin screens inside the customer app, gated on `is_admin`** — one binary,
  no new pipeline, and the reason it loses is that dispatch code would then ship
  in every customer's download and share the customer app's review risk. A
  rejected admin change would block a customer release.
- **Capacitor around `admin.caresy.co.in`** — ADR-0004 tried the remote-URL
  shell and ADR-0009 replaced it. A WebView cannot receive a push, which is the
  entire point of this app.
- **TestFlight-only internal distribution** — cheaper (no review, no demo
  account) but caps at 100 testers and expires builds every 90 days. A public
  listing was chosen deliberately; see Consequences.

## Consequences

- A second App Store Connect record, a second review queue, and a second set of
  review notes. Apple will ask for a working demo admin account for a
  login-walled app — `docs/APP_REVIEW_NOTES.md` has to grow an admin section.
- Two apps now depend on `packages/native`. A change to the session storage
  there is a change to both, and both have to be rebuilt.
- Revisit if the desk stops being a phone job — if dispatch moves to a staffed
  control room with screens, the website is the better surface and this app
  becomes a notifier.
