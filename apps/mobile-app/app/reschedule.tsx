import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { supabase } from '../lib/supabase';
import { availableSlots } from '@caresy/utils/slots';
import { Button, Card, Chip, ChipRow, Screen, Txt, Overline } from '../components/ui';
import { color, space } from '../lib/theme';

function fmtSlot(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function nextDays(count = 14) {
  const base = new Date(); base.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base); d.setDate(base.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    return { iso, label };
  });
}

export default function Reschedule() {
  const { id, ref: refCode } = useLocalSearchParams<{ id: string; ref?: string }>();
  const router = useRouter();
  const days = useMemo(() => nextDays(), []);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const slots = availableSlots(date);

  const confirm = async () => {
    if (!id) { Alert.alert('Missing booking'); return; }
    if (!date || !time) { Alert.alert('Pick a date and time'); return; }
    if (!slots.includes(time)) { Alert.alert('That slot has passed. Pick another.'); return; }
    setSaving(true);
    const iso = new Date(`${date}T${time}:00`).toISOString();
    const { error } = await supabase.rpc('reschedule_booking', { p_booking: id, p_new_start: iso });
    setSaving(false);
    if (error) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); Alert.alert('Could not reschedule', error.message); }
    else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert('Rescheduled', `New time: ${days.find(d=>d.iso===date)?.label} ${fmtSlot(time)}`, [{ text: 'OK', onPress: () => router.replace('/my-bookings') }]); }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Reschedule' }} />
      <View style={s.body}>
        <Overline>Move your visit</Overline>
        <Txt variant="h1" color={color.greenDeep}>Pick a new slot</Txt>
        {refCode ? <Txt variant="caption" color={color.faint}>Ref {refCode}</Txt> : null}
        <Txt variant="body" color={color.muted}>Must be at least 60 minutes from now. Your companion and ops will be notified.</Txt>

        <Card style={s.card}>
          <Txt variant="label" color={color.muted}>Date</Txt>
          <ChipRow>
            {days.map((d) => <Chip key={d.iso} label={d.label} selected={date === d.iso} onPress={() => { setDate(d.iso); setTime(''); }} />)}
          </ChipRow>
          {date ? (
            slots.length ? (
              <>
                <Txt variant="label" color={color.muted}>Time</Txt>
                <ChipRow>{slots.map((t) => <Chip key={t} label={fmtSlot(t)} selected={time === t} onPress={() => setTime(t)} />)}</ChipRow>
              </>
            ) : <Txt variant="body" color={color.muted}>No slots left that day. Pick another.</Txt>
          ) : <Txt variant="body" color={color.muted}>Choose a day to see available slots.</Txt>}
          <Button title="Confirm new time" onPress={confirm} loading={saving} style={s.cta} />
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={s.secondary} />
        </Card>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.md, flex: 1 },
  card: { gap: space.md, marginTop: space.sm },
  cta: { marginTop: space.md },
  secondary: { marginTop: space.sm },
});
