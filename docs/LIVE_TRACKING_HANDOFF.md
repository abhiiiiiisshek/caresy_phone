# Caresy Live Tracking — Handoff, Next Steps & Vision

A single place to understand the real-time companion location-tracking feature:
what's built, how to turn it on, what's left, and where it's going.

Everything below lives in this monorepo. Earlier drafts of this document split
it across a second `caresy-app` repo; the Expo app is `apps/mobile-app` now, and
the paths in the tables have been moved with it.

| Path | Role |
| --- | --- |
| `apps/website`, `apps/companion`, `apps/admin` | Next.js portals. The companion portal is where a companion shares location today. |
| `apps/mobile-app` | Expo (SDK 57 / RN 0.86) customer app — booking, my-bookings, the live-tracking screen. |
| `supabase/migrations`, `supabase/functions` | The shared backend. |

---

## The idea in one paragraph

A customer books a hospital companion. Once a companion is assigned, a **trip**
begins. The companion's phone streams its GPS location to the customer in real
time; the customer watches a marker move on a map beside a progress stepper
(Assigned → En route to pickup → Picked up → En route to hospital → Arrived).
An ETA belongs in that picture and does not work yet — see "Known dead ends". Everything is enforced by Postgres RLS — a customer only
ever sees their own trip, a companion only their assigned trip.

## Architecture at a glance

```
Companion app ──GPS──▶ Realtime BROADCAST (private channel trip:<id>) ──▶ Customer app
     │                        (ephemeral, 0 DB writes/ping)                    │
     │                                                                         ▼
     └── advance_trip_status() RPC ──▶ public.trips (status) ──Postgres Changes──▶ stepper
                                            │
Customer app ── trip-eta Edge Function ──▶ get_trip_destination() + OpenRouteService ──▶ ETA
```

- **Location pings → Realtime Broadcast** on a private per-trip channel. Fire-and-forget, sub-50ms, **zero DB writes per ping**. Only the assigned companion may send; only participants may receive (RLS on `realtime.messages`).
- **Trip status → `public.trips` + Postgres Changes.** Durable, auditable, tamper-proof — drives the stepper. Advanced only through a server-authoritative RPC.
- **ETA → `trip-eta` Edge Function** calling **OpenRouteService** (free, OSM-based; key server-side). Free-flow duration (no live traffic), refreshed ~45s.
- **Maps** — `react-native-maps` in the app, an OpenStreetMap embed on the web page. No API key on either.
- **Poll floor.** Broadcast is `TO authenticated` and participant-checked, so a guest holding a WhatsApp link cannot join it. `get_shared_tracking` polling backs every surface and is the only path that guest has.

## What's built (status)

| Area | Status | Where |
| --- | --- | --- |
| Trips + breadcrumb tables, RLS, Realtime authorization, RPCs, pg_cron purge | ✅ | `supabase/migrations/16_TRIPS_AND_LIVE_TRACKING.sql` |
| ETA destination lookup RPC | ✅ | `supabase/migrations/17_TRIP_ETA.sql` |
| Auto-create/close trip from booking lifecycle + active-trip helper | ✅ | `supabase/migrations/18_BOOKING_TRIP_LINK.sql` |
| `trip-eta` Edge Function (OpenRouteService) + CORS | ✅ | `supabase/functions/trip-eta`, `_shared/cors.ts` |
| Guest tracking link (`share_token`) + its narrow reader | ✅ | `22_PUBLIC_TRACKING.sql`, `47_TRACKING_TRIP_STATE.sql` |
| Companion: foreground location → `trips` write + Broadcast + breadcrumb | ✅ | `apps/companion/src/components/LocationShare.tsx` |
| Companion: trip status controls | ✅ | `apps/companion/src/components/TripStatusControl.tsx` |
| Customer screen: map + marker + stepper, Broadcast with a poll floor | ✅ | `apps/mobile-app/app/tracking.tsx` |
| Guest/web tracking page (poll only, by design) | ✅ | `apps/website/src/app/tracking/page.tsx` |
| Admin live board | ✅ | `apps/admin/src/app/live/page.tsx` |
| Shared timeline contract + self-check | ✅ | `packages/utils/src/bookingStatus.ts` |
| Live ETA to the customer (pre-pickup) | ✅ | `48_TRIP_ETA_TARGET.sql`, `supabase/functions/trip-eta`, `packages/utils/src/eta.ts` |
| Live ETA to the hospital (post-pickup) | ❌ | see "Known dead ends" |
| Auto-start sharing + Screen Wake Lock + not-sharing warning | ✅ | `apps/companion/src/components/LocationShare.tsx` |
| Background location (survives a locked phone) | ❌ | next step 6 — needs a native companion app |

**Verified** to the limits of a CI environment: SQL follows repo idempotency
conventions; `deno check` passes on the function; the apps are `tsc`-clean and
build. **Not** verified (needs a device + a live project): on-device map
rendering, a real GPS + Broadcast round-trip, and the OpenRouteService call.

## Known dead ends (2026-09-04)

Two pieces of this document described things that were wired but not working.

- **The Broadcast channel was addressed by the wrong id.** Both ends used
  `trip:<share_token>` while the RLS on `realtime.messages` resolves a topic by
  casting its second segment to a `trips.id`. Every send and every subscribe was
  denied, silently, and the poll carried the feature. Fixed by migration 47
  returning `trip_id` and both clients using `trip:<trip_id>`.
