import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { formatINR } from '@caresy/utils/pricing';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useCompanions } from '../../lib/useBookings';
import {
  BOOKING_SELECT, STATUS_OPTIONS, TRANSPORT_LABEL, contactOf, initials, isUrgent,
  pretty, relTime, telUri, type AdminBooking,
} from '../../lib/dispatch';
import { color, radius, shadow, space, type } from '../../lib/theme';
import { Avatar, BackLink, Btn, Card, Chip, Row, SectionTitle, Touchable } from '../../components/ui';

// The one screen where the desk actually changes something. Status and
// companion go through admin_save_booking_edit (migration 41/42) — one
// transaction, so a save never lands half-applied. The client never writes
// bookings.status or companion_user_id directly.

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();

  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [notFound, setNotFound] = useState(false);
  const companions = useCompanions(isAdmin);

  const [companionId, setCompanionId] = useState('');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!id) return;
    let stale = false;
    (async () => {
      const { data, error } = await supabase.from('bookings').select(BOOKING_SELECT).eq('id', id).single();
      if (stale) return;
      if (error || !data) { setNotFound(true); return; }
      const row = data as unknown as AdminBooking;
      setBooking(row);
      setCompanionId(row.companion_user_id ?? '');
      setStatus(String(row.status));
    })();
    return () => { stale = true; };
  }, [id]);

  const statusChanged = !!booking && status !== String(booking.status);
  const companionChanged = !!booking && companionId !== (booking.companion_user_id ?? '');
  const dirty = statusChanged || companionChanged;

  const selected = useMemo(
    () => companions.find((c) => c.id === companionId) ?? null,
    [companions, companionId],
  );

  async function save() {
    if (!booking || !dirty) return;

    // A manual status override is an audited act — reassign_booking and
    // admin_override_booking_status both record the reason.
    if (statusChanged && !reason.trim()) {
      setMessage({ text: 'A reason is required for a manual status change.', ok: false });
      return;
    }
    // Catch the driving-licence rule here rather than letting
    // guard_drive_assignment raise a raw trigger exception at the operator.
    if (companionChanged && selected && booking.transport_mode === 'CUSTOMER_VEHICLE' && !selected.can_drive) {
      setMessage({
        text: `${selected.full_name} has no verified driving licence — this booking needs a driver.`,
        ok: false,
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc('admin_save_booking_edit', {
      p_booking: booking.id,
      p_status: status,
      p_new_companion: companionId || null,
      p_reason: reason.trim() || null,
      p_change_status: statusChanged,
      p_change_companion: companionChanged,
    });
    setSaving(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setMessage({ text: error.message, ok: false });
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // The trigger in migration 30 stamps the companion onto the booking for the
    // customer app, so there is nothing else to write here.
    setBooking({ ...booking, status, companion_user_id: companionId || null });
    setReason('');
    setMessage({ text: 'Saved', ok: true });
  }

  if (notFound) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={[type.h1, { color: color.ink }]}>Booking not found</Text>
        <Btn label="Back to dispatch" tone="ghost" onPress={() => router.back()} style={{ marginTop: space.lg }} />
      </View>
    );
  }
  if (!booking) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={color.ink} />
      </View>
    );
  }

  const contact = contactOf(booking);
  const terminal = ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(String(booking.status).toUpperCase());

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: insets.top + space.md,
          // Clear the floating save bar, whose height is fixed by its own padding.
          paddingBottom: insets.bottom + 108,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <BackLink label="Dispatch" onPress={() => router.back()} />

        <Text style={[type.mono, { color: color.faint, marginTop: space.lg }]}>
          {booking.reference_code ?? booking.id.slice(0, 8)}
        </Text>
        <Text style={[type.display, { color: color.ink }]} numberOfLines={2}>
          {booking.patient?.full_name ?? 'Patient details pending'}
        </Text>

        <View style={styles.chips}>
          {isUrgent(booking) && !terminal ? <Chip label="Urgent" tone="critical" dot /> : null}
          <Chip
            label={pretty(booking.status)}
            tone={String(booking.status).toUpperCase() === 'IN_PROGRESS' ? 'info' : 'neutral'}
          />
          {booking.companion_user_id
            ? <Chip label="Staffed" tone="good" />
            : <Chip label="No companion" tone="warn" />}
        </View>

        {/* Reaching people. The customer who booked comes first; the patient's
            emergency contact is a fallback and says so. */}
        <Card style={styles.block}>
          <Text style={[type.overline, { color: color.muted, marginBottom: space.md }]}>Contact</Text>
          <Btn
            label={contact.phone ? `Call customer  ${contact.phone}` : 'No customer number on file'}
            disabled={!contact.phone}
            onPress={() => contact.phone && Linking.openURL(telUri(contact.phone))}
            full
          />
          <View style={styles.contactRow}>
            <Btn
              label="Emergency contact"
              tone="ghost"
              size="sm"
              disabled={!contact.emergencyPhone}
              onPress={() => contact.emergencyPhone && Linking.openURL(telUri(contact.emergencyPhone))}
              style={styles.grow}
            />
            <Btn
              label="Email"
              tone="ghost"
              size="sm"
              disabled={!contact.email}
              onPress={() => contact.email && Linking.openURL(`mailto:${contact.email}`)}
              style={styles.grow}
            />
          </View>
          <Row label="Email" value={contact.email ?? ''} />
          <Row label="Emergency" value={contact.emergencyPhone ?? ''} />
          <Row label="Language" value={contact.language ?? ''} />
        </Card>

        <Card style={styles.block}>
          <Text style={[type.overline, { color: color.muted, marginBottom: space.sm }]}>Request</Text>
          <Row label="Service" value={contact.plan ? pretty(contact.plan) : pretty(booking.service_type)} />
          <Row label="Type" value={pretty(booking.booking_type)} />
          <Row label="Department" value={contact.department ?? ''} />
          <Row label="Patient age" value={booking.patient?.age != null ? String(booking.patient.age) : ''} />
          <Row label="Pickup" value={booking.pickup_location?.title || booking.pickup_location?.address_line_1 || ''} />
          <Row label="Transport" value={booking.transport_mode ? TRANSPORT_LABEL[booking.transport_mode] ?? pretty(booking.transport_mode) : ''} />
          <Row label="Expected" value={booking.estimated_duration_minutes != null ? `${booking.estimated_duration_minutes} min` : ''} />
          <Row label="Placed" value={relTime(booking.created_at)} />
          <Row label="Scheduled" value={booking.scheduled_start_time ? relTime(booking.scheduled_start_time) : ''} />
          <Row label="Expires" value={booking.expires_at ? relTime(booking.expires_at) : ''} />
          <Row label="Amount" value={booking.final_amount_paise != null ? formatINR(booking.final_amount_paise) : ''} />
        </Card>

        {booking.special_instructions ? (
          <Card style={[styles.block, { backgroundColor: color.brandTint }]}>
            <Text style={[type.overline, { color: color.onBrand }]}>Instructions</Text>
            <Text style={[type.body, { color: color.ink, marginTop: space.sm }]}>{booking.special_instructions}</Text>
          </Card>
        ) : null}

        <View style={styles.sectionGap}>
          <SectionTitle title="Companion" />
        </View>
        <View style={{ gap: space.sm }}>
          <CompanionOption
            label="Unassigned"
            sub="Send this back to the pending queue"
            active={companionId === ''}
            onPress={() => setCompanionId('')}
          />
          {companions.map((c) => (
            <CompanionOption
              key={c.id}
              label={c.full_name}
              sub={[
                c.rating != null ? `${c.rating.toFixed(1)} · ${c.total_jobs} visits` : 'New companion',
                c.can_drive ? 'Can drive' : null,
              ].filter(Boolean).join('  ·  ')}
              avatar={initials(c.full_name)}
              active={companionId === c.id}
              warn={booking.transport_mode === 'CUSTOMER_VEHICLE' && !c.can_drive}
              onPress={() => setCompanionId(c.id)}
            />
          ))}
        </View>

        <View style={styles.sectionGap}>
          <SectionTitle title="Status" />
        </View>
        <View style={styles.statusWrap}>
          {STATUS_OPTIONS.map((s) => (
            <Touchable
              key={s}
              onPress={() => setStatus(s)}
              style={[styles.statusChip, status === s && styles.statusChipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: status === s }}
            >
              <Text style={[type.label, { color: status === s ? color.onInk : color.inkSoft }]}>{pretty(s)}</Text>
            </Touchable>
          ))}
        </View>

        {statusChanged ? (
          <TextInput
            style={styles.reason}
            value={reason}
            onChangeText={setReason}
            placeholder="Why is this status changing? (recorded in the audit log)"
            placeholderTextColor={color.faint}
            multiline
            accessibilityLabel="Reason for the status change"
          />
        ) : null}

        {message ? (
          <Text style={[type.body, { color: message.ok ? color.good : color.critical, marginTop: space.lg }]}>
            {message.text}
          </Text>
        ) : null}
      </ScrollView>

      {/* The save stays in the thumb's reach whatever the scroll position —
          an assignment half-made is the one state this screen must not invite. */}
      <View style={[styles.saveBar, { paddingBottom: insets.bottom + space.md }]}>
        <Btn
          label={saving ? 'Saving…' : dirty ? 'Save changes' : 'No changes'}
          onPress={save}
          disabled={!dirty || saving}
          full
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function CompanionOption({
  label, sub, avatar, active, warn, onPress,
}: { label: string; sub: string; avatar?: string; active: boolean; warn?: boolean; onPress: () => void }) {
  return (
    <Touchable
      onPress={onPress}
      style={[styles.option, active && styles.optionOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Avatar text={avatar ?? '—'} size={40} tone={active ? 'brand' : 'neutral'} />
      <View style={{ flex: 1 }}>
        <Text style={[type.h2, { color: color.ink }]} numberOfLines={1}>{label}</Text>
        <Text style={[type.caption, { color: warn ? color.warn : color.muted }]} numberOfLines={1}>
          {warn ? 'No verified driving licence' : sub}
        </Text>
      </View>
      {active ? <View style={styles.tick} /> : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
  block: { marginTop: space.lg, padding: space.lg },
  contactRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, marginBottom: space.sm },
  grow: { flex: 1 },
  sectionGap: { marginTop: space.xl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: space.md,
    minHeight: 64,
    ...shadow.card,
  },
  optionOn: { borderColor: color.ink },
  tick: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.ink },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  statusChip: {
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  statusChipOn: { backgroundColor: color.ink, borderColor: color.ink },
  reason: {
    marginTop: space.lg,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.lineStrong,
    borderRadius: radius.md,
    padding: space.lg,
    color: color.ink,
    fontSize: 15,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.float,
  },
});
