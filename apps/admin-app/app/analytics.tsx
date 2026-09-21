import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';
import { pretty } from '../lib/dispatch';
import {
  STATUS_ORDER, adminStats,
  type AdminStats, type AnalyticsBooking, type AnalyticsCompanion,
} from '../lib/money';
import { color, radius, space, type } from '../lib/theme';
import { BackLink, Card, Empty, ScreenHeader, SectionTitle, StatBox } from '../components/ui';

// Demand and supply at a glance. Everything here comes from queries an admin
// already has RLS access to — no new RPC — and revenue prefers the real bill,
// saying how many rows are still projections rather than quietly mixing them.

// What rides between these areas actually cost. The companions log every fare
// (migration 27) and until something rendered it, the data sat in a view nobody
// could read without opening the SQL editor. This is what tells the desk
// whether "about ₹300 to Kailash" is true before quoting it.
interface FareRow {
  provider: string;
  drop_label: string;
  ride_hour: number;
  rides: number;
  avg_fare_paise: number;
  min_fare_paise: number;
  max_fare_paise: number;
}

interface Loaded {
  stats: AdminStats;
  fares: FareRow[];
  error: string | null;
}

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;

const MUTED_STATUSES = new Set<string>(['CANCELLED', 'EXPIRED']);

/**
 * One fetch, and every failure in it is reported.
 *
 * The first version only looked at the bookings error, so a companions or fare
 * query that RLS or a missing grant turned away rendered as a confident set of
 * zeros — a screen that looks like it works and is lying. An empty board and a
 * denied query have to look different.
 */
async function fetchAnalytics(): Promise<Loaded> {
  const [bookingsRes, companionsRes, faresRes] = await Promise.all([
    supabase.from('bookings')
      .select('status, estimated_duration_minutes, final_amount_paise, created_at')
      .is('deleted_at', null),
    supabase.from('companions').select('approval_status, is_online').is('deleted_at', null),
    supabase.from('transport_fare_reference').select('*').order('rides', { ascending: false }).limit(20),
  ]);

  const errors = [
    bookingsRes.error && `Bookings: ${bookingsRes.error.message}`,
    companionsRes.error && `Companions: ${companionsRes.error.message}`,
    faresRes.error && `Fares: ${faresRes.error.message}`,
  ].filter(Boolean) as string[];

  return {
    stats: adminStats(
      (bookingsRes.data ?? []) as AnalyticsBooking[],
      (companionsRes.data ?? []) as AnalyticsCompanion[],
    ),
    fares: (faresRes.data ?? []) as FareRow[],
    error: errors.length ? errors.join('\n') : null,
  };
}

export default function Analytics() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Loaded | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await fetchAnalytics();
      if (alive) setData(d);
    })();
    return () => { alive = false; };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setData(await fetchAnalytics());
    setRefreshing(false);
  }, []);

  const stats = data?.stats ?? null;
  const visibleStatuses = useMemo(
    () => (stats ? STATUS_ORDER.filter((s) => stats.byStatus[s]) : []),
    [stats],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingHorizontal: space.lg,
        paddingTop: insets.top + space.md,
        paddingBottom: insets.bottom + space.xxl,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.muted} />}
    >
      <BackLink label="More" onPress={() => router.back()} />

      <ScreenHeader title="Analytics" subtitle="Demand, supply, and what has actually been earned." />

      {data?.error ? (
        <Card style={[styles.notice, { backgroundColor: color.criticalTint }]}>
          <Text style={[type.label, { color: color.critical }]}>Some of this screen could not load</Text>
          <Text style={[type.body, { color: color.critical, marginTop: 4 }]}>{data.error}</Text>
          <Text style={[type.caption, { color: color.critical, marginTop: space.sm }]}>
            Pull down to try again. If it persists you are probably signed in with an account that is not on the ops allowlist.
          </Text>
        </Card>
      ) : null}

      {stats === null ? (
        <ActivityIndicator color={color.ink} style={{ marginTop: space.xl }} />
      ) : (
        <>
          <View style={styles.grid}>
            <View style={styles.cell}>
              <StatBox value={String(stats.todayBookings)} label="Requests today" />
            </View>
            <View style={styles.cell}>
              <StatBox value={String(stats.totalBookings)} label="Requests all time" />
            </View>
            <View style={styles.cell}>
              <StatBox
                value={`${stats.onlineCompanions}/${stats.approvedCompanions}`}
                label="Online / approved"
              />
            </View>
            <View style={styles.cell}>
              <StatBox
                value={`₹${stats.revenue.toLocaleString('en-IN')}`}
                label={stats.projectedCount > 0
                  ? `Revenue · ${stats.projectedCount} projected`
                  : 'Revenue · all billed'}
              />
            </View>
          </View>

          <View style={styles.sectionGap}><SectionTitle title="By status" count={stats.totalBookings} /></View>
          {visibleStatuses.length === 0 ? (
            <Empty title="No requests yet" hint="Every booking that comes in is counted here." />
          ) : (
            <Card style={styles.block}>
              {visibleStatuses.map((s) => {
                const n = stats.byStatus[s];
                const pct = stats.totalBookings ? Math.round((n / stats.totalBookings) * 100) : 0;
                return (
                  <View key={s} style={styles.barRow}>
                    <Text style={[type.label, { color: color.inkSoft, width: 92 }]} numberOfLines={1}>
                      {pretty(s)}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor: MUTED_STATUSES.has(s) ? color.lineStrong : color.ink,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[type.mono, { color: color.muted, width: 30, textAlign: 'right' }]}>{n}</Text>
                  </View>
                );
              })}
            </Card>
          )}

          <View style={styles.sectionGap}>
            <SectionTitle title="Fares actually paid" count={data?.fares.length || undefined} />
          </View>
          <Text style={[type.caption, { color: color.muted, marginBottom: space.md }]}>
            From the rides companions logged. Never billed to the customer — reference only.
          </Text>
          {data && data.fares.length > 0 ? (
            <Card style={styles.block}>
              {data.fares.map((f) => (
                <View key={`${f.provider}-${f.drop_label}-${f.ride_hour}`} style={styles.fareRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.label, { color: color.ink }]} numberOfLines={1}>{f.drop_label}</Text>
                    <Text style={[type.caption, { color: color.muted }]} numberOfLines={1}>
                      {f.provider} · {hourLabel(f.ride_hour)} · {rupees(f.min_fare_paise)}–{rupees(f.max_fare_paise)} over {f.rides} {f.rides === 1 ? 'ride' : 'rides'}
                    </Text>
                  </View>
                  <Text style={[type.h2, { color: color.ink }]}>{rupees(f.avg_fare_paise)}</Text>
                </View>
              ))}
            </Card>
          ) : (
            <Empty title="No fares logged yet" hint="Companions log the fare when a ride is part of the visit." />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  // One grid, two columns, one gap — the same cell the dispatch board uses, so
  // the two screens do not disagree about what a row of numbers looks like.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { flexDirection: 'row', flexBasis: '47%', flexGrow: 1 },
  sectionGap: { marginTop: space.xl },
  block: { padding: space.lg },
  notice: { padding: space.lg, marginBottom: space.lg },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 7 },
  barTrack: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: color.neutralTint, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.pill },
  fareRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 9 },
  // Fixed column so the averages right-align down the card whatever their width.
  fareAmount: { color: color.ink, minWidth: 74, textAlign: 'right' },
});
