import { useEffect, useState } from 'react';
import { Image, Linking, Share, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { supabase } from '../lib/supabase';
import { trackingHeadline, trackingSteps } from '@caresy/utils/bookingStatus';
import { Button, Card, EmptyState, LoadingState, Overline, Screen, Txt } from '../components/ui';
import { color, radius, shadow, space } from '../lib/theme';

const SUPPORT_WA = '919717500225';
const WEB_BASE = 'https://caresy.co.in';

interface TrackedBooking {
  reference_code: string;
  status: string;
  scheduled_start_time: string | null;
  created_at: string;
  pickup_title: string | null;
  companion: { name?: string; photo?: string; rating?: number; verification?: string; specialty?: string } | null;
  last_lat: number | null;
  last_lng: number | null;
  last_location_at: string | null;
}

export default function Tracking() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<TrackedBooking | null>(null);
  const [loading, setLoading] = useState(!!token);

  // The share token is the credential — no session needed (family opens the same
  // link). One poll covers status + last-known position; 10s matches web.
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let alive = true;
    const tick = () => {
      supabase.rpc('get_shared_tracking', { p_token: token }).then(({ data }) => {
        if (!alive) return;
        setBooking((data?.[0] as TrackedBooking) ?? null);
        setLoading(false);
      });
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, [token]);

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
  const { steps, activeIdx } = trackingSteps(booking.status, companionName);
  const hasLocation = booking.last_lat != null && booking.last_lng != null;

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
        <View style={s.headlineBlock}>
          <Overline>Booking {booking.reference_code}</Overline>
          <Txt variant="h1" color={color.greenDeep}>{trackingHeadline(booking.status)}</Txt>
          {booking.pickup_title ? <Txt variant="body" color={color.muted}>{booking.pickup_title}</Txt> : null}
        </View>

        {/* Companion */}
        {companion ? (
          <Card style={s.companion}>
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
        ) : null}

        {/* Location */}
        <Card style={s.locCard}>
          {hasLocation ? (
            <>
              <View style={s.liveRow}>
                <View style={s.liveDot} />
                <Txt variant="label" color={color.green}>Live location shared</Txt>
              </View>
              <Txt variant="caption" color={color.faint}>
                {booking.last_location_at ? `Updated ${new Date(booking.last_location_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Just now'}
              </Txt>
              <Button title="Open in Maps" onPress={openMaps} style={s.mapBtn} />
            </>
          ) : (
            <>
              <Txt variant="label" color={color.muted}>Location not shared yet</Txt>
              <Txt variant="caption" color={color.faint}>Your companion’s live location appears here once they start the trip.</Txt>
            </>
          )}
        </Card>

        {/* Timeline */}
        <View style={s.timeline}>
          {steps.map((step, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <View key={step.title} style={s.step}>
                <View style={s.rail}>
                  <View style={[s.node, (done || active) ? s.nodeOn : s.nodeOff, active && s.nodeActive]} />
                  {i < steps.length - 1 ? <View style={[s.line, done ? s.lineOn : s.lineOff]} /> : null}
                </View>
                <View style={s.stepText}>
                  <Txt variant="title" color={active ? color.greenDeep : done ? color.ink : color.faint}>{step.title}</Txt>
                  <Txt variant="caption" color={color.muted}>{step.desc}</Txt>
                </View>
              </View>
            );
          })}
        </View>

        <Button title="Share live status" variant="secondary" onPress={share} style={s.shareBtn} />
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
