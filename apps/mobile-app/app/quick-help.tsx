import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isValidPincode } from '@caresy/utils';
import { checkPincodeServed } from '@caresy/utils/serviceArea';
import { HOSPITALS, pincodeForArea } from '../lib/hospitals';
import { Button, Card, Field, Screen, Txt, Overline } from '../components/ui';
import { color, space } from '../lib/theme';

const SUPPORT_WA = '919717500225';

export default function QuickHelp() {
  const { session } = useAuth();
  const router = useRouter();
  const [hospital, setHospital] = useState('');
  const [pincode, setPincode] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pickHospital = (name: string, area: string) => {
    setHospital(name);
    const pin = pincodeForArea(area);
    if (pin) setPincode(pin);
  };

  const submit = async () => {
    if (!hospital.trim()) { Alert.alert('Enter hospital name'); return; }
    if (!isValidPincode(pincode.trim())) { Alert.alert('Enter valid 6-digit pincode'); return; }
    const { served } = await checkPincodeServed(supabase, pincode.trim());
    if (!served) { Alert.alert("We don't serve this pincode yet", 'We will still try to help — a team member will call you.'); }
    if (!session) { Alert.alert('Sign in required', 'Please sign in to request urgent help.'); router.push('/'); return; }
    setSubmitting(true);
    try {
      // Reuse booking flow but flag as urgent: create patient reusing existing or new, then booking with URGENT booking_type.
      const uid = session.user.id;
      // Try reuse existing patient for quick path
      const { data: existing } = await supabase.from('patients').select('id').eq('customer_user_id', uid).limit(1).maybeSingle();
      let patientId = existing?.id as string | undefined;
      if (!patientId) {
        const { data, error } = await supabase.from('patients').insert({
          customer_user_id: uid, full_name: session.user.user_metadata?.name ?? 'Patient', age: null,
        }).select().single();
        if (error) throw error;
        patientId = data.id;
      }
      const { data: loc, error: locErr } = await supabase.from('locations').insert({
        customer_user_id: uid, title: hospital, address_line_1: hospital, city: 'Noida', state: 'Uttar Pradesh', pincode: pincode.trim(), latitude: null, longitude: null,
      }).select().single();
      if (locErr) throw locErr;
      const { error: bkErr } = await supabase.from('bookings').insert({
        customer_user_id: uid, patient_id: patientId, pickup_location_id: loc.id,
        service_type: 'HOSPITAL_COMPANION', booking_type: 'URGENT', status: 'PENDING',
        transport_mode: 'NONE', scheduled_start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        special_instructions: reason || 'Urgent help requested via app',
        estimated_duration_minutes: 120,
        service_metadata: { quickHelp: true, hospital, pincode: pincode.trim(), reason },
      });
      if (bkErr) throw bkErr;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Help is on the way', "We've flagged this as urgent. Our team will call you within minutes.", [{ text: 'OK', onPress: () => router.replace('/my-bookings') }]);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not send', e.message ?? 'Try again or WhatsApp us.');
    } finally { setSubmitting(false); }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Urgent help' }} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Overline color={color.terracottaDeep}>Need someone right now?</Overline>
        <Txt variant="h1" color={color.greenDeep}>Quick help</Txt>
        <Txt variant="body" color={color.muted}>For hospital visits needed within the hour. We'll prioritise this booking and call you back.</Txt>

        <Card style={s.card}>
          <Field label="Hospital / clinic" value={hospital} onChangeText={setHospital} placeholder="e.g. Max Hospital, Noida" />
          {hospital.trim().length > 1 && (
            <View style={s.chips}>
              {HOSPITALS.filter(h => `${h.name} ${h.area}`.toLowerCase().includes(hospital.toLowerCase())).slice(0, 4).map(h => (
                <Txt key={h.name} variant="label" color={color.greenDeep} onPress={() => pickHospital(h.name, h.area)} style={s.chip}> {h.name} · {h.area}</Txt>
              ))}
            </View>
          )}
          <Field label="Pincode" value={pincode} onChangeText={setPincode} placeholder="201301" keyboardType="number-pad" />
          <Field label="What do you need? (optional)" value={reason} onChangeText={setReason} placeholder="OPD, procedure, pickup…" multiline />
          <Button title="Request urgent help" onPress={submit} loading={submitting} variant="danger" style={s.cta} />
          <Button title="Or WhatsApp us" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent('I need urgent companion help at ' + hospital)}`)} style={s.secondary} />
          <Txt variant="caption" color={color.faint} style={s.caption}>This creates an urgent booking with 60-min lead. For emergencies, call your hospital directly.</Txt>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { padding: space.xl, gap: space.md, paddingBottom: space.xxl },
  card: { gap: space.md, marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: -space.sm },
  chip: { backgroundColor: '#E7F2ED', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, overflow: 'hidden' },
  cta: { marginTop: space.sm },
  secondary: { marginTop: space.sm },
  caption: { textAlign: 'center', marginTop: space.sm },
});
