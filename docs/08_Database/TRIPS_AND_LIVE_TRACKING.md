# Trips & Real-Time Companion Location Tracking

Migration: [`supabase/migrations/16_TRIPS_AND_LIVE_TRACKING.sql`](../../supabase/migrations/16_TRIPS_AND_LIVE_TRACKING.sql)

This is the backend for the live-tracking feature: the customer watches their
companion move on a map, in real time, while a tamper-proof status stepper
tracks each leg of the journey. It builds on the existing `bookings` schema — a
**trip** is the live-journey view of an in-progress booking.

## Transport model (why two channels)

| Signal | Transport | Persisted? | Why |
| --- | --- | --- | --- |
| Location pings | Realtime **Broadcast** on private channel `trip:<trip_id>` | No | <50ms latency, **zero DB writes per ping**, secured by RLS on `realtime.messages` |
| Trip status | `public.trips` + **Postgres Changes** | Yes | Must be durable, auditable, tamper-proof — drives the stepper |
| Breadcrumb (optional) | throttled INSERT into `public.trip_locations` | Yes | Post-trip audit only; auto-purged after 7 days |

Broadcast keeps the map buttery-smooth without hammering the database; Postgres
keeps the status machine consistent and spoof-proof.

## What the migration creates

- **`trip_status` enum**: `assigned → en_route_pickup → picked_up → en_route_hospital → arrived → completed`, plus `cancelled`. Finer-grained than `booking_status_enum` on purpose (the booking stays the source of truth for *who* is assigned; the trip tracks *where they are in the journey*).
- **`public.trips`** — one row per booking (`UNIQUE(booking_id)`): denormalized `customer_user_id` / `companion_user_id`, `status`, `destination` geography, last-known `last_lat`/`last_lng`/`last_location_at`, `eta_seconds`.
- **`public.trip_locations`** — optional throttled breadcrumb with a GiST spatial index.
- **RLS** — participants (customer, companion) and admins can read; **only the assigned companion** can update the trip or insert breadcrumbs, and only while the trip is non-terminal.
- **Realtime Authorization** on `realtime.messages` — the private `trip:<uuid>` channel: participants/admin may *receive* broadcasts; **only the assigned companion** on a live trip may *send*.
- **RPCs** (both `SECURITY DEFINER`, granted to `authenticated`):
  - `start_trip_for_booking(p_booking uuid) → uuid` — the **only** way to create a trip. Derives customer/companion from the booking (never trusts client-supplied ids), authorizes the caller as the assigned companion or an admin, and is idempotent (returns the existing trip id if already started).
  - `advance_trip_status(p_trip uuid, p_next trip_status)` — server-authoritative state machine; only the assigned companion, only along a legal transition, never out of a terminal state.
- **`pg_cron` job** `purge-trip-locations` — deletes breadcrumb rows older than 7 days (03:00 UTC daily). Ephemeral Broadcast pings self-expire in `realtime.messages` within ~72h and never hit these tables.

## Required dashboard step (cannot be done in SQL)

In **Dashboard → Realtime → Settings, disable "Allow public access."** The
`realtime.messages` policies are only enforced for private channels; leaving
public access on would let anyone subscribe to any topic.

If `CREATE EXTENSION postgis`/`pg_cron` errors with a permission error, enable
them via **Dashboard → Database → Extensions** first, then re-run the file.

## ETA (Edge Function `trip-eta`)

Migration [`17_TRIP_ETA.sql`](../../supabase/migrations/17_TRIP_ETA.sql) adds
`get_trip_destination(p_trip) → (dest_lat, dest_lng)` — a `SECURITY DEFINER` RPC,
gated to trip participants, that extracts the destination from `trips.destination`
(falling back to the booking's destination location).

The Edge Function [`supabase/functions/trip-eta`](../../supabase/functions/trip-eta/index.ts)
computes a traffic-aware ETA:

1. Client sends `{ trip_id, origin: { lat, lng } }`, where `origin` is the
   companion's latest position (from the last Broadcast ping — we don't persist
   pings, so the freshest origin comes from the client).
2. The function calls `get_trip_destination` **as the authenticated caller** (RLS
   applies) so the destination is only revealed to a participant.
3. It calls the **Google Routes API** with the key kept server-side and returns
   `{ eta_seconds, distance_meters }`. The customer app refreshes every ~45s.

Deploy + secret:

```bash
supabase functions deploy trip-eta
supabase secrets set GOOGLE_MAPS_API_KEY=...   # key with the Routes API enabled
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` are injected by the Edge runtime. CORS uses
a dynamic allow-list of the three portal origins (+ Vercel previews + localhost)
in `supabase/functions/_shared/cors.ts`; the mobile app calls via
`supabase.functions.invoke` and isn't subject to browser CORS.

## Client integration (see blueprint (c))

- **Companion**: `supabase.channel('trip:'+id, { config: { private: true } })`, then `watchPositionAsync({ accuracy: High, timeInterval: 4000, distanceInterval: 15 })` → `channel.send({ type:'broadcast', event:'location', payload:{lat,lng,heading,speed,at} })`. Call `advance_trip_status` at each stage. Remove the watcher + channel on unmount / `arrived`.
- **Customer**: subscribe to the same private channel for `location` broadcasts (animate the marker), and to `postgres_changes` UPDATE on `trips` (filter `id=eq.<id>`) to drive the stepper by mapping the enum to `index/4`.
- Location pings go over **Broadcast only** — no per-ping DB writes.
