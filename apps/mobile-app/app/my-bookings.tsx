import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isPastBooking, prettyService } from '@caresy/utils/bookingStatus';
import { formatINR, runningTotalPaise } from '@caresy/utils/pricing';
import { Button, Card, Chip, EmptyState, ErrorState, FieldButton, LoadingState, Screen, Stagger, Txt } from '../components/ui';
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

function isReschedulable(b: BookingRecord) {
  if (isPastBooking(b)) return false;
  const s = b.status.toUpperCase();
  return s === 'PENDING' || s === 'ACCEPTED' || s === 'ASSIGNED';
}

export default function MyBookings() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  // Native reschedule — single Date object, two pickers (date + time)
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingRecord | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const fetch = useCallback(async (mode: 'full' | 'quiet' | 'pull' = 'full') => {
    if (mode === 'full') setLoading(true);
    if (mode === 'pull') setRefreshing(true);
    setError(null);
    try {
      const { data, error: e } = await supabase.from('bookings').select(SELECT).order('created_at', { ascending: false }).limit(50);
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

  const openReschedule = (b: BookingRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRescheduleTarget(b);
    // Start from current scheduled time if available, otherwise now + 24h
    const base = b.scheduled_start_time ? new Date(b.scheduled_start_time) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Ensure base is in future +60m
    if (base.getTime() < Date.now() + 62 * 60 * 1000) base.setTime(Date.now() + 62 * 60 * 1000);
    setRescheduleAt(base);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const closeReschedule = () => {
    setRescheduleTarget(null);
    setRescheduleAt(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setRescheduling(false);
  };

  const onDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (!selected) return;
    setRescheduleAt((prev) => {
      const base = prev ?? new Date();
      const next = new Date(base);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      return next;
    });
    // On iOS keep date picker open until user taps elsewhere; on Android chain to time picker
    if (Platform.OS === 'android' && selected) {
      // auto-open time picker after date pick for smooth flow
      setTimeout(() => setShowTimePicker(true), 300);
    }
  };

  const onTimeChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (!selected) return;
    setRescheduleAt((prev) => {
      const base = prev ?? new Date();
      const next = new Date(base);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return next;
    });
  };

  const confirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleAt) return;
    const iso = rescheduleAt.toISOString();
    const leadCutoff = Date.now() + 60 * 60 * 1000;
    if (rescheduleAt.getTime() < leadCutoff) {
      Alert.alert('Too soon', 'Pick a time at least 60 minutes from now. The server will enforce this.');
      return;
    }
    if (rescheduleAt.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) {
      Alert.alert('Too far', 'Pick a time within the next 90 days.');
      return;
    }
    try {
      setRescheduling(true);
      const { error: e } = await supabase.rpc('reschedule_booking', { p_booking: rescheduleTarget.id, p_start: iso });
      if (e) throw e;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeReschedule();
      fetch();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not reschedule', err.message || 'Please try again.');
    } finally {
      setRescheduling(false);
    }
  };

  if (authLoading || loading) return <Screen><Stack.Screen options={{ headerShown: true, title: 'My Bookings' }} /><LoadingState label="Loading your bookings…" /></Screen>;
  if (!session) return <Redirect href="/" />;

  const shown = bookings.filter((b) => (filter === 'past' ? isPastBooking(b) : !isPastBooking(b)));

  const dateLabel = rescheduleAt ? rescheduleAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const timeLabel = rescheduleAt ? rescheduleAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'My Bookings' }} />
      <Stagger index={0} style={s.tabs}>
        <Chip label="Upcoming" selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
        <Chip label="Past" selected={filter === 'past'} onPress={() => setFilter('past')} />
      </Stagger>

      {rescheduleTarget && rescheduleAt ? (
        <Card style={s.rescheduleCard}>
          <Txt variant="title" color={color.ink}>Reschedule · {rescheduleTarget.reference_code}</Txt>
          <Txt variant="caption" color={color.muted}>Pick a new date and time. The server enforces 60-min lead and 90-day window.</Txt>

          <FieldButton
            label="Date"
            value={dateLabel}
            placeholder="Choose a date"
            onPress={() => { Haptics.selectionAsync(); setShowDatePicker(true); }}
          />
          <FieldButton
            label="Time"
            value={timeLabel}
            placeholder="Choose a time"
            onPress={() => { Haptics.selectionAsync(); setShowTimePicker(true); }}
          />

          {showDatePicker ? (
            <DateTimePicker
              value={rescheduleAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              maximumDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
              onChange={onDateChange}
            />
          ) : null}
          {showTimePicker ? (
            <DateTimePicker
              value={rescheduleAt}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          ) : null}

          {Platform.OS === 'ios' && (showDatePicker || showTimePicker) ? (
            <View style={s.iosPickerActions}>
              <Button title="Done" onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }} style={s.iosDone} />
            </View>
          ) : null}

          <View style={s.rescheduleActions}>
            <Button title="Cancel" variant="secondary" onPress={closeReschedule} disabled={rescheduling} style={s.rescheduleBtn} />
            <Button title="Confirm" onPress={confirmReschedule} loading={rescheduling} style={s.rescheduleBtn} />
          </View>
        </Card>
      ) : null}

      {error ? (
        <ErrorState message={error} onRetry={() => fetch()} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(b) => b.id}
          contentContainerStyle={shown.length ? s.list : s.listEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch('pull')} tintColor={color.green} />}
          ListEmptyComponent={
            <View>
              <EmptyState
                title={filter === 'upcoming' ? 'No upcoming visits' : 'No past visits yet'}
                body={filter === 'upcoming' ? 'Book a companion and it will show up here.' : undefined}
                action={filter === 'upcoming' ? <Button title="Book care" onPress={() => router.push('/booking')} style={s.emptyBtn} /> : undefined}
              />
            </View>
          }
          renderItem={({ item, index }) => (
            <Stagger index={index + 1}>
              <BookingCard b={item} onCancel={cancel} onReschedule={openReschedule} onTrack={(bk) => router.push({ pathname: '/tracking', params: { token: bk.share_token } })} />
            </Stagger>
          )}
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
  const reschedulable = isReschedulable(b);
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
        {reschedulable ? <Button title="Reschedule" variant="secondary" onPress={() => onReschedule(b)} style={s.actionBtn} /> : null}
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
  tabs: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.sm },
  list: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.md },
  listEmpty: { flexGrow: 1, paddingTop: space.xl },
  emptyBtn: { marginTop: space.md, paddingHorizontal: space.xxl },
  card: { gap: space.xs, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs },
  amount: { marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md, flexWrap: 'wrap' },
  actionBtn: { flex: 1, minWidth: 110 },
  meter: { marginTop: space.md, gap: space.xs, padding: space.lg, borderRadius: radius.md, backgroundColor: color.successSoft, borderWidth: 1, borderColor: color.success },
  rescheduleCard: { marginHorizontal: space.xl, marginBottom: space.md, gap: space.md, borderWidth: 1.5, borderColor: color.green },
  rescheduleActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  rescheduleBtn: { flex: 1 },
  iosPickerActions: { alignItems: 'flex-end' },
  iosDone: { paddingHorizontal: space.xl },
});
