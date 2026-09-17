import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../lib/auth';
import { useBookings } from '../lib/useBookings';
import { BUCKETS, bucketOf, sortForBoard, urgency, type Bucket } from '../lib/dispatch';
import { color, space, type } from '../lib/theme';
import { BookingCard } from '../components/BookingCard';
import { SignIn } from '../components/SignIn';
import { Btn, Segmented, Touchable } from '../components/ui';

export default function Board() {
  const { session, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={color.green} />
      </View>
    );
  }
  if (!session) return <SignIn />;
  if (!isAdmin) return <SignIn notAdmin />;
  return <Dispatch />;
}

function Dispatch() {
  const { signOut } = useAuth();
  const { bookings, error, refreshing, refresh } = useBookings(true);
  const [bucket, setBucket] = useState<Bucket>('action');

  // The clock is half the information on this screen — a card that says
  // "expires in 4m" has to keep counting down without a fetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const insets = useSafeAreaInsets();

  const { visible, counts, criticalCount } = useMemo(() => {
    const list = bookings ?? [];
    const counts = { action: 0, upcoming: 0, active: 0, done: 0 } as Record<Bucket, number>;
    for (const b of list) counts[bucketOf(b, now)]++;
    return {
      visible: sortForBoard(list.filter((b) => bucketOf(b, now) === bucket), now),
      counts,
      criticalCount: list.filter((b) => urgency(b, now) === 'critical').length,
    };
  }, [bookings, bucket, now]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.xxl }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.muted} />}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + space.md }}>
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <Text style={[type.large, { color: color.ink }]}>Dispatch</Text>
                {criticalCount > 0 ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={[type.caption, { color: color.terracotta, fontWeight: '700' }]}>{criticalCount}</Text>
                  </View>
                ) : null}
              </View>
              <Touchable onPress={() => signOut()} accessibilityRole="button" accessibilityLabel="Sign out">
                <Text style={[type.label, { color: color.muted }]}>Sign out</Text>
              </Touchable>
            </View>

            <Text style={[type.body, { color: color.muted, marginBottom: space.lg }]}>
              {bookings === null
                ? 'Loading the desk…'
                : criticalCount > 0
                  ? `${criticalCount} ${criticalCount === 1 ? 'booking needs' : 'bookings need'} you now.`
                  : 'Nothing urgent. The desk is clear.'}
            </Text>

            <Segmented
              options={BUCKETS.map((b) => ({
                key: b.key,
                label: b.label,
                badge: b.key === 'action' ? counts.action : undefined,
              }))}
              value={bucket}
              onChange={setBucket}
            />
            <View style={{ height: space.lg }} />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={[type.body, { color: color.terracotta }]}>{error}</Text>
                <Btn label="Try again" tone="ghost" onPress={refresh} style={{ marginTop: space.md }} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          bookings === null
            ? <ActivityIndicator color={color.green} style={{ marginTop: space.xxl }} />
            : (
              <View style={styles.empty}>
                <Text style={[type.h2, { color: color.muted }]}>Nothing here</Text>
                <Text style={[type.body, { color: color.faint, textAlign: 'center', marginTop: space.sm }]}>
                  {bucket === 'action'
                    ? 'Every request has a companion on it.'
                    : 'No bookings in this view.'}
                </Text>
              </View>
            )
        }
        renderItem={({ item }) => <BookingCard booking={item} now={now} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: color.terracottaDim,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.terracotta },
  errorBox: { backgroundColor: color.terracottaDim, borderRadius: 14, padding: space.lg, marginBottom: space.lg },
  empty: { alignItems: 'center', paddingTop: space.xxl * 2, paddingHorizontal: space.xl },
});
