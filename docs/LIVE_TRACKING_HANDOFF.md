# Caresy Live Tracking — Handoff, Next Steps & Vision

A single place to understand the real-time companion location-tracking feature:
what's built, how to turn it on, what's left, and where it's going. Spans **two
repos** that share **one Supabase project**.

| Repo | Role |
| --- | --- |
| `caresy_phone` | Monorepo: 3 Next.js web portals (website / companion / admin) + the shared Supabase backend (`supabase/migrations`, `supabase/functions`). |
| `caresy-app` | Expo (SDK 57 / RN 0.86) mobile app — companion + customer live-tracking screens. |

---

## The idea in one paragraph

A customer books a hospital companion. Once a companion is assigned, a **trip**
begins. The companion's phone streams its GPS location to the customer in real
time; the customer watches a marker glide along a map with a live ETA and a
progress stepper (Assigned → En route to pickup → Picked up → En route to
hospital → Arrived). Everything is enforced by Postgres RLS — a customer only
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
- **Maps → MapLibre** with OpenStreetMap tiles — no Google dependency, no API key on either platform.

## What's built (status)

| Area | Status | Where |
| --- | --- | --- |
| Trips + breadcrumb tables, RLS, Realtime authorization, RPCs, pg_cron purge | ✅ | `supabase/migrations/16_TRIPS_AND_LIVE_TRACKING.sql` |
| ETA destination lookup RPC | ✅ | `supabase/migrations/17_TRIP_ETA.sql` |
| `trip-eta` Edge Function (OpenRouteService) + CORS | ✅ | `supabase/functions/trip-eta`, `_shared/cors.ts` |
| Companion screen: foreground location → Broadcast + status controls | ✅ | `caresy-app` `src/app/(companion)/trip/[id].tsx` |
| Customer screen: MapLibre map + animated marker + path + live ETA + stepper | ✅ | `caresy-app` `src/app/(customer)/trip/[id].tsx` |
| Supabase client, trip types/RPC wrappers, session/status hooks | ✅ | `caresy-app` `src/lib/*` |
| Dev harness (email-OTP sign-in → open a trip by id) | ✅ | `caresy-app` `src/app/index.tsx` |

**Verified** to the limits of a CI environment: SQL follows repo idempotency
conventions; `deno check` passes on the function; the app is `tsc`-clean, its
Expo config resolves, and a Metro iOS bundle builds. **Not** verified (needs a
device/live project): on-device map rendering, real GPS + Broadcast round-trip,
and the live OpenRouteService call.

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

Mobile app (`caresy-app`):

4. `npm install`, then `cp .env.example .env` and fill `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
5. (Recommended) set `EXPO_PUBLIC_MAP_STYLE_URL` to a real street-level tile style (MapTiler/Protomaps free tier or self-hosted). The default is MapLibre's low-detail no-key demo style — fine to prove the wiring, not for production.
6. Build a **dev build** (`npx expo run:ios` / `run:android`) — MapLibre + expo-location need native modules, so Expo Go won't work.

Auth (for the app to sign in across web + mobile):

7. Supabase → Auth → URL config: add redirect URLs incl. `com.caresy.app://**` and the three portal origins; keep one canonical Site URL.

### Test the loop end to end
1. As an assigned companion (or admin), call `start_trip_for_booking(booking_id)` → returns a trip id.
2. Sign in on two devices; open that trip id — one as companion, one as customer.
3. Companion taps **Start sharing location**; the customer sees the marker move, the ETA populate, and the stepper advance as the companion progresses the status.

## Next steps (prioritized)

1. **Wire booking → trip.** Create the trip from a real booking instead of a hand-typed id: call `start_trip_for_booking` when a companion accepts / the job goes in-progress, and route both parties to `trip/<id>`. *(Highest value — makes the flow real.)*
2. **Auth & domain config** (blueprint part a): finish redirect URLs, Site URL, and portal-specific email templates; verify web↔mobile session parity.
3. **Persisted breadcrumb (optional):** throttled inserts into `trip_locations` (every ~15–30s / 100m) if post-trip audit is needed; the purge job already exists. Otherwise leave it off.
4. **Admin live view:** an admin map of active trips (policies already allow `is_admin()` reads on trips + `realtime.messages`).
5. **Push notifications** on status changes (there's already a `notifications` enqueue table in migration 13 to drain).
6. **Background location — decide deliberately.** Foreground-only is the low-risk launch path (blueprint part d). Only add background if companions must share with the screen off; if so, complete Apple 5.1.5 + Google's declaration/demo-video flow.
7. **Store submission:** icons/splash, privacy policy URL, Data-safety form, purpose strings (already set for foreground).
8. **Harden ETA:** cache per trip, back off on ORS rate limits, optionally self-host OSRM to remove request caps.

## Vision

- **Trust through transparency.** A family watching a companion escort their patient to the hospital, in real time, is the product's emotional core. Live location + a tamper-proof status stepper turn an anxious wait into a calm one.
- **One backend, every surface.** Customer, companion, admin — web and mobile — all on one Supabase project, one RLS model. No data silos, no per-portal backends. New surfaces (a dispatcher wall-board, a partner hospital view) are just new UIs over the same policies.
- **Cheap by construction.** Broadcast keeps the map buttery-smooth with zero per-ping database writes; free/open building blocks (MapLibre + OpenStreetMap, OpenRouteService) keep unit costs near zero and avoid vendor lock-in.
- **Safety-grade data hygiene.** Health-adjacent PII: minimal retention (ephemeral pings, 7-day breadcrumb purge), server-authoritative state, and access decided by identity — never by which app or domain asked.
- **Where it grows:** ETA-driven proactive nudges ("companion is 5 min away"), nearest-companion dispatch (PostGIS is already enabled), post-trip safety summaries, and multi-city scale-out — all without changing the core transport model.

## Key files

- Backend: `supabase/migrations/16_TRIPS_AND_LIVE_TRACKING.sql`, `17_TRIP_ETA.sql`, `supabase/functions/trip-eta/index.ts`
- Deep dive: [`docs/08_Database/TRIPS_AND_LIVE_TRACKING.md`](08_Database/TRIPS_AND_LIVE_TRACKING.md)
- App: `caresy-app/src/app/(companion|customer)/trip/[id].tsx`, `caresy-app/src/lib/*`, `caresy-app/README.md`
