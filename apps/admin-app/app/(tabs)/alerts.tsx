import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { relTime } from '../../lib/dispatch';
import {
  NOTIF_FILTERS, NOTIF_SELECT, copyFor, messageText, recipientOf, waUrl,
  type NotifRow, type NotifStatus,
} from '../../lib/notifications';
import { TAB_BAR_SPACE, color, space, type } from '../../lib/theme';
import { Btn, Card, Chip, Empty, FilterPills, ScreenHeader, Touchable, type Tone } from '../../components/ui';

// The outbox. Every booking status change enqueues a row here; the cron sends
// what it can (push, Telegram) and this is where a human sends the rest — the
// WhatsApp message to the family — and marks the row done.
//
// Latest 300 fetched once and filtered on the device: switching tabs is then
// instant and every count is free.

const FETCH_LIMIT = 300;

const STATUS_TONE: Record<NotifStatus, Tone> = {
  QUEUED: 'info', SENT: 'good', FAILED: 'critical', SKIPPED: 'neutral',
};

/** The one query, shared by the first load and pull-to-refresh. */
async function fetchNotifications(): Promise<{ rows: NotifRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIF_SELECT)
    .order('created_at', { ascending: false })
    .limit(FETCH_LIMIT);
  return { rows: (data as unknown as NotifRow[]) ?? [], error: error?.message ?? null };
}

export default function Alerts() {
  const { pushState, enablePush } = useAuth();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<NotifRow[] | null>(null);
  const [filter, setFilter] = useState<NotifStatus | 'ALL'>('QUEUED');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetchNotifications();
      if (!alive) return;
      setError(r.error);
      setAll(r.rows);
    })();
    return () => { alive = false; };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const r = await fetchNotifications();
    setError(r.error);
    setAll(r.rows);
    setRefreshing(false);
  }, []);

  // Optimistic, like the dispatch board: the row restyles immediately and a
  // failure puts the old list back, so nothing reads as sent that was not.
  const setStatus = useCallback(async (id: string, status: NotifStatus) => {
    const snapshot = all;
    const sent_at = status === 'SENT' ? new Date().toISOString() : null;
    setAll((cur) => (cur ?? []).map((n) => (n.id === id ? { ...n, status, sent_at } : n)));
    const { error: err } = await supabase.from('notifications').update({ status, sent_at }).eq('id', id);
    if (err) { setAll(snapshot); setError(err.message); }
  }, [all]);

  const sendWhatsApp = useCallback(async (n: NotifRow) => {
    const to = recipientOf(n);
    if (!to) { setError('No customer phone on this booking.'); return; }
    const url = waUrl(to, messageText(n));
    const opened = await Linking.openURL(url).then(() => true).catch(() => false);
    // Only claim it was sent if WhatsApp actually opened. Marking a row SENT
    // that never left the phone is worse than leaving it queued.
    if (opened) await setStatus(n.id, 'SENT');
    else setError('Could not open WhatsApp on this device.');
  }, [setStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of all ?? []) c[n.status] = (c[n.status] || 0) + 1;
    return c;
  }, [all]);

  const rows = useMemo(
    () => (all ?? []).filter((n) => filter === 'ALL' || n.status === filter),
    [all, filter],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: insets.bottom + TAB_BAR_SPACE,
        }}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.muted} />}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + space.md }}>
            <ScreenHeader
              title="Alerts"
              subtitle="Queued on every booking status change. Send it, then it's done."
            />

            {pushState === 'off' ? (
              <Card style={styles.notice}>
                <Text style={[type.h2, { color: color.ink }]}>This phone will not ring</Text>
                <Text style={[type.body, { color: color.muted, marginTop: 4 }]}>
                  Dispatch alerts are switched off, so new requests arrive only when you open the app.
                </Text>
                <Btn label="Turn on alerts" size="sm" onPress={enablePush} style={{ marginTop: space.md, alignSelf: 'flex-start' }} />
              </Card>
            ) : null}

            {error ? (
              <Card style={[styles.notice, { backgroundColor: color.criticalTint }]}>
                <Text style={[type.body, { color: color.critical }]}>{error}</Text>
              </Card>
            ) : null}

            <FilterPills
              options={NOTIF_FILTERS.map((f) => ({
                key: f.key,
                label: f.label,
                count: f.key === 'ALL' ? all?.length ?? 0 : counts[f.key] ?? 0,
              }))}
              value={filter}
              onChange={setFilter}
            />
            <View style={{ height: space.lg }} />
          </View>
        }
        ListEmptyComponent={
          all === null
            ? <ActivityIndicator color={color.ink} style={{ marginTop: space.xl }} />
            : <Empty title="Nothing here" hint={filter === 'QUEUED' ? 'Every message has been sent.' : 'No messages in this view.'} />
        }
        ListFooterComponent={
          all !== null && all.length === FETCH_LIMIT ? (
            <Text style={[type.caption, { color: color.faint, textAlign: 'center', marginTop: space.lg }]}>
              Showing the latest {FETCH_LIMIT}.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <NotifCard
            row={item}
            onSend={() => sendWhatsApp(item)}
            onMark={(s) => setStatus(item.id, s)}
          />
        )}
      />
    </View>
  );
}

