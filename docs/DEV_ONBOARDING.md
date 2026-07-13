# Caresy Live Tracking — Developer Onboarding

Read this first. It explains what was built, how to get it running on your
machine, the rules to keep in mind, and what to do next. The feature spans **two
GitHub repos** that share **one Supabase project**.

| Repo | What's in it |
| --- | --- |
| [`abhiiiiiisshek/caresy_phone`](https://github.com/abhiiiiiisshek/caresy_phone) | Monorepo: 3 Next.js web portals (website / companion / admin) **and** the shared Supabase backend (`supabase/migrations`, `supabase/functions`). |
| [`abhiiiiiisshek/caresy-app`](https://github.com/abhiiiiiisshek/caresy-app) | Expo (SDK 57 / RN 0.86) mobile app — companion + customer live-tracking screens. |

Work-in-progress lives on branch **`claude/new-session-t5fgt2`** in each repo,
each with an open **PR #1**.

---

## 1. What we built

Real-time companion location tracking. A customer books a hospital companion;
once a companion is assigned, a **trip** begins. The companion's phone streams
GPS to the customer, who watches a marker glide on a map with a live ETA and a
status stepper (Assigned → En route to pickup → Picked up → En route to hospital
→ Arrived). Everything is enforced by Postgres RLS — a customer only ever sees
their own trip; a companion only their assigned trip.

**How it works (the important architecture):**

- **Location pings → Supabase Realtime *Broadcast*** on a private per-trip channel
  `trip:<id>`. Fire-and-forget, **zero DB writes per ping**. Only the assigned
  companion may send; only participants may receive (RLS on `realtime.messages`).
- **Trip status → `public.trips` + Postgres Changes.** Durable, auditable, and
  advanced only through a server-authoritative RPC (`advance_trip_status`).
- **ETA → the `trip-eta` Edge Function** calling **OpenRouteService** (free,
  OSM-based; API key stays server-side).
- **Maps → MapLibre + OpenStreetMap** — no Google, no map API key.
- **Trips are created/closed automatically** from the booking state machine (a DB
  trigger), so no client has to create them.

Full status, checklist and vision: [`docs/LIVE_TRACKING_HANDOFF.md`](LIVE_TRACKING_HANDOFF.md).
Backend deep-dive: [`docs/08_Database/TRIPS_AND_LIVE_TRACKING.md`](08_Database/TRIPS_AND_LIVE_TRACKING.md).
The app's self-contained backend contract: `caresy-app/docs/BACKEND_CONTRACT.md`.

---

## 2. Get it on your machine (import to your CLI)

You need: **Node 20+**, **git**, the **Supabase CLI**, and (for the mobile app)
**Xcode** (iOS) and/or **Android Studio + SDK**. Optional: the GitHub CLI (`gh`)
and Claude Code CLI (`npm i -g @anthropic-ai/claude-code`, then run `claude` in a
repo).

```bash
# Backend + web portals
git clone https://github.com/abhiiiiiisshek/caresy_phone.git
cd caresy_phone
git checkout claude/new-session-t5fgt2      # or: gh pr checkout 1
npm install

# Mobile app (in a separate folder)
git clone https://github.com/abhiiiiiisshek/caresy-app.git
cd caresy-app
git checkout claude/new-session-t5fgt2      # or: gh pr checkout 1
npm install
```

> Tip: keep **one terminal / editor / Claude Code chat per repo** — they're
> separate repos and it keeps context clean. The only thing that must stay in
> sync between them is the backend contract (see the rules below).

### 2a. Backend setup (`caresy_phone` + Supabase)

1. Get the project's `Project URL` and `anon`/publishable key from the Supabase
   dashboard (ask the owner for access).
2. In the **SQL editor**, apply the new migrations **in order**:
   `supabase/migrations/16_TRIPS_AND_LIVE_TRACKING.sql` →
   `17_TRIP_ETA.sql` → `18_BOOKING_TRIP_LINK.sql`.
   (They're idempotent; if `postgis`/`pg_cron` error on permissions, enable them
   via Dashboard → Database → Extensions, then re-run.)
3. **Dashboard → Realtime → Settings → disable "Allow public access."** Required,
   or the private-channel security policies aren't enforced.
4. Deploy the ETA function and set its secret:
   ```bash
   supabase link --project-ref <your-ref>
   supabase functions deploy trip-eta
   supabase secrets set OPENROUTESERVICE_API_KEY=...   # free key from openrouteservice.org
   ```
5. Run a web portal (each needs a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — see each app's `.env.example`):
   ```bash
   npm run dev -w @caresy/website     # or @caresy/companion / @caresy/admin
   ```

### 2b. Mobile app setup (`caresy-app`)

```bash
cp .env.example .env     # fill EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY (same project)
# optional: set EXPO_PUBLIC_MAP_STYLE_URL to a MapTiler/Protomaps street style
npx expo run:ios         # or: npx expo run:android
```

**Use a development build, NOT Expo Go** — MapLibre and `expo-location` are
native modules that Expo Go can't load.

### 2c. Test the full loop

1. As an assigned companion (or admin), call `start_trip_for_booking(booking_id)`
   → returns a trip id (or move a booking to `ACCEPTED`/`IN_PROGRESS` and the
   trigger creates the trip).
2. Sign in on two devices; open the app — it lists your active bookings.
3. Companion taps **Share your location**; the customer taps **Track live** and
   sees the marker move, the ETA populate, and the stepper advance.

---

## 3. Keep in mind — DO

- **One Supabase project, many clients.** All three web portals and the mobile
  app point at the same project and are governed by the same RLS. Role is decided
  by DB identity, not by which app/subdomain asked.
- **RLS is the security boundary.** Never trust client-supplied user ids; derive
  them from `auth.uid()` / the booking. Test policies with a real user JWT.
- **Location pings go over Broadcast only** — never write a DB row per ping.
- **Trip status changes go through the RPC** (`advance_trip_status`), never a
  direct client `UPDATE`. Trip creation goes through the trigger or
  `start_trip_for_booking`.
- **Migrations are numbered and idempotent.** Add new ones as `19_...`, `20_...`
  using the existing `IF NOT EXISTS` / `DROP ... IF EXISTS` / `DO $$ ... EXCEPTION`
  patterns so they're safe to re-run.
- **Keep the contract in sync.** If you change an RPC name/args, a table column,
  the channel name, or the broadcast payload in `caresy_phone`, update
  `caresy-app/docs/BACKEND_CONTRACT.md` (and the app code) in the same change.
- **Foreground-only location** for launch — it dramatically simplifies store
  review. Purpose strings are already set.

## 4. Keep in mind — DON'T

- **Don't create a second Supabase project** per portal/app — that causes data
  silos and cross-project syncing. One project, RLS-gated.
- **Don't put the OpenRouteService (or any) API key in the client.** It stays a
  Supabase secret, used only by the Edge Function.
- **Don't re-enable Realtime "Allow public access."** Private channels only.
- **Don't write per-ping rows** to `trips`/`trip_locations` — that defeats the
  whole cost/latency model. The optional breadcrumb (if ever enabled) is throttled.
- **Don't run the app in Expo Go** or call `playwright install` — use a dev build.
- **Don't add background location** unless there's a real product need; it invokes
  the strictest Apple/Google review paths (see the checklist in the handoff doc).
- **Don't hand-edit generated/native folders** (`ios/`, `android/`) — they're
  produced by `expo prebuild`/`run` and are gitignored.

---

## 5. How to proceed (next steps, prioritized)

The core loop is complete and verified up to the bundle. Suggested order:

1. **Richer job cards** in the app home (patient name, hospital, scheduled time) —
   a couple more RLS-scoped reads.
2. **In-app booking creation** so bookings can start on mobile (they currently
   originate from the web portals).
3. **Admin live view** — a map of active trips (policies already allow admin reads).
4. **Push notifications** on status changes (there's a `notifications` enqueue
   table from migration 13 to drain).
5. **Auth/domain config** — Supabase redirect URLs incl. `com.caresy.app://**`,
   Site URL, portal-specific email templates.
6. **Store submission** — icons/splash, privacy policy URL, Data-safety form.
   Background location only if truly needed.
7. **Harden ETA** — cache per trip, back off on ORS rate limits, or self-host OSRM
   to drop request caps.

---

## 6. What's verified vs. not

**Verified** in CI (no live project needed): SQL follows the repo's idempotency
conventions; `deno check` passes on the Edge Function; the app is `tsc`-clean, its
Expo config resolves, and a Metro iOS bundle builds.

**Not yet verified** (needs a device + the live Supabase project): on-device map
rendering, the real GPS → Broadcast → map round-trip, and the live OpenRouteService
call. Please smoke-test these on a dev build with the project configured as in §2a.

---

## 7. Where to look

- App screens: `caresy-app/src/app/(companion|customer)/trip/[id].tsx`, home at `src/app/index.tsx`
- App data layer: `caresy-app/src/lib/*` (`supabase`, `trips`, `bookings`, `eta`, hooks)
- Backend: `caresy_phone/supabase/migrations/16–18`, `caresy_phone/supabase/functions/trip-eta`
- Contract (app ↔ backend): `caresy-app/docs/BACKEND_CONTRACT.md`
- Status / vision: `caresy_phone/docs/LIVE_TRACKING_HANDOFF.md`
