import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ApprovalStatus } from '@caresy/types';

import { supabase } from '../../lib/supabase';
import { relTime, initials } from '../../lib/dispatch';
import { COMPANION_FILTERS, statusLabel, type CompanionRow } from '../../lib/companions';
import { TAB_BAR_SPACE, color, space, type } from '../../lib/theme';
import { Avatar, Card, Chip, Empty, FilterPills, ScreenHeader, Touchable, type Tone } from '../../components/ui';

// Who can be sent to a visit. The queue defaults to Pending because an
// application nobody reviews is a companion who never works.

const STATUS_TONE: Record<ApprovalStatus, Tone> = {
  PENDING_REVIEW: 'info', APPROVED: 'good', REJECTED: 'critical', SUSPENDED: 'neutral',
};

async function fetchCompanions(): Promise<{ rows: CompanionRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('companions').select('*').is('deleted_at', null)
    .order('created_at', { ascending: false });
  return { rows: (data as CompanionRow[]) ?? [], error: error?.message ?? null };
}

export default function Team() {
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<CompanionRow[] | null>(null);
  const [filter, setFilter] = useState<ApprovalStatus | 'ALL'>('PENDING_REVIEW');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetchCompanions();
      if (!alive) return;
      setError(r.error);
      setAll(r.rows);
    })();
    return () => { alive = false; };
  }, []);

  // Pull to refresh after approving someone on the detail screen.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    const r = await fetchCompanions();
    setError(r.error);
    setAll(r.rows);
    setRefreshing(false);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of all ?? []) c[r.approval_status] = (c[r.approval_status] || 0) + 1;
    return c;
  }, [all]);

  const rows = useMemo(
    () => (all ?? []).filter((c) => filter === 'ALL' || c.approval_status === filter),
    [all, filter],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + TAB_BAR_SPACE }}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.muted} />}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + space.md }}>
            <ScreenHeader
              title="Team"
              subtitle="Review KYC, approve or suspend, and clear drivers."
            />
            {error ? (
              <Card style={[styles.notice, { backgroundColor: color.criticalTint }]}>
                <Text style={[type.body, { color: color.critical }]}>{error}</Text>
              </Card>
            ) : null}
            <FilterPills
              options={COMPANION_FILTERS.map((f) => ({
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
            : <Empty
                title="Nobody here"
                hint={filter === 'PENDING_REVIEW' ? 'Every application has been reviewed.' : 'No companions in this view.'}
              />
        }
        renderItem={({ item: c }) => (
          <Touchable
            onPress={() => router.push(`/companion/${c.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Review ${c.full_name}`}
          >
            <Card style={styles.row}>
              <Avatar text={initials(c.full_name)} size={44} tone={c.approval_status === 'APPROVED' ? 'good' : 'neutral'} />
              <View style={{ flex: 1 }}>
                <Text style={[type.h2, { color: color.ink }]} numberOfLines={1}>{c.full_name}</Text>
                <Text style={[type.caption, { color: color.muted }]} numberOfLines={1}>
                  {[
                    c.phone,
                    c.years_experience != null ? `${c.years_experience} yrs` : null,
                    c.service_pincodes?.length ? c.service_pincodes.join(', ') : null,
                    relTime(c.created_at),
                  ].filter(Boolean).join('  ·  ')}
                </Text>
                <View style={styles.chips}>
                  <Chip label={statusLabel(c.approval_status)} tone={STATUS_TONE[c.approval_status]} />
                  {c.can_drive ? <Chip label="Driver" tone="brand" /> : null}
                  {c.is_online ? <Chip label="Online" tone="good" dot /> : null}
                </View>
              </View>
            </Card>
          </Touchable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  chips: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  notice: { padding: space.lg, marginBottom: space.lg },
});
