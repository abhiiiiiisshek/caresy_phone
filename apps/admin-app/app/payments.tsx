import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatINR } from '@caresy/utils/pricing';

import { supabase } from '../lib/supabase';
import { relTime } from '../lib/dispatch';
import {
  PAYMENT_FILTERS, PAYMENT_SELECT, paymentTotals,
  type PaymentRow, type PaymentStatus,
} from '../lib/money';
import { color, space, type } from '../lib/theme';
import {
  BackLink, Btn, Card, Chip, Empty, FilterPills, ScreenHeader, StatBox, type Tone,
} from '../components/ui';

// The ledger. Amounts come from complete_booking() and collections from
// record_payment(), both companion-side — the one write here is "waive", the
// correction ops actually needs for a visit that should not be charged.

const STATUS_TONE: Record<PaymentStatus, Tone> = {
  PENDING: 'critical', COLLECTED: 'good', WAIVED: 'neutral',
};

export default function Payments() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [filter, setFilter] = useState<PaymentStatus | 'ALL'>('PENDING');
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('bookings')
        .select(PAYMENT_SELECT)
        .neq('payment_status', 'UNBILLED')
        .is('deleted_at', null)
        .order('actual_end_time', { ascending: false, nullsFirst: false });
      if (!alive) return;
      if (err) setError(err.message);
      setRows((data as unknown as PaymentRow[]) ?? []);
    })();
    return () => { alive = false; };
  }, []);

  // Optimistic, and guarded: the UPDATE only matches a row still PENDING, so a
  // payment the companion collected a second ago cannot be waived out from
  // under them. Zero rows back means someone else got there first.
  const waive = useCallback(async (id: string) => {
    const snapshot = rows;
    setConfirmId(null);
    setSavingId(id);
    setRows((cur) => (cur ?? []).map((r) => (r.id === id ? { ...r, payment_status: 'WAIVED' } : r)));

    const { data, error: err } = await supabase
      .from('bookings')
      .update({ payment_status: 'WAIVED' })
      .eq('id', id)
      .eq('payment_status', 'PENDING')
      .select('id');
    setSavingId(null);

    if (err) { setRows(snapshot); setError(err.message); return; }
    if (!data || data.length === 0) {
      setRows(snapshot);
      setError('That payment was already collected or waived — pull to refresh.');
    }
  }, [rows]);

  const totals = useMemo(() => paymentTotals(rows ?? []), [rows]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows ?? []) c[r.payment_status] = (c[r.payment_status] || 0) + 1;
    return c;
  }, [rows]);
  const filtered = useMemo(
    () => (filter === 'ALL' ? rows ?? [] : (rows ?? []).filter((r) => r.payment_status === filter)),
    [rows, filter],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.xxl }}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + space.md }}>
            <BackLink label="More" onPress={() => router.back()} />

            <ScreenHeader title="Payments" subtitle="What is owed, what came in, what was written off." />

            {/* What is owed leads, full width; the two history figures share
                the row under it. Three ₹ amounts across a phone had to shrink
                to fit and each one shrank by a different amount. */}
            <View style={styles.stats}>
              <View style={[styles.cell, styles.cellWide]}>
                <StatBox value={formatINR(totals.pendingPaise)} label={`Owed now · ${totals.pendingCount} unpaid`} />
              </View>
              <View style={styles.cell}>
                <StatBox value={formatINR(totals.todayPaise)} label="Collected today" />
              </View>
              <View style={styles.cell}>
                <StatBox value={formatINR(totals.collectedPaise)} label="Collected all time" />
              </View>
            </View>

            {error ? (
              <Card style={[styles.notice, { backgroundColor: color.criticalTint }]}>
                <Text style={[type.body, { color: color.critical }]}>{error}</Text>
              </Card>
            ) : null}

            <FilterPills
              options={PAYMENT_FILTERS.map((f) => ({
                key: f.key,
                label: f.label,
                count: f.key === 'ALL' ? rows?.length ?? 0 : counts[f.key] ?? 0,
              }))}
              value={filter}
              onChange={setFilter}
            />
            <View style={{ height: space.lg }} />
          </View>
        }
        ListEmptyComponent={
          rows === null
            ? <ActivityIndicator color={color.ink} style={{ marginTop: space.xl }} />
            : <Empty
                title={filter === 'PENDING' ? 'All settled' : 'Nothing here'}
                hint={filter === 'PENDING' ? 'Every completed visit has been paid for.' : 'No bookings in this state yet.'}
              />
        }
        renderItem={({ item: r }) => (
          <Card style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[type.h2, { color: color.ink }]} numberOfLines={1}>
                {r.patient?.full_name || 'Unnamed patient'}
              </Text>
              <Text style={[type.caption, { color: color.muted }]} numberOfLines={1}>
                {[
                  r.reference_code,
                  r.billed_minutes != null ? `${r.billed_minutes} min` : null,
                  r.payment_status === 'COLLECTED' && r.collected_at
                    ? `collected ${relTime(r.collected_at)}`
                    : r.actual_end_time ? `finished ${relTime(r.actual_end_time)}` : null,
                ].filter(Boolean).join('  ·  ')}
              </Text>
              <View style={styles.chips}>
                <Chip label={r.payment_status.toLowerCase()} tone={STATUS_TONE[r.payment_status]} />
                {r.payment_method ? <Chip label={r.payment_method.toLowerCase()} tone="neutral" /> : null}
              </View>
            </View>

            <View style={styles.amountCol}>
              <Text style={[type.h2, { color: color.ink }]}>
                {r.final_amount_paise != null ? formatINR(r.final_amount_paise) : '—'}
              </Text>
              {r.payment_status === 'PENDING' ? (
                confirmId === r.id ? (
                  <View style={styles.confirm}>
                    <Btn label="Waive" tone="danger" size="sm" onPress={() => waive(r.id)} />
                    <Btn label="No" tone="ghost" size="sm" onPress={() => setConfirmId(null)} />
                  </View>
                ) : (
                  <Btn
                    label={savingId === r.id ? 'Saving…' : 'Waive'}
                    tone="ghost"
                    size="sm"
                    disabled={savingId === r.id}
                    onPress={() => setConfirmId(r.id)}
                  />
                )
              ) : null}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  cell: { flexDirection: 'row', flexBasis: '47%', flexGrow: 1 },
  cellWide: { flexBasis: '100%' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  chips: { flexDirection: 'row', gap: 6, marginTop: 6 },
  amountCol: { alignItems: 'flex-end', gap: space.sm },
  confirm: { flexDirection: 'row', gap: 6 },
  notice: { padding: space.lg, marginBottom: space.lg },
});
