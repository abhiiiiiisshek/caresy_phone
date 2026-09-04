import { useEffect, useRef, useState } from 'react';
import { AppState, Image, Linking, Share, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { MapView, Marker } from '../lib/maps';
import { supabase } from '../lib/supabase';
import { trackingHeadline, trackingSteps } from '@caresy/utils/bookingStatus';
import { etaSentence } from '@caresy/utils/eta';
import { Button, Card, EmptyState, LoadingState, Overline, Screen, Stagger, Txt } from '../components/ui';
import { color, radius, shadow, space } from '../lib/theme';

const SUPPORT_WA = '919717500225';
const WEB_BASE = 'https://caresy.co.in';

interface LocationPing { last_lat?: number | null; last_lng?: number | null; at?: string }

interface TrackedBooking {
  reference_code: string;
  status: string;
  scheduled_start_time: string | null;
  created_at: string;
  pickup_title: string | null;
  companion: { name?: string; photo?: string; rating?: number; verification?: string; specialty?: string } | null;
  trip_id: string | null;
  trip_status: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_location_at: string | null;
}

// Poll cadence. Broadcast is the live path; the poll is the floor under it and
// the only path a guest link-holder has, since the channel policies are TO
// authenticated. Slow it right down once pings are actually arriving — every
// tick is an RPC, per viewer, for the length of a hospital visit.
const POLL_MS = 10_000;
const POLL_MS_LIVE = 30_000;

export default function Tracking() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const reduceMotion = false; // RN 0.86: reanimated removed, fallback to full motion (respect via AccessibilityInfo if needed)
  const [booking, setBooking] = useState<TrackedBooking | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [tripId, setTripId] = useState<string | null>(null);
  // Broadcast is delivering. Only used to back the poll off — the map still
  // renders from `booking`, so a channel that drops just gets slower, not blank.
  const [live, setLive] = useState(false);
  const pollMs = live ? POLL_MS_LIVE : POLL_MS;

  // Share token is the credential for the poll. Live pings ride a private
  // Broadcast channel keyed on the TRIP id, which the token alone cannot name —
  // hence the two-stage effect below: poll first, subscribe once the RPC has
  // handed back a trip_id.
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let alive = true;
    const tick = () => {
      supabase.rpc('get_shared_tracking', { p_token: token }).then(({ data }) => {
        if (!alive) return;
        const row = (data?.[0] as TrackedBooking) ?? null;
        setBooking(row);
        setTripId(row?.trip_id ?? null);
        setLoading(false);
      });
    };
    tick();
    // Pause the poll while backgrounded. Android keeps the JS thread running, so
    // an unguarded poll would keep hitting the network for the whole visit —
    // hours, on a phone the customer is not even looking at. Resume with an
    // immediate tick so the screen is current the moment it comes back.
    let poll: ReturnType<typeof setInterval> | null = setInterval(tick, pollMs);
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        if (!poll) { tick(); poll = setInterval(tick, pollMs); }
      } else if (poll) {
        clearInterval(poll);
        poll = null;
      }
    });
    return () => {
      alive = false;
      if (poll) clearInterval(poll);
      appState.remove();
    };
  }, [token, pollMs]);

  // Live location, on the private channel migration 16 authorises.
  //
  // The topic must be `trip:<trip_id>`: the RLS on realtime.messages resolves
  // it by casting that segment to a trips.id, so the share token — a different
  // uuid entirely — matched no trip and every subscribe was denied in silence.
  // Only a signed-in participant gets in; a guest opening the WhatsApp link
  // stays on the poll, which is the intended shape.
  useEffect(() => {
    if (!tripId) return;
    let alive = true;
    const channel = supabase.channel(`trip:${tripId}`, { config: { private: true } })
      .on('broadcast', { event: 'location' }, (payload: { payload?: LocationPing }) => {
        if (!alive) return;
        const lat = payload?.payload?.last_lat;
        const lng = payload?.payload?.last_lng;
        if (lat == null || lng == null) return;
        const at = payload?.payload?.at || new Date().toISOString();
        setLive(true);
        setBooking((prev) => prev ? { ...prev, last_lat: lat, last_lng: lng, last_location_at: at } : prev);
      })
      .subscribe((status) => {
        // Anything but SUBSCRIBED — a denied join, a dropped socket — leaves the
        // poll at its normal cadence rather than stranding the screen.
        if (!alive) return;
        if (status !== 'SUBSCRIBED') setLive(false);
      });
    return () => {
      alive = false;
      setLive(false);
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [tripId]);

  const header = <Stack.Screen options={{ headerShown: true, title: 'Live tracking' }} />;

  if (loading) return <Screen>{header}<LoadingState label="Getting live status…" /></Screen>;

  if (!booking) {
    return (
      <Screen>
        {header}
        <EmptyState
          title="Nothing to track"
          body="This tracking link is invalid or the visit has finished."
          action={<Button title="Go to My Bookings" onPress={() => router.replace('/my-bookings')} style={s.emptyBtn} />}
        />
      </Screen>
    );
  }

  const companion = booking.companion;
  const companionName = companion?.name || 'Your companion';
  const hasLocation = booking.last_lat != null && booking.last_lng != null;
  // Fallback only. Coordinates meant "the trip has started" back when the trip
  // row was invisible here; trip_status says it outright, and says which part.
  const tripStarted = hasLocation;
  const trackOpts = {
    scheduled_start_time: booking.scheduled_start_time,
    hasLocation,
    tripStarted,
    tripStatus: booking.trip_status,
  };
  const { steps, activeIdx } = trackingSteps(booking.status, companionName, trackOpts);
  const headline = trackingHeadline(booking.status, trackOpts);

  const share = () => {
    const url = `${WEB_BASE}/tracking?t=${token}`;
    Share.share({ message: `Track our Caresy companion visit: ${url}`, url });
  };
  const openMaps = () => {
    if (!hasLocation) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${booking.last_lat},${booking.last_lng}`);
  };
  const messageCompanion = () =>
    Linking.openURL(`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(`Hi, connect me with ${companionName} for booking ${booking.reference_code}`)}`);

  return (
    <Screen>
      {header}
      <View style={s.body}>
        <Stagger index={0}>
          <Overline>Booking {booking.reference_code}</Overline>
          <Txt variant="h1" color={color.greenDeep}>{headline}</Txt>
          {booking.pickup_title ? <Txt variant="body" color={color.muted}>{booking.pickup_title}</Txt> : null}
        </Stagger>

        {/* Companion */}
        {companion ? (
          <Stagger index={1}>
            <Card level="raised" style={s.companion}>
              {companion.photo ? (
                <Image source={{ uri: companion.photo }} style={s.avatar} accessibilityLabel={companionName} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}><Txt variant="h2" color={color.onGreen}>{companionName.charAt(0)}</Txt></View>
              )}
              <View style={s.flex1}>
                <Txt variant="title" color={color.ink}>{companionName}</Txt>
                <Txt variant="caption" color={color.muted}>
                  {companion.rating ? `★ ${companion.rating}  ·  ` : ''}{companion.verification || companion.specialty || 'Verified'}
                </Txt>
              </View>
              <Button title="Message" variant="secondary" onPress={messageCompanion} style={s.msgBtn} />
            </Card>
          </Stagger>
        ) : null}

        {/* Location */}
        <Stagger index={2}>
          <Card level="raised" style={s.locCard}>
            {hasLocation ? (
              <>
                <View style={s.liveRow}>
                  <View style={s.liveDot} />
                  <Txt variant="label" color={color.green}>{live ? 'Live location' : 'Location shared'}</Txt>
                </View>
                {/* Absent whenever the estimate isn't trustworthy — no key, no
                    route, no pickup pin. Never a stale one left on screen. */}
                {eta ? <Txt variant="title" color={color.greenDeep}>{eta}</Txt> : null}
                {MapView && Marker ? (
                  <View style={s.mapWrap}>
                    <MapView
                      style={s.map}
                      initialRegion={{ latitude: booking.last_lat!, longitude: booking.last_lng!, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                      region={{ latitude: booking.last_lat!, longitude: booking.last_lng!, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                    >
                      <Marker coordinate={{ latitude: booking.last_lat!, longitude: booking.last_lng! }} title={companionName} />
                    </MapView>
                  </View>
                ) : null}
                <Txt variant="caption" color={color.faint}>
                  {booking.last_location_at ? `Updated ${new Date(booking.last_location_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Just now'}
                </Txt>
                <Button title="Open in Maps" onPress={openMaps} style={s.mapBtn} />
              </>
            ) : (
              <>
                <Txt variant="label" color={color.muted}>Location will be shared soon</Txt>
                <Txt variant="caption" color={color.faint}>Your companion will share live location when they start the trip. Check back closer to your scheduled time.</Txt>
              </>
            )}
          </Card>
        </Stagger>

        <View style={s.timeline}>
          {steps.map((step, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <Stagger key={step.title} index={i + 3} style={s.step}>
                <View style={s.rail}>
                  <View style={[s.node, (done || active) ? s.nodeOn : s.nodeOff, active && s.nodeActive]} />
                  {i < steps.length - 1 ? <View style={[s.line, done ? s.lineOn : s.lineOff]} /> : null}
                </View>
                <View style={s.stepText}>
                  <Txt variant="title" color={active ? color.greenDeep : done ? color.ink : color.faint}>{step.title}</Txt>
                  <Txt variant="caption" color={color.muted}>{step.desc}</Txt>
                </View>
              </Stagger>
            );
          })}
        </View>

        <Stagger index={steps.length + 3}>
          <Button title="Share live status" variant="secondary" onPress={share} style={s.shareBtn} />
        </Stagger>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  body: { flex: 1, padding: space.xl, gap: space.lg },
  emptyBtn: { marginTop: space.md, paddingHorizontal: space.xl },
  headlineBlock: { gap: space.xs },

  companion: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 52, height: 52, borderRadius: radius.pill },
  avatarFallback: { backgroundColor: color.green, alignItems: 'center', justifyContent: 'center' },
  msgBtn: { minHeight: 40, paddingHorizontal: space.lg },

  locCard: { gap: space.xs },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  liveDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: color.success },
  mapWrap: { height: 180, borderRadius: radius.md, overflow: 'hidden', marginTop: space.sm },
  map: { flex: 1 },
  mapBtn: { marginTop: space.md },

  timeline: { gap: 0, marginTop: space.sm },
  step: { flexDirection: 'row', gap: space.md },
  rail: { alignItems: 'center', width: 24 },
  node: { width: 16, height: 16, borderRadius: radius.pill, borderWidth: 3 },
  nodeOn: { backgroundColor: color.green, borderColor: color.green },
  nodeOff: { backgroundColor: color.surface, borderColor: color.line },
  nodeActive: { borderColor: color.greenSoft, backgroundColor: color.green },
  line: { width: 3, flex: 1, minHeight: 32, marginVertical: 2 },
  lineOn: { backgroundColor: color.green },
  lineOff: { backgroundColor: color.line },
  stepText: { flex: 1, paddingBottom: space.lg, gap: 2 },

  shareBtn: { marginTop: 'auto' },
});