function NotifCard({
  row: n, onSend, onMark,
}: { row: NotifRow; onSend: () => void; onMark: (status: NotifStatus) => void }) {
  const c = copyFor(n);
  const reachable = recipientOf(n) !== null;

  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardChips}>
          <Chip label={n.status.toLowerCase()} tone={STATUS_TONE[n.status]} />
          {n.recipient_role ? <Chip label={n.recipient_role.toLowerCase()} tone="neutral" /> : null}
        </View>
        <Text style={[type.mono, { color: color.faint }]}>{relTime(n.created_at)}</Text>
      </View>

      <Text style={[type.h2, { color: color.ink, marginTop: space.sm }]}>{c.title}</Text>
      {c.body ? (
        <Text style={[type.body, { color: color.muted, marginTop: 2 }]}>{c.body}</Text>
      ) : null}

      {n.error ? (
        <Text style={[type.caption, { color: color.critical, marginTop: space.sm }]} numberOfLines={2}>
          {n.error}
        </Text>
      ) : null}

      {n.status === 'QUEUED' ? (
        <View style={styles.actions}>
          <Btn
            label={reachable ? 'Send on WhatsApp' : 'No number'}
            size="sm"
            disabled={!reachable}
            onPress={onSend}
            style={styles.grow}
          />
          <Btn label="Mark sent" tone="ghost" size="sm" onPress={() => onMark('SENT')} style={styles.grow} />
          <Btn label="Failed" tone="ghost" size="sm" onPress={() => onMark('FAILED')} />
        </View>
      ) : n.status === 'FAILED' ? (
        <View style={styles.actions}>
          <Btn label="Retry on WhatsApp" tone="ghost" size="sm" disabled={!reachable} onPress={onSend} style={styles.grow} />
        </View>
      ) : n.status === 'SENT' && n.sent_at ? (
        <Text style={[type.caption, { color: color.faint, marginTop: space.md }]}>sent {relTime(n.sent_at)}</Text>
      ) : null}

      {n.booking_id ? (
        <Touchable
          onPress={() => router.push(`/booking/${n.booking_id}`)}
          accessibilityRole="button"
          accessibilityLabel="Open the booking this message is about"
          style={styles.openRow}
        >
          <Text style={[type.label, { color: color.inkSoft }]}>
            Open {n.booking?.reference_code ?? 'booking'}
          </Text>
        </Touchable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  card: { padding: space.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  cardChips: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg, flexWrap: 'wrap' },
  grow: { flex: 1 },
  notice: { padding: space.lg, marginBottom: space.lg },
  openRow: { paddingTop: space.md, alignSelf: 'flex-start' },
});
