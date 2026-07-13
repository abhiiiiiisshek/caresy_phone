# Supabase Edge Functions

Deno functions deployed to the shared Caresy Supabase project.

| Function | Purpose |
| --- | --- |
| `trip-eta` | ETA for a live trip via OpenRouteService (free, OSM-based; key server-side). See [docs/08_Database/TRIPS_AND_LIVE_TRACKING.md](../../docs/08_Database/TRIPS_AND_LIVE_TRACKING.md#eta-edge-function-trip-eta). |

`_shared/cors.ts` holds the CORS allow-list used by browser (web-portal) callers.

## Deploy

```bash
supabase functions deploy trip-eta
```

## Secrets

```bash
supabase secrets set OPENROUTESERVICE_API_KEY=...   # free key from openrouteservice.org
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically by the Edge
runtime — do not set them manually.

## Local dev

```bash
supabase functions serve trip-eta --env-file ./supabase/functions/.env.local
```
