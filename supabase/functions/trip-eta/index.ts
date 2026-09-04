// trip-eta — server-side ETA for a live trip.
//
// The customer client sends { trip_id, origin: { lat, lng } } where origin is
// the companion's latest position (from the last Realtime Broadcast ping). This
// function asks the server which point the trip is currently heading for
// (RLS-gated to trip participants), asks OpenRouteService (free, OSM-based) for
// a driving route, and returns the ETA. Refresh every ~45s, not per ping.
//
// The target moves with the trip. Before pickup the companion is travelling to
// the customer, so it is the pickup pin — which is the ETA a family is actually
// waiting on. After pickup it is the hospital. get_trip_eta_target (migration
// 48) decides, and reports which one it chose so the client can word it; the
// hospital branch returns nothing until something writes a destination.
//
// NOTE: OpenRouteService gives free-flow durations (no live traffic), which is
// fine for a companion-approaching ETA refreshed off their moving position.
//
// Secrets (set with `supabase secrets set`):
//   OPENROUTESERVICE_API_KEY   a free key from openrouteservice.org
// Auto-injected by the Edge runtime: SUPABASE_URL, SUPABASE_ANON_KEY.
//
// Deploy: supabase functions deploy trip-eta
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

interface LatLng {
  lat: number;
  lng: number;
}

interface EtaRequest {
  trip_id?: string;
  origin?: LatLng;
}

interface EtaResponse {
  eta_seconds: number | null;
  distance_meters: number | null;
  /** Which point the ETA is to: 'pickup' before the patient is collected. */
  target: string | null;
}

const ROUTES_URL =
  "https://api.openrouteservice.org/v2/directions/driving-car";

function json<T = unknown>(
  body: T,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function isFiniteLatLng(p: unknown): p is LatLng {
  return (
    typeof p === "object" &&
    p !== null &&
    Number.isFinite((p as LatLng).lat) &&
    Number.isFinite((p as LatLng).lng)
  );
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405, cors);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "missing authorization" }, 401, cors);
  }

  const apiKey = Deno.env.get("OPENROUTESERVICE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!apiKey || !supabaseUrl || !anonKey) {
    return json({ error: "server not configured" }, 500, cors);
  }

  let payload: EtaRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400, cors);
  }

  const { trip_id, origin } = payload;
  if (!trip_id || typeof trip_id !== "string") {
    return json({ error: "trip_id required" }, 400, cors);
  }
  if (!isFiniteLatLng(origin)) {
    return json({ error: "origin { lat, lng } required" }, 400, cors);
  }

  // Call the RPC as the authenticated caller so RLS/participant checks apply —
  // the destination is only revealed to a customer/companion on this trip.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("get_trip_eta_target", {
    p_trip: trip_id,
  });
  if (error) {
    // 'not authorized' / 'trip not found' bubble up as RPC errors.
    return json({ error: error.message }, 403, cors);
  }

  const dest = Array.isArray(data) ? data[0] : data;
  if (!dest || dest.dest_lat == null || dest.dest_lng == null) {
    // Nothing to route to: no pin on the booking, or a post-pickup trip whose
    // hospital was never recorded. Not an error — the client hides the ETA.
    return json<EtaResponse>(
      { eta_seconds: null, distance_meters: null, target: dest?.target ?? null },
      200,
      cors,
    );
  }

  let routeRes: Response;
  try {
    routeRes = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        // OpenRouteService takes the API key directly in Authorization.
        "Authorization": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      // ORS expects [longitude, latitude] pairs, origin then destination.
      body: JSON.stringify({
        coordinates: [
          [origin.lng, origin.lat],
          [dest.dest_lng, dest.dest_lat],
        ],
      }),
    });
  } catch (_e) {
    return json({ error: "routes request failed" }, 502, cors);
  }

  if (!routeRes.ok) {
    return json({ error: `routes api ${routeRes.status}` }, 502, cors);
  }

  const routeBody = await routeRes.json();
  // ORS returns routes[].summary = { distance (m), duration (s, float) }.
  const summary = routeBody?.routes?.[0]?.summary;
  const durationRaw: number | undefined = summary?.duration;
  const distanceRaw: number | undefined = summary?.distance;
  const etaSeconds =
    typeof durationRaw === "number" && Number.isFinite(durationRaw)
      ? Math.round(durationRaw)
      : null;
  const distanceMeters =
    typeof distanceRaw === "number" && Number.isFinite(distanceRaw)
      ? Math.round(distanceRaw)
      : null;

  return json<EtaResponse>(
    {
      eta_seconds: etaSeconds,
      distance_meters: distanceMeters,
      target: dest.target ?? null,
    },
    200,
    cors,
  );
});
