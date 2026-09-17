import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { color, radius, space, type } from '../lib/theme';
import { Card, Pill, Touchable } from './ui';
import { pretty, relTime, urgency, type AdminBooking } from '../lib/dispatch';

// One card per booking. The card answers, in reading order: how loud is this,
// which booking, how long has it been waiting, who is the patient, what is the
// job — then the two things the operator actually does about it.

const ACCENT = { critical: color.terracotta, warn: color.amber, calm: color.line } as const;

export function BookingCard({ booking, now }: { booking: AdminBooking; now: number }) {
  const level = urgency(booking, now);
  const phone = booking.patient?.emergency_contact_phone ?? null;
  const patient = booking.patient?.full_name ?? 'Patient details pending';
  const age = booking.patient?.age;
  // An unassigned request is racing its own expiry; a staffed one is waiting
  // for its start time. Show whichever clock the operator can still act on.
  const clock = !booking.companion_user_id && booking.expires_at
    ? `expires ${relTime(booking.expires_at, now)}`
    : booking.scheduled_start_time
      ? `starts ${relTime(booking.scheduled_start_time, now)}`
      : `${relTime(booking.created_at, now)}`;

  return (
    <Card accent={level === 'calm' ? undefined : ACCENT[level]} style={styles.card}>
      <Touchable onPress={() => router.push(`/booking/${booking.id}`)} accessibilityRole="button">
        <View style={styles.head}>
          <View style={styles.headLeft}>
            <View style={[styles.dot, { backgroundColor: ACCENT[level] === color.line ? color.faint : ACCENT[level] }]} />
            <Text style={[type.mono, { color: color.ink }]}>{booking.reference_code ?? booking.id.slice(0, 8)}</Text>
          </View>
          <Text style={[type.mono, { color: level === 'critical' ? color.terracotta : color.muted }]}>{clock}</Text>
        </View>

        <Text style={[type.h1, styles.patient]} numberOfLines={1}>
          {patient}{age ? <Text style={[type.h1, { color: color.faint }]}>{`  ${age}`}</Text> : null}
        </Text>

        <Text style={[type.body, { color: color.muted }]} numberOfLines={1}>
          {[pretty(booking.service_type), booking.pickup_location?.title || booking.pickup_location?.address_line_1]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>

        <View style={styles.pills}>
          {!booking.companion_user_id
            ? <Pill label="No companion" tone="red" />
            : <Pill label="Staffed" tone="green" />}
          <Pill label={pretty(booking.status)} tone={String(booking.status).toUpperCase() === 'IN_PROGRESS' ? 'blue' : 'calm'} />
          {booking.transport_mode === 'CUSTOMER_VEHICLE' ? <Pill label="Needs driver" tone="amber" /> : null}
        </View>
      </Touchable>

      <View style={styles.actions}>
        <Touchable
          style={styles.action}
          haptic="medium"
          onPress={() => router.push(`/booking/${booking.id}`)}
          accessibilityRole="button"
          accessibilityLabel={booking.companion_user_id ? 'Open booking' : 'Assign a companion'}
        >
          <Text style={[type.label, { color: color.green }]}>
            {booking.companion_user_id ? 'Open' : 'Assign'}
          </Text>
        </Touchable>
        <Touchable
          style={[styles.action, !phone && styles.actionOff]}
          haptic="medium"
          disabled={!phone}
          onPress={() => phone && Linking.openURL(`tel:${phone}`)}
          accessibilityRole="button"
          accessibilityLabel={phone ? `Call ${patient}` : 'No phone number on file'}
        >
          <Text style={[type.label, { color: phone ? color.ink : color.faint }]}>Call</Text>
        </Touchable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  patient: { color: color.ink, marginTop: space.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: color.surfaceHi,
  },
  actionOff: { backgroundColor: 'transparent' },
});
