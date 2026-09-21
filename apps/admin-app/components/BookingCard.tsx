import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { color, radius, space, type } from '../lib/theme';
import { Btn, Card, Chip, Touchable } from './ui';
import { contactOf, isUrgent, pretty, relTime, telUri, urgency, type AdminBooking } from '../lib/dispatch';

// One card per booking, in the order the operator actually reads it:
// how loud is this → which booking → which clock is running → who is it for →
// what is the job → the two things they do about it.
//
// The card is one tap target for "open"; the buttons are the exceptions that
// need their own hit area.

const CLOCK_TONE = { critical: color.critical, warn: color.warn, calm: color.muted } as const;

export function BookingCard({ booking, now }: { booking: AdminBooking; now: number }) {
  const level = urgency(booking, now);
  const contact = contactOf(booking);
  const patient = booking.patient?.full_name ?? 'Patient details pending';
  const age = booking.patient?.age;
  const terminal = ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(String(booking.status).toUpperCase());

  // The customer who placed the booking is who the desk calls back. Next of kin
  // on the patient record is a fallback, and is labelled as one — ringing a
  // frail patient's emergency contact by mistake is its own small disaster.
  const callNumber = contact.phone ?? contact.emergencyPhone;
  const callLabel = contact.phone ? 'Call customer' : contact.emergencyPhone ? 'Call contact' : 'No number';

  // An unassigned request is racing its own expiry; a staffed one is waiting for
  // its start time. Show whichever clock can still be acted on.
  const clock = !booking.companion_user_id && booking.expires_at
    ? `expires ${relTime(booking.expires_at, now)}`
    : booking.scheduled_start_time
      ? `starts ${relTime(booking.scheduled_start_time, now)}`
      : relTime(booking.created_at, now);

  const open = () => router.push(`/booking/${booking.id}`);

  return (
    <Card style={styles.card}>
      <Touchable onPress={open} accessibilityRole="button" accessibilityLabel={`Open booking for ${patient}`}>
        <View style={styles.head}>
          <Text style={[type.mono, { color: color.faint }]}>
            {booking.reference_code ?? booking.id.slice(0, 8)}
          </Text>
          <Text style={[type.mono, { color: CLOCK_TONE[level] }]}>{clock}</Text>
        </View>

        <Text style={[type.h1, { color: color.ink, marginTop: space.sm }]} numberOfLines={1}>
          {patient}
          {age != null ? <Text style={[type.h1, { color: color.faint }]}>{`   ${age}`}</Text> : null}
        </Text>

        <Text style={[type.body, { color: color.muted, marginTop: 2 }]} numberOfLines={1}>
          {[pretty(booking.service_type), booking.pickup_location?.title || booking.pickup_location?.address_line_1]
            .filter(Boolean)
            .join('  ·  ')}
        </Text>

        <View style={styles.chips}>
          {isUrgent(booking) && !terminal ? <Chip label="Urgent" tone="critical" dot /> : null}
          {booking.companion_user_id
            ? <Chip label="Staffed" tone="good" />
            : <Chip label="No companion" tone="warn" />}
          <Chip
            label={pretty(booking.status)}
            tone={String(booking.status).toUpperCase() === 'IN_PROGRESS' ? 'info' : 'neutral'}
          />
          {booking.transport_mode === 'CUSTOMER_VEHICLE' ? <Chip label="Needs driver" tone="brand" /> : null}
        </View>
      </Touchable>

      <View style={styles.actions}>
        <Btn
          label={booking.companion_user_id ? 'Open' : 'Assign'}
          size="sm"
          onPress={open}
          style={styles.grow}
        />
        <Btn
          label={callLabel}
          tone="ghost"
          size="sm"
          disabled={!callNumber}
          onPress={() => callNumber && Linking.openURL(telUri(callNumber))}
          style={styles.grow}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, borderRadius: radius.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  grow: { flex: 1 },
});
