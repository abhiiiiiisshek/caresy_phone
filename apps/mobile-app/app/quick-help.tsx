import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, useReducedMotion } from 'react-native-reanimated';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { isValidIndianMobile, toE164 } from '@caresy/utils/phone';
import { checkPincodeServed, isValidPincode } from '@caresy/utils';
import { eveningSurchargePaise } from '@caresy/utils/pricing';
import { Button, Card, Chip, ChipRow, Field, FormScreen, Overline, Txt } from '../components/ui';
import { color, radius, space } from '../lib/theme';

// Mirrors apps/website/src/app/quick-help/page.tsx — 3-step wizard
// Step1: contact, Step2: where (patient/hospital/pincode), Step3: urgency/notes
const TOTAL_STEPS = 3;
const STEP_TITLES = ['Contact details', 'Where is help needed?', 'Urgency'];
const SERVICES = [
  'Appointment today',
  'Test or scan today',
  'Registration or queue support',
  'Medicine or document support',
  'Need guidance from operations',
] as const;
const URGENCIES = ['Call now', 'Within 30 minutes', 'Later today'] as const;

export default function QuickHelp() {
  const { session } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [tried, setTried] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [hospital, setHospital] = useState('');
  const [pincode, setPincode] = useState('');
  const [areaStatus, setAreaStatus] = useState<'idle' | 'checking' | 'served' | 'not_served'>('idle');
  const [areaLabel, setAreaLabel] = useState('');
  const [meetAddress, setMeetAddress] = useState('');
  const [service, setService] = useState<string>(SERVICES[0]);
  const [urgency, setUrgency] = useState<string>(URGENCIES[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const [family, setFamily] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  // Seed from session like web does + load family for 1-tap select
  useEffect(() => {
    if (!session) return;
    const name = (session.user.user_metadata?.full_name || session.user.user_metadata?.name) as string | undefined;
    if (name) setCustomerName((v) => v || name);
    if (session.user.email) setEmail((v) => v || session.user.email!);
    supabase.from('patients').select('id, full_name').eq('customer_user_id', session.user.id).is('deleted_at', null).order('created_at', { ascending: true }).limit(20)
      .then(({ data }) => setFamily((data as any) || []));
  }, [session]);

  useEffect(() => {
    if (selectedFamilyId) {
      const m = family.find((f) => f.id === selectedFamilyId);
      if (m) setPatientName(m.full_name);
    }
  }, [selectedFamilyId, family]);

  // Live pincode check
  useEffect(() => {
    if (!isValidPincode(pincode)) {
      setAreaStatus('idle');
      setAreaLabel('');
      return;
    }
    let cancelled = false;
    setAreaStatus('checking');
    checkPincodeServed(supabase, pincode).then(({ served, area }) => {
      if (cancelled) return;
      setAreaStatus(served ? 'served' : 'not_served');
      setAreaLabel(area?.area_name || (area as any)?.city || '');
    });
    return () => {
      cancelled = true;
    };
  }, [pincode]);

  const step1Valid = customerName.trim() !== '' && isValidIndianMobile(phone) && /\S+@\S+\.\S+/.test(email);
  const step2Valid = patientName.trim() !== '' && hospital.trim() !== '' && areaStatus === 'served';
  const isStepValid = (s: number) => (s === 1 ? step1Valid : s === 2 ? step2Valid : true);

  const next = async () => {
    if (step < TOTAL_STEPS) {
      if (!isStepValid(step)) {
        setTried(true);
        return;
      }
      setTried(false);
      setStep((n) => n + 1);
      return;
    }
    // step 3 → submit
    if (!session) {
      Alert.alert('Sign in required', 'Please sign in to request urgent help.');
      router.push('/' as any);
      return;
    }
    if (areaStatus !== 'served') {
      Alert.alert('Not served', 'Sorry, we don’t serve this pincode yet. Caresy currently operates in Noida & Greater Noida.');
      return;
    }
    setSubmitting(true);
    try {
      // Reuse patient like web does (ilike full_name)
      const { data: existing } = await supabase
        .from('patients')
        .select('id')
        .eq('customer_user_id', session.user.id)
        .ilike('full_name', patientName.trim())
        .is('deleted_at', null)
        .limit(1);
      let patientId = (existing as any)?.[0]?.id as string | undefined;
      if (!patientId) {
        const { data: pd, error: pe } = await supabase
          .from('patients')
          .insert({ customer_user_id: session.user.id, full_name: patientName.trim() })
          .select()
          .single();
        if (pe) throw pe;
        patientId = (pd as any).id;
      }

      const { data: loc, error: le } = await supabase
        .from('locations')
        .insert({
          customer_user_id: session.user.id,
          title: hospital,
          address_line_1: meetAddress.trim() || hospital,
          city: areaLabel || 'Noida',
          state: 'Uttar Pradesh',
          pincode: pincode.trim(),
          latitude: null,
          longitude: null,
        })
        .select()
        .single();
      if (le) throw le;

      const { data: booking, error: be } = await supabase
        .from('bookings')
        .insert({
          customer_user_id: session.user.id,
          patient_id: patientId,
          pickup_location_id: (loc as any).id,
          service_type: 'HOSPITAL_COMPANION',
          booking_type: 'INSTANT',
          status: 'PENDING',
          special_instructions: notes || '',
          service_metadata: {
            customerName: customerName.trim(),
            phone: toE164(phone),
            email: email.trim(),
            urgency,
            category: service,
            eveningSurchargePaise: eveningSurchargePaise(new Date().getHours()),
          },
        })
        .select()
        .single();
      if (be) throw be;
      setSuccessRef((booking as any).reference_code || (booking as any).id);
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reduceMotion = useReducedMotion();
  const back = () => {
    if (step > 1) setStep((n) => n - 1);
    else router.back();
  };

  if (successRef) {
    return (
      <Animated.View entering={reduceMotion ? FadeIn.duration(220) : FadeInRight.duration(380).springify().damping(20).stiffness(260)} style={s.success}>
        <Stack.Screen options={{ headerShown: true, title: 'Request received' }} />
        <View style={s.tick}>
          <Txt variant="h1" color={color.onGreen}>✓</Txt>
        </View>
        <Txt variant="h1" color={color.greenDeep} style={s.center}>Request received!</Txt>
        <Txt variant="body" color={color.muted} style={s.center}>Operations will call {phone} within a few minutes.</Txt>
        <Card level="raised" style={s.refBadge}>
          <Overline>Reference</Overline>
          <Txt variant="title" color={color.greenDeep}>{successRef}</Txt>
        </Card>
        <Button
          title="Chat on WhatsApp"
          onPress={() => Linking.openURL(`https://wa.me/919717500225?text=Hi,%20my%20quick%20help%20reference%20is%20${successRef}`)}
          style={s.successBtn}
        />
        <Button title="View My Bookings" variant="secondary" onPress={() => router.replace('/my-bookings' as any)} style={s.successBtn} />
      </Animated.View>
    );
  }

  const footer = (
    <View style={s.footer}>
      <Button title="Back" variant="secondary" onPress={back} disabled={submitting} style={s.back} />
      <Button title={step < TOTAL_STEPS ? 'Continue' : 'Send request'} onPress={next} loading={submitting} style={s.cta} />
    </View>
  );

  const nameErr = tried && !customerName.trim() ? 'Required' : undefined;
  const phoneErr = tried && !isValidIndianMobile(phone) ? 'Enter 10-digit mobile' : undefined;
  const emailErr = tried && !/\S+@\S+\.\S+/.test(email) ? 'Enter valid email' : undefined;
  const patientErr = tried && step === 2 && !patientName.trim() ? 'Required' : undefined;
  const hospitalErr = tried && step === 2 && !hospital.trim() ? 'Required' : undefined;
  const pincodeErr =
    tried && step === 2 && areaStatus !== 'served'
      ? areaStatus === 'checking'
        ? 'Checking…'
        : areaStatus === 'not_served'
          ? 'We don’t serve this pincode — Noida & Greater Noida only'
          : 'Enter 6-digit pincode'
      : undefined;
  const pincodeHint =
    areaStatus === 'checking'
      ? 'Checking availability…'
      : areaStatus === 'served'
        ? `✓ We serve ${areaLabel || 'this area'}`
        : areaStatus === 'not_served'
          ? '✗ Not served — Noida & Greater Noida only'
          : 'We currently serve Noida & Greater Noida only.';
  const pincodeHintColor =
    areaStatus === 'served' ? color.success : areaStatus === 'not_served' ? color.terracotta : color.muted;

  return (
    <FormScreen footer={footer}>
      <Stack.Screen options={{ headerShown: true, title: 'Quick Help' }} />
      <View style={s.progressRow}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[s.progressSeg, i < step ? s.progressOn : s.progressOff]} />
        ))}
      </View>
      <Animated.View key={`qh-heading-${step}`} entering={reduceMotion ? FadeIn.duration(200) : FadeInRight.duration(320).springify().damping(20).stiffness(260)} exiting={FadeOutLeft.duration(180)} style={s.heading}>
        <Overline>Step {step} of {TOTAL_STEPS}</Overline>
        <Txt variant="h1" color={color.greenDeep}>{STEP_TITLES[step - 1]}</Txt>
        {step === 1 ? <Txt variant="body" color={color.muted}>We’ll call you back within minutes. Share the minimum.</Txt> : null}
      </Animated.View>

      {step === 1 && (
        <Animated.View key="qh-1" entering={reduceMotion ? FadeIn.duration(220) : FadeInRight.duration(340).springify().damping(20).stiffness(260)} exiting={FadeOutLeft.duration(180)} style={s.stepBody}>
          <Field label="Your name" value={customerName} onChangeText={setCustomerName} placeholder="Ananya Rao" error={nameErr} />
          <Field label="Mobile number" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" keyboardType="phone-pad" error={phoneErr} />
          <Field label="Email address" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" error={emailErr} />
        </Animated.View>
      )}

      {step === 2 && (
        <Animated.View key="qh-2" entering={reduceMotion ? FadeIn.duration(220) : FadeInRight.duration(340).springify().damping(20).stiffness(260)} exiting={FadeOutLeft.duration(180)} style={s.stepBody}>
          <Field label="Patient name" value={patientName} onChangeText={setPatientName} placeholder="Ramesh Kumar" error={patientErr} />
          <Field label="Hospital or clinic" value={hospital} onChangeText={setHospital} placeholder="e.g. Max Hospital, Noida" error={hospitalErr} />
          <Field label="Pincode" value={pincode} onChangeText={(v) => setPincode(v.replace(/\D/g, '').slice(0, 6))} placeholder="201301" keyboardType="number-pad" error={pincodeErr} />
          <Txt variant="caption" color={pincodeHintColor}>{pincodeHint}</Txt>
          <Field label="Meeting point (optional)" value={meetAddress} onChangeText={setMeetAddress} placeholder="Main gate / reception" />
          <Txt variant="h2" color={color.ink}>What is happening now?</Txt>
          <ChipRow>
            {SERVICES.map((sv) => (
              <Chip key={sv} label={sv} selected={service === sv} onPress={() => setService(sv)} />
            ))}
          </ChipRow>
        </Animated.View>
      )}

      {step === 3 && (
        <Animated.View key="qh-3" entering={reduceMotion ? FadeIn.duration(220) : FadeInRight.duration(340).springify().damping(20).stiffness(260)} exiting={FadeOutLeft.duration(180)} style={s.stepBody}>
          <Txt variant="h2" color={color.ink}>When should we call?</Txt>
          <ChipRow>
            {URGENCIES.map((u) => (
              <Chip key={u} label={u} selected={urgency === u} onPress={() => setUrgency(u)} />
            ))}
          </ChipRow>
          <Field label="Short note (optional)" value={notes} onChangeText={setNotes} placeholder="Patient location, appointment time, mobility needs, emergency contact" multiline />
          <Card level="raised" style={s.boundary}>
            <Txt variant="title" color={color.ink}>Emergency boundary</Txt>
            <Txt variant="body" color={color.muted}>If the patient condition is worsening, contact hospital emergency services first. Caresy is assistance and coordination, not emergency medical care.</Txt>
          </Card>
        </Animated.View>
      )}
    </FormScreen>
  );
}

const s = StyleSheet.create({
  center: { textAlign: 'center' },
  stepBody: { gap: space.lg },
  progressRow: { flexDirection: 'row', gap: space.xs },
  progressSeg: { flex: 1, height: 4, borderRadius: radius.pill },
  progressOn: { backgroundColor: color.green },
  progressOff: { backgroundColor: color.line },
  heading: { gap: space.xs },
  footer: { flexDirection: 'row', gap: space.md, padding: space.lg, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.surface },
  back: { flex: 1 },
  cta: { flex: 2 },
  boundary: { gap: space.xs, backgroundColor: color.urgentBg, borderColor: color.warning },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  tick: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: color.success, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  refBadge: { backgroundColor: color.greenTint, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, marginVertical: space.sm, alignItems: 'center' },
  successBtn: { alignSelf: 'stretch' },
});
