// trip-eta — server-side ETA for a live trip.
//
// The customer client sends { trip_id, origin: { lat, lng } } where origin is
// the companion's latest position (from the last Realtime Broadcast ping). This
// function looks up the trip's DESTINATION on the server (RLS-gated to trip
// participants), calls the Google Routes API with the key kept server-side, and
// returns a traffic-aware ETA. Refresh from the client every ~45s, not per ping.
//
// Secrets (set with `supabase secrets set`):
//   GOOGLE_MAPS_API_KEY   a key with the Routes API enabled
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
}

const ROUTES_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

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

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
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

  const { data, error } = await supabase.rpc("get_trip_destination", {
    p_trip: trip_id,
  });
  if (error) {
    // 'not authorized' / 'trip not found' bubble up as RPC errors.
    return json({ error: error.message }, 403, cors);
  }

  const dest = Array.isArray(data) ? data[0] : data;
  if (!dest || dest.dest_lat == null || dest.dest_lng == null) {
    // No known destination — ETA simply isn't available yet.
    return json<EtaResponse>(
      { eta_seconds: null, distance_meters: null },
      200,
      cors,
    );
  }

  let routeRes: Response;
  try {
    routeRes = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
        },
        destination: {
          location: {
            latLng: { latitude: dest.dest_lat, longitude: dest.dest_lng },
          },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
  } catch (_e) {
    return json({ error: "routes request failed" }, 502, cors);
  }

  if (!routeRes.ok) {
    return json({ error: `routes api ${routeRes.status}` }, 502, cors);
  }

  const routeBody = await routeRes.json();
  const route = routeBody?.routes?.[0];
  // duration comes back as a string like "1234s".
  const durationRaw: string | undefined = route?.duration;
  const etaSeconds = durationRaw ? parseInt(durationRaw, 10) : null;
  const distanceMeters =
    typeof route?.distanceMeters === "number" ? route.distanceMeters : null;

  return json<EtaResponse>(
    {
      eta_seconds: Number.isFinite(etaSeconds) ? etaSeconds : null,
      distance_meters: distanceMeters,
    },
    200,
    cors,
  );
});
