import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/auth';
import { useBookings } from '../../lib/useBookings';
import { BUCKETS, bucketOf, relTime, sortForBoard, urgency, type Bucket } from '../../lib/dispatch';
import { TAB_BAR_SPACE, color, radius, space, type } from '../../lib/theme';
import { BookingCard } from '../../components/BookingCard';
import { Avatar, Btn, Card, Chip, SectionTitle, StatTile, type Tone } from '../../components/ui';

// The desk. Overview tiles double as the filter, so every number on screen is
// something you can open; below them, one column of cards in the order the
// rules in lib/dispatch.ts say to work them.

const TILE_TONE: Record<Bucket, Tone> = {
  action: 'critical',
  upcoming: 'info',
  active: 'good',
  done: 'neutral',
};

export default function Board() {
  const { session, pushState, enablePush } = useAuth();
  const { bookings, syncedAt, error, refreshing, refresh } = useBookings(true);
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

  const email = session?.user?.email ?? '';
  const name = email.split('@')[0] || 'Ops';
  const bucketLabel = BUCKETS.find((b) => b.key === bucket)?.label ?? '';

  return (
    <View style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.muted} />
        }
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + space.md }}>
            <View style={styles.identity}>
              <Avatar text={name.slice(0, 2).toUpperCase()} />
              <View style={{ flex: 1 }}>
                <Text style={[type.caption, { color: color.muted }]}>Signed in</Text>
                <Text style={[type.h2, { color: color.ink }]} numberOfLines={1}>{name}</Text>
              </View>
              {/* Alerts are the reason this is an app and not a browser tab, so
                  their health is stated on the first screen, every time. */}
              <Chip
                label={pushState === 'on' ? 'Alerts on' : pushState === 'off' ? 'Alerts off' : 'Alerts n/a'}
                tone={pushState === 'on' ? 'good' : pushState === 'off' ? 'critical' : 'neutral'}
                dot={pushState === 'on' || pushState === 'off'}
              />
            </View>

            <View style={styles.overviewHead}>
              <Text style={[type.display, { color: color.ink }]}>Overview</Text>
              <Text style={[type.caption, { color: color.faint }]}>
                {syncedAt ? `updated ${relTime(new Date(syncedAt).toISOString(), now)}` : 'loading…'}
              </Text>
            </View>

            <Text style={[type.body, { color: color.muted, marginBottom: space.lg }]}>
              {bookings === null
                ? 'Opening the desk…'
                : criticalCount > 0
                  ? `${criticalCount} ${criticalCount === 1 ? 'booking needs' : 'bookings need'} you now.`
                  : 'Nothing urgent. The desk is clear.'}
            </Text>

            <View style={styles.tiles}>
              {/* Two columns. The cell owns the width so StatTile stays a
                  plain flex child and never has to know the grid. */}
              {BUCKETS.map((b) => (
                <View key={b.key} style={styles.tileCell}>
                  <StatTile
                    value={bookings === null ? '—' : counts[b.key]}
                    label={b.label}
                    tone={TILE_TONE[b.key]}
                    active={bucket === b.key}
                    onPress={() => setBucket(b.key)}
                  />
                </View>
              ))}
            </View>

            {pushState === 'off' ? (
              <Card style={styles.notice}>
                <Text style={[type.h2, { color: color.ink }]}>Dispatch alerts are off</Text>
                <Text style={[type.body, { color: color.muted, marginTop: 4 }]}>
                  This phone will not ring when a new request comes in. The board still
                  refreshes every 30 seconds while the app is open.
                </Text>
                <Btn label="Turn on alerts" size="sm" onPress={enablePush} style={{ marginTop: space.md, alignSelf: 'flex-start' }} />
              </Card>
            ) : null}

            {error ? (
              <Card style={[styles.notice, { backgroundColor: color.criticalTint }]}>
                <Text style={[type.body, { color: color.critical }]}>{error}</Text>
                <Btn label="Try again" tone="ghost" size="sm" onPress={refresh} style={{ marginTop: space.md, alignSelf: 'flex-start' }} />
              </Card>
            ) : null}

            <SectionTitle title={bucketLabel} count={bookings === null ? undefined : counts[bucket]} />
          </View>
        }
        ListEmptyComponent={
          bookings === null ? (
            <ActivityIndicator color={color.ink} style={{ marginTop: space.xl }} />
          ) : (
            <Card style={styles.empty}>
              <Text style={[type.h2, { color: color.ink }]}>Nothing here</Text>
              <Text style={[type.body, { color: color.muted, textAlign: 'center', marginTop: 4 }]}>
                {bucket === 'action'
                  ? 'Every request has a companion on it.'
                  : 'No bookings in this view.'}
              </Text>
            </Card>
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
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  overviewHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.xl,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xl },
  tileCell: { flexDirection: 'row', flexBasis: '47%', flexGrow: 1 },
  notice: { padding: space.lg, borderRadius: radius.lg, marginBottom: space.lg },
  empty: { padding: space.xxl, alignItems: 'center', borderRadius: radius.lg },
});
