import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isPastBooking, prettyService } from '@caresy/utils/bookingStatus';
import { formatINR, runningTotalPaise } from '@caresy/utils/pricing';
import { Button, Card, Chip, ChipRow, EmptyState, ErrorState, LoadingState, Screen, Txt } from '../components/ui';
import { StatusPill } from '../components/StatusPill';
import { color, radius, space } from '../lib/theme';

interface BookingRecord {
  id: string;
  reference_code: string;
  share_token: string;
  status: string;
  created_at: string;
  scheduled_start_time: string | null;
  service_type: string;
  service_metadata: any;
  actual_start_time: string | null;
  final_amount_paise: number | null;
  payment_status: string;
  patient?: { full_name: string | null } | { full_name: string | null }[] | null;
}

const SELECT = `
  id, reference_code, share_token, status, created_at, scheduled_start_time,
  service_type, service_metadata, actual_start_time, final_amount_paise, payment_status,
  patient:patients ( full_name )
`;

// Statuses where a live-tracking view is meaningful.
function isTrackable(status: string) {
  const s = status.toLowerCase();
  return s.includes('assigned') || s.includes('accepted') || s.includes('progress') || s === 'active';
}

function serviceLabel(b: BookingRecord) {
  return (b.service_metadata?.originalService as string) || prettyService(b.service_type || 'Booking');
}
function patientName(b: BookingRecord): string | null {
  const p = Array.isArray(b.patient) ? b.patient[0] : b.patient;
  return p?.full_name ?? null;
}
function whenLabel(iso: string | null) {
  if (!iso) return 'Time to be confirmed';
  return new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function MyBookings() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const fetch = useCallback(async (mode: 'full' | 'quiet' | 'pull' = 'full') => {
    if (mode === 'full') setLoading(true);
    if (mode === 'pull') setRefreshing(true);
    setError(null);
    try {
      const { data, error: e } = await supabase.from('bookings').select(SELECT).order('created_at', { ascending: false });
      if (e) throw e;
      setBookings((data as unknown as BookingRecord[]) || []);
    } catch (err: any) {
      setError(err.message || 'Could not load your bookings.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (session) fetch();
    else setLoading(false);
  }, [session, authLoading, fetch]);

  const hasLiveVisit = bookings.some((b) => b.status.toLowerCase().includes('progress'));
  useEffect(() => {
    if (!hasLiveVisit) return;
    const id = setInterval(() => fetch('quiet'), 60_000);
    return () => clearInterval(id);
  }, [hasLiveVisit, fetch]);

  const cancel = (b: BookingRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Cancel booking?', `${serviceLabel(b)} · ${b.reference_code}`, [
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel it', style: 'destructive',
        onPress: async () => {
          const { error: e } = await supabase.rpc('cancel_booking', { p_booking: b.id, p_reason: null });
          if (e) { Alert.alert('Could not cancel', e.message); return; }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          fetch();
        },
      },
    ]);
  };

  const reschedule = (b: BookingRecord) => {
    Haptics.selectionAsync();
    router.push({ pathname: '/reschedule', params: { id: b.id, ref: b.reference_code } });
  };

  if (authLoading || loading) return <Screen><Stack.Screen options={{ headerShown: true, title: 'My Bookings' }} /><LoadingState label="Loading your bookings…" /></Screen>;
  if (!session) return <Redirect href="/" />;

  const shown = bookings.filter((b) => (filter === 'past' ? isPastBooking(b) : !isPastBooking(b)));

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'My Bookings' }} />
      <View style={s.tabs}>
        <Chip label="Upcoming" selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
        <Chip label="Past" selected={filter === 'past'} onPress={() => setFilter('past')} />
      </View>

      {error ? (
        <ErrorState message={error} onRetry={() => fetch()} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(b) => b.id}
          contentContainerStyle={shown.length ? s.list : s.listEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch('pull')} tintColor={color.green} />}
          ListEmptyComponent={
            <EmptyState
              title={filter === 'upcoming' ? 'No upcoming visits' : 'No past visits yet'}
              body={filter === 'upcoming' ? 'Book a companion and it will show up here.' : undefined}
              action={filter === 'upcoming' ? <Button title="Book care" onPress={() => router.push('/booking')} style={s.emptyBtn} /> : undefined}
            />
          }
          renderItem={({ item }) => <BookingCard b={item} onCancel={cancel} onReschedule={reschedule} onTrack={(bk) => router.push({ pathname: '/tracking', params: { token: bk.share_token } })} />}
        />
      )}
    </Screen>
  );
}

function BookingCard({ b, onCancel, onReschedule, onTrack }: { b: BookingRecord; onCancel: (b: BookingRecord) => void; onReschedule: (b: BookingRecord) => void; onTrack: (b: BookingRecord) => void }) {
  const name = patientName(b);
  const isLive = b.status.toLowerCase().includes('progress');
  const isBilled = b.final_amount_paise != null;
  const cancellable = !isPastBooking(b) && !isLive;
  const trackable = isTrackable(b.status);

  return (
    <Card style={s.card}>
      <View style={s.head}>
        <Txt variant="title" color={color.ink} style={s.flex1}>{serviceLabel(b)}</Txt>
        <StatusPill status={b.status} />
      </View>
      <Txt variant="body" color={color.ink}>{whenLabel(b.scheduled_start_time)}</Txt>
      {name ? <Txt variant="label" color={color.muted}>For {name}</Txt> : null}
      <Txt variant="caption" color={color.faint}>Ref {b.reference_code}</Txt>

      {isLive ? <LiveMeter b={b} /> : null}
      {isBilled ? (
        <Txt variant="title" color={color.greenDeep} style={s.amount}>
          {b.payment_status === 'COLLECTED' ? 'Paid ' : 'Amount due '}{formatINR(b.final_amount_paise as number)}
        </Txt>
      ) : null}

      <View style={s.actions}>
        {trackable ? <Button title="Track visit" onPress={() => onTrack(b)} style={s.actionBtn} /> : null}
        {cancellable ? <Button title="Reschedule" variant="secondary" onPress={() => onReschedule(b)} style={s.actionBtn} /> : null}
        {cancellable ? <Button title="Cancel" variant="danger" onPress={() => onCancel(b)} style={s.actionBtn} /> : null}
      </View>
    </Card>
  );
}

function LiveMeter({ b }: { b: BookingRecord }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const running = runningTotalPaise(b.actual_start_time, new Date(now).toISOString(), b.service_metadata?.eveningSurchargePaise ?? 0);
  if (!running) return null;
  const hrs = Math.floor(running.minutes / 60);
  const elapsed = hrs > 0 ? `${hrs}h ${running.minutes % 60}m` : `${running.minutes} min`;
  return (
    <View style={s.meter}>
      <Txt variant="overline" color={color.greenDeep}>Visit in progress · {elapsed}</Txt>
      <Txt variant="h1" color={color.greenDeep}>{formatINR(running.paise)}</Txt>
      <Txt variant="caption" color={color.muted}>Running total, updates every 30s. You pay the final amount when the visit ends.</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  tabs: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.sm },
  list: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  listEmpty: { flexGrow: 1 },
  emptyBtn: { marginTop: space.md, paddingHorizontal: space.xxl },
  card: { gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },
  amount: { marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  actionBtn: { flex: 1 },
  meter: { marginTop: space.md, gap: space.xs, padding: space.lg, borderRadius: radius.md, backgroundColor: color.successSoft, borderWidth: 1, borderColor: color.success },
});