- **The hospital ETA is a data gap, not a bug — and it is still open.**
  `get_trip_destination` (migration 17) reads `bookings.destination_location_id`,
  and **no app has ever written that column** — not the two web booking flows,
  not the mobile one, not the admin board. A hospital companion booking keeps the
  hospital name and the meeting point in ONE `locations` row (`title` vs
  `address_line_1`), so there is no second row to point at, and
  `lib/hospitals.ts` is a hand-kept name+area list with no coordinates to build
  one from. Closing it means geocoding or hand-entering ~50 hospitals; decide
  that before touching the Edge Function again.

  What shipped instead: the ETA a family actually waits on is *"how far away is
  my companion from me"*, and that target has always existed. Migration 48's
  `get_trip_eta_target()` returns the pickup pin while the trip is `assigned` /
  `en_route_pickup` and the hospital after, so the pre-pickup ETA works today and
  the post-pickup one starts working for free on the day a destination is
  written.

## Turn-it-on checklist (manual, one-time)

Backend (Supabase SQL editor / CLI):

1. Run migration **`16_TRIPS_AND_LIVE_TRACKING.sql`**, then **`17_TRIP_ETA.sql`**.
   - If `postgis` / `pg_cron` error on permissions, enable them via Dashboard → Database → Extensions, then re-run.
2. **Dashboard → Realtime → Settings → disable "Allow public access."** Without this, the private-channel policies aren't enforced.
3. Deploy the ETA function and set its secret:
   ```bash
   supabase functions deploy trip-eta
   supabase secrets set OPENROUTESERVICE_API_KEY=...   # free key from openrouteservice.org
   ```

Mobile app (`apps/mobile-app`):

4. `npm install` at the repo root (workspaces), then fill `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` per `.env.example`.
5. Build a **dev build** (`npx expo run:ios` / `run:android`) — `react-native-maps` and `expo-location` need native modules, so Expo Go won't work.

Auth (for the app to sign in across web + mobile):

6. Supabase → Auth → URL config: add redirect URLs incl. `com.caresy.app://**` and the three portal origins; keep one canonical Site URL.

### Test the loop end to end
1. As an assigned companion (or admin), call `start_trip_for_booking(booking_id)` → returns a trip id.
2. Sign in on two devices; open that trip id — one as companion, one as customer.
3. Companion taps **Share live location**; the customer sees the marker move and the stepper advance as the companion progresses the trip status.

## Next steps (prioritized)

1. **Booking → trip.** ✅ Done. Backend (migration 18) auto-creates/closes trips from the booking lifecycle. The customer app reaches a trip through its booking's `share_token` (`apps/mobile-app/app/my-bookings.tsx` → `app/tracking.tsx`); the companion starts one from the job card (`apps/companion/src/app/page.tsx` calls `start_trip_for_booking` on Start).
2. **Auth & domain config** (blueprint part a): finish redirect URLs, Site URL, and portal-specific email templates; verify web↔mobile session parity.
3. **Persisted breadcrumb (optional):** throttled inserts into `trip_locations` (every ~15–30s / 100m) if post-trip audit is needed; the purge job already exists. Otherwise leave it off.
4. **Admin live view:** an admin map of active trips (policies already allow `is_admin()` reads on trips + `realtime.messages`).
5. **Push notifications** on status changes (there's already a `notifications` enqueue table in migration 13 to drain).
6. **Background location — the biggest remaining gap.** Sharing now starts on its own when the companion taps Start job and holds a Screen Wake Lock while the tab is visible, which covers a phone in a pocket with the screen on. It does not survive a locked phone or an app switch: the companion portal is a browser tab and the OS suspends it. The customer then sees the last position with an ageing timestamp — honest, not live. The real fix is a companion role inside `apps/mobile-app`, which can hold background location, and that needs Apple 5.1.5 justification + Google's declaration/demo-video flow.
7. **Store submission:** icons/splash, privacy policy URL, Data-safety form, purpose strings (already set for foreground).
8. **Harden ETA:** cache per trip, back off on ORS rate limits, optionally self-host OSRM to remove request caps.

## Vision

- **Trust through transparency.** A family watching a companion escort their patient to the hospital, in real time, is the product's emotional core. Live location + a tamper-proof status stepper turn an anxious wait into a calm one.
- **One backend, every surface.** Customer, companion, admin — web and mobile — all on one Supabase project, one RLS model. No data silos, no per-portal backends. New surfaces (a dispatcher wall-board, a partner hospital view) are just new UIs over the same policies.
- **Cheap by construction.** Broadcast keeps the map buttery-smooth with zero per-ping database writes; free/open building blocks (OpenStreetMap tiles, OpenRouteService) keep unit costs near zero and avoid vendor lock-in.
- **Safety-grade data hygiene.** Health-adjacent PII: minimal retention (ephemeral pings, 7-day breadcrumb purge), server-authoritative state, and access decided by identity — never by which app or domain asked.
- **Where it grows:** ETA-driven proactive nudges ("companion is 5 min away"), nearest-companion dispatch (PostGIS is already enabled), post-trip safety summaries, and multi-city scale-out — all without changing the core transport model.

## Key files

- Backend: `supabase/migrations/16_TRIPS_AND_LIVE_TRACKING.sql`, `17_TRIP_ETA.sql`, `supabase/functions/trip-eta/index.ts`
- Deep dive: [`docs/08_Database/TRIPS_AND_LIVE_TRACKING.md`](08_Database/TRIPS_AND_LIVE_TRACKING.md)
- Customer: `apps/mobile-app/app/tracking.tsx`, `apps/website/src/app/tracking/page.tsx`
- Companion: `apps/companion/src/components/LocationShare.tsx`, `TripStatusControl.tsx`
- Shared: `packages/utils/src/bookingStatus.ts` (+ its `.check.ts`)
