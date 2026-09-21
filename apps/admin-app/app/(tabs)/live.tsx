import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { relTime } from '../../lib/dispatch';
import { TAB_BAR_SPACE, color, space, type } from '../../lib/theme';
import { Btn, Card, Chip, Empty, Row, ScreenHeader } from '../../components/ui';

// Companions in the field. Trips are not on a realtime publication, so this
// polls every 10 seconds — an ops board is fine with near-real-time, and the
// broadcast wiring is companion→customer only.
//
// No embedded map: that needs a map SDK or a WebView, and neither is worth a
// native dependency for a screen whose real question is "is this trip moving,
// and who do I call if it isn't". The coordinates hand off to the phone's own
// maps app, which is better at maps than anything shipped here would be.
// ponytail: list + hand-off. Add a real map when more than a handful of trips
// run at once and their relative positions start to matter.

const POLL_MS = 10_000;

const ACTIVE_STATUSES = ['assigned', 'en_route_pickup', 'picked_up', 'en_route_hospital', 'arrived'];

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Assigned',
  en_route_pickup: 'En route to pickup',
  picked_up: 'Picked up',
  en_route_hospital: 'En route to hospital',
  arrived: 'Arrived',
};

const TRIP_SELECT = `
  id,
  status,
  last_lat,
  last_lng,
  last_location_at,
  eta_seconds,
  updated_at,
  booking:bookings!inner (
    id,
    reference_code,
    service_metadata,
    patient:patients ( full_name ),
    pickup_location:locations!pickup_location_id ( title )
  )
`;

interface TripRow {
  id: string;
  status: string;
  last_lat: number | null;
  last_lng: number | null;
  last_location_at: string | null;
  eta_seconds: number | null;
  updated_at: string;
  booking?: {
    id: string;
    reference_code: string | null;
    service_metadata: { companion?: { name?: string; phone?: string } | null } | null;
    patient?: { full_name?: string } | null;
    pickup_location?: { title?: string } | null;
  } | null;
}

function fmtEta(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '';
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** A location ping older than this is stale enough to be worth a phone call. */
const STALE_MS = 5 * 60_000;

async function fetchTrips(): Promise<{ rows: TripRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_SELECT)
    .in('status', ACTIVE_STATUSES)
    .order('updated_at', { ascending: false });
  return { rows: (data as unknown as TripRow[]) ?? [], error: error?.message ?? null };
}

export default function Live() {
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<TripRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const apply = useCallback((r: { rows: TripRow[]; error: string | null }) => {
    setError(r.error);
    setTrips(r.rows);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const r = await fetchTrips();
      if (alive) apply(r);
    };
    (async () => { await tick(); })();
    const timer = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [apply]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    apply(await fetchTrips());
    setRefreshing(false);
  }, [apply]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={trips ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.muted} />}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + space.md }}>
            <ScreenHeader
              title="Live"
              subtitle={trips === null
                ? 'Loading trips…'
                : `${trips.length} ${trips.length === 1 ? 'companion' : 'companions'} out. Refreshes every 10 seconds.`}
            />
            {error ? (
              <Card style={[styles.notice, { backgroundColor: color.criticalTint }]}>
                <Text style={[type.body, { color: color.critical }]}>{error}</Text>
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          trips === null
            ? <ActivityIndicator color={color.ink} style={{ marginTop: space.xl }} />
            : <Empty title="No live trips" hint="Companion visits appear here once they start moving." />
        }
        renderItem={({ item }) => <TripCard trip={item} now={now} />}
      />
    </View>
  );
}

function TripCard({ trip: t, now }: { trip: TripRow; now: number }) {
  const companion = t.booking?.service_metadata?.companion ?? null;
  const hasPos = t.last_lat != null && t.last_lng != null;
  const pingAge = t.last_location_at ? now - new Date(t.last_location_at).getTime() : null;
  const stale = pingAge === null || pingAge > STALE_MS;
  const eta = fmtEta(t.eta_seconds);

  const openMaps = () => {
    if (!hasPos) return;
    const q = `${t.last_lat},${t.last_lng}`;
    // Apple Maps on iOS, the geo: intent elsewhere. Both hand off to whatever
    // the operator actually has installed.
    Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `geo:${q}?q=${q}`);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={[type.h2, { color: color.ink, flex: 1 }]} numberOfLines={1}>
          {companion?.name ?? 'Unassigned companion'}
        </Text>
        <Chip label={STATUS_LABEL[t.status] ?? t.status} tone="info" />
      </View>

      <Text style={[type.body, { color: color.muted, marginTop: 2 }]} numberOfLines={1}>
        {[t.booking?.patient?.full_name, t.booking?.reference_code].filter(Boolean).join('  ·  ')}
      </Text>

      <View style={styles.rows}>
        <Row label="Destination" value={t.booking?.pickup_location?.title ?? ''} />
        <Row label="ETA" value={eta} />
        <Row
          label="Last ping"
          value={t.last_location_at ? relTime(t.last_location_at, now) : 'never'}
          valueStyle={stale ? { color: color.critical } : undefined}
        />
      </View>

      {stale ? (
        <Chip
          label={t.last_location_at ? 'Location going stale' : 'Awaiting first location'}
          tone="warn"
          dot
          style={{ marginTop: space.sm }}
        />
      ) : null}

      <View style={styles.actions}>
        <Btn label="Open in Maps" size="sm" disabled={!hasPos} onPress={openMaps} style={styles.grow} />
        <Btn
          label="Call companion"
          tone="ghost"
          size="sm"
          disabled={!companion?.phone}
          onPress={() => companion?.phone && Linking.openURL(`tel:${companion.phone.replace(/[^\d+]/g, '')}`)}
          style={styles.grow}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  card: { padding: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rows: { marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  grow: { flex: 1 },
  notice: { padding: space.lg, marginBottom: space.lg },
});
