import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { formatINR, priceForMinutes, eveningSurchargePaise } from '@caresy/utils/pricing';
import { availableSlots } from '@caresy/utils/slots';
import { toE164, isValidIndianMobile } from '@caresy/utils/phone';
import { checkPincodeServed, isValidPincode } from '@caresy/utils';
import { Button, Card, Chip, ChipRow, Field, FormScreen, Overline, Screen, Txt } from '../components/ui';
import { color, radius, space } from '../lib/theme';
import { HOSPITALS, pincodeForArea } from '../lib/hospitals';

// expo deps — dynamic require keeps tsc green until plugin native rebuild
let Location: any = null;
let ImagePicker: any = null;
try { Location = require('expo-location'); } catch {}
try { ImagePicker = require('expo-image-picker'); } catch {}

// Business rules mirror apps/website/src/app/booking (data contract, not layout).
const SERVICES = [
  { key: 'HOSPITAL_COMPANION', name: 'Doctor appointment', desc: 'OPD visit — queues, consultation, paperwork, pharmacy.', hours: 2 },
  { key: 'MEDICINE_PICKUP', name: 'Medicine pickup', desc: 'Collect a prescription and deliver it home.', hours: 1 },
  { key: 'APPOINTMENT_ASSISTANCE', name: 'Procedure or day-care', desc: 'Admission, surgery or dialysis — someone stays the whole time.', hours: 8 },
  { key: 'SAFE_RETURN', name: 'Elderly care visit', desc: 'Unhurried company for an older parent through a long visit.', hours: 4 },
] as const;

const DURATIONS = [1, 2, 4, 6, 8];
const durationLabel = (h: number) => (h === 8 ? 'Full day' : `${h} hour${h > 1 ? 's' : ''}`);

const TRANSPORT_MODES = [
  { key: 'NONE', label: "We'll make our own way" },
  { key: 'COMPANION_ARRANGED', label: 'Companion arranges a cab' },
  { key: 'CUSTOMER_VEHICLE', label: 'Companion drives our vehicle' },
] as const;
const LANGUAGES = ['No preference', 'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada'];
const CARE_NEEDS = ['Wheelchair', 'Walking assistance', 'Medicine collection'];
const TOTAL_STEPS = 4;
const STEP_TITLES = ['What do you need?', 'Where?', 'Who is it for?', 'When?'];

interface SavedPatient { id: string; full_name: string; age: number | null; emergency_contact_phone: string | null; }

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

export default function Booking() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [tried, setTried] = useState(false);
  const [serviceKey, setServiceKey] = useState<string>('HOSPITAL_COMPANION');
  const [durationHours, setDurationHours] = useState(2);
  const [transportMode, setTransportMode] = useState<string>('NONE');
  const [careNeeds, setCareNeeds] = useState<string[]>([]);

  const [hospital, setHospital] = useState('');
  const [pincode, setPincode] = useState('');
  const [department, setDepartment] = useState('');
  const [doctor, setDoctor] = useState('');
  const [meetAddress, setMeetAddress] = useState('');
  const [meetMode, setMeetMode] = useState<'home' | 'hospital' | 'custom'>('custom');
  const [hospitalFocused, setHospitalFocused] = useState(false);
  const [pincodeCheck, setPincodeCheck] = useState<{ served: boolean; area?: string; city?: string } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [docUri, setDocUri] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);

  const [savedPatients, setSavedPatients] = useState<SavedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergency, setEmergency] = useState('');
  const [language, setLanguage] = useState('No preference');
  const [notes, setNotes] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const days = useMemo(() => nextDays(), []);
  const slots = availableSlots(date);
  const chosenService = SERVICES.find((s) => s.key === serviceKey) || SERVICES[0];
  const basePaise = priceForMinutes(durationHours * 60);
  const eveningPaise = time ? eveningSurchargePaise(parseInt(time, 10)) : 0;
  const totalPaise = basePaise + eveningPaise;
  const serviceLabel = `${chosenService.name} · ${durationLabel(durationHours)}`;

  useEffect(() => { setDurationHours(chosenService.hours); }, [serviceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session) return;
    supabase.from('patients').select('id, full_name, age, emergency_contact_phone').eq('customer_user_id', session.user.id)
      .then(({ data }) => setSavedPatients((data as SavedPatient[]) || []));
  }, [session]);

  // Live pincode served check — mirrors web checkPincodeServed
  useEffect(() => {
    const pin = pincode.trim();
    if (!isValidPincode(pin)) { setPincodeCheck(null); return; }
    let alive = true;
    checkPincodeServed(supabase as any, pin).then((r) => {
      if (!alive) return;
      setPincodeCheck(r.served ? { served: true, area: r.area?.area_name || undefined, city: r.area?.city } : { served: false });
    });
    return () => { alive = false; };
  }, [pincode]);

  // Keep meetAddress in sync with meetMode
  useEffect(() => {
    if (meetMode === 'hospital' && hospital) setMeetAddress(hospital);
    else if (meetMode === 'home' && coords) setMeetAddress(`Current location · ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
  }, [meetMode, hospital, coords]);

  const requestLocation = async () => {
    if (!Location) { setLocError('Location module not installed — run npm install then rebuild'); return false; }
    setLocLoading(true); setLocError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocError('Permission denied — enter address manually'); return false; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy ? Location.Accuracy.Balanced : 3 });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      return true;
    } catch (e: any) {
      setLocError(e?.message || 'Could not get location');
      return false;
    } finally { setLocLoading(false); }
  };

  useEffect(() => {
    if (meetMode === 'home' && !coords && !locLoading && Location) { requestLocation(); }
  }, [meetMode]);

  const pickSaved = (p: SavedPatient) => {
    setSelectedPatientId(p.id); setPatientName(p.full_name);
    setAge(p.age != null ? String(p.age) : ''); setEmergency(p.emergency_contact_phone ?? '');
  };
  const toggleNeed = (n: string) => setCareNeeds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  // Field-level errors surface only after a Continue attempt on that step.
  const hospitalErr = tried && step === 2 && !hospital.trim() ? 'Enter the hospital or clinic name.' : null;
  const pincodeErr = tried && step === 2 && !isValidPincode(pincode.trim()) ? 'Enter a valid 6-digit pincode.' : null;
  const nameErr = tried && step === 3 && !patientName.trim() ? 'Enter the patient name.' : null;
  const phoneErr = tried && step === 3 && !isValidIndianMobile(phone) ? 'Enter a valid 10-digit mobile number.' : null;

  const stepError = (): string | null => {
    if (step === 2) return (!hospital.trim() && 'hospital') || (!isValidPincode(pincode.trim()) && 'pincode') ? ' ' : null;
    if (step === 3) return (!patientName.trim() && 'name') || (!isValidIndianMobile(phone) && 'phone') ? ' ' : null;
    if (step === 4) {
      if (!date || !time) return 'Pick a date and a time slot.';
      if (!availableSlots(date).includes(time)) return 'That slot has just passed. Pick another.';
    }
    return null;
  };

  const next = async () => {
    setTried(true);
    const err = stepError();
    if (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err.trim()) Alert.alert('Almost there', err);
      return;
    }
    // If At home and no coords yet, try to get location before advancing from step 2
    if (step === 2 && meetMode === 'home' && !coords) {
      const ok = await requestLocation();
      if (!ok && !coords) {
        // Allow continuing with manual address fallback
        Alert.alert('Location', 'We could not get your location. Please check the meeting address field and continue.');
      }
    }
    Haptics.selectionAsync();
    setTried(false);
    if (step < TOTAL_STEPS) setStep((n) => n + 1);
    else submit();
  };
  const back = () => { Haptics.selectionAsync(); setTried(false); setStep((n) => n - 1); };

  const submit = async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const uid = session.user.id;
      let patientId = selectedPatientId;
      if (patientId) {
        await supabase.from('patients').update({
          full_name: patientName, age: age ? parseInt(age) : null,
          emergency_contact_phone: emergency ? toE164(emergency) : null,
        }).eq('id', patientId);
      } else {
        const { data, error } = await supabase.from('patients').insert({
          customer_user_id: uid, full_name: patientName, age: age ? parseInt(age) : null,
          emergency_contact_phone: emergency ? toE164(emergency) : null,
        }).select().single();
        if (error) throw error;
        patientId = data.id;
      }

      const { data: loc, error: locErr } = await supabase.from('locations').insert({
        customer_user_id: uid, title: hospital, address_line_1: meetAddress.trim() || hospital,
        city: 'Noida', state: 'Uttar Pradesh', pincode: pincode.trim(),
        latitude: meetMode === 'home' && coords ? coords.latitude : null,
        longitude: meetMode === 'home' && coords ? coords.longitude : null,
      }).select().single();
      if (locErr) throw locErr;

      const scheduledStart = new Date(`${date}T${time}:00`);
      const { data: bk, error: bkErr } = await supabase.from('bookings').insert({
        customer_user_id: uid, patient_id: patientId, pickup_location_id: loc.id,
        service_type: chosenService.key, booking_type: 'SCHEDULED', status: 'PENDING',
        transport_mode: transportMode, scheduled_start_time: scheduledStart.toISOString(),
        special_instructions: notes || '', estimated_duration_minutes: durationHours * 60,
        service_metadata: {
          customerEmail: email, customerPhone: toE164(phone), doctor, department, language, careNeeds,
          originalService: serviceLabel, quotedPaise: totalPaise, eveningSurchargePaise: eveningPaise,
        },
      }).select().single();
      if (bkErr) throw bkErr;

      // Patient doc upload (Phase 4) — best-effort, booking already succeeded
      if (docUri && patientId) {
        try {
          setDocUploading(true);
          const resp = await fetch(docUri);
          const blob = await resp.blob();
          const ext = docUri.split('.').pop()?.split('?')[0] || 'jpg';
          const path = `${patientId}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('patient-docs').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
          if (!upErr) {
            await supabase.from('patient_documents').insert({ patient_id: patientId, booking_id: bk.id, doc_type: 'OTHER', title: 'Booking attachment', file_path: path });
          }
        } catch {}
        setDocUploading(false);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessRef(bk.reference_code);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not book', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <Screen />;
  if (!session) return <Redirect href="/" />;

  if (successRef) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Booked', headerBackVisible: false }} />
        <View style={s.success}>
          <View style={s.tick}><Txt variant="display" color={color.onGreen}>✓</Txt></View>
          <Txt variant="h1" color={color.greenDeep}>Request sent</Txt>
          <Txt variant="body" color={color.muted} style={s.center}>We'll confirm a companion shortly and notify you.</Txt>
          <View style={s.refBadge}><Txt variant="label" color={color.greenDeep}>Ref {successRef}</Txt></View>
          <Button title="View my bookings" onPress={() => router.replace('/my-bookings')} style={s.successBtn} />
          <Button title="Back home" variant="secondary" onPress={() => router.replace('/')} style={s.successBtn} />
        </View>
      </Screen>
    );
  }

  const footer = (
    <View style={s.footer}>
      {step > 1 ? <Button title="Back" variant="secondary" onPress={back} disabled={submitting} style={s.back} /> : <View style={s.back} />}
      <Button
        title={step < TOTAL_STEPS ? 'Continue' : 'Confirm booking'}
        onPress={next}
        loading={submitting}
        style={s.cta}
      />
    </View>
  );

  return (
    <FormScreen footer={footer}>
      <Stack.Screen options={{ headerShown: true, title: 'Book care' }} />

      {/* progress */}
      <View style={s.progressRow}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[s.progressSeg, i < step ? s.progressOn : s.progressOff]} />
        ))}
      </View>
      <View style={s.heading}>
        <Overline>Step {step} of {TOTAL_STEPS}</Overline>
        <Txt variant="h1" color={color.greenDeep}>{STEP_TITLES[step - 1]}</Txt>
      </View>

      {step === 1 && (
        <>
          {SERVICES.map((sv) => {
            const on = serviceKey === sv.key;
            return (
              <Card key={sv.key} onPress={() => setServiceKey(sv.key)} style={[s.optCard, on ? s.optOn : s.optOff]}>
                <View style={[s.optAccent, on ? s.optAccentOn : s.optAccentOff]} />
                <Txt variant="title" color={on ? color.greenDeep : color.ink}>{sv.name}</Txt>
                <Txt variant="body" color={color.muted}>{sv.desc}</Txt>
                <Txt variant="caption" color={color.faint}>{on ? 'Selected' : 'Tap to select'}</Txt>
              </Card>
            );
          })}
          <Txt variant="h2" color={color.ink}>How long?</Txt>
          <ChipRow>
            {DURATIONS.map((h) => <Chip key={h} label={durationLabel(h)} selected={durationHours === h} onPress={() => setDurationHours(h)} />)}
          </ChipRow>
          <Txt variant="title" color={color.greenDeep}>{durationLabel(durationHours)} · {formatINR(basePaise)}</Txt>
        </>
      )}

      {step === 2 && (
        <>
          <Field
            label="Hospital / clinic"
            value={hospital}
            onChangeText={setHospital}
            onFocus={() => setHospitalFocused(true)}
            onBlur={() => setTimeout(() => setHospitalFocused(false), 150)}
            placeholder="Search — e.g. Max Hospital, Noida"
            error={hospitalErr}
          />
          {hospitalFocused && (
            <View style={s.suggestBox}>
              {(hospital.trim()
                ? HOSPITALS.filter((h) => `${h.name} ${h.area}`.toLowerCase().includes(hospital.toLowerCase())).slice(0, 6)
                : HOSPITALS.slice(0, 6)
              ).map((h) => (
                <Pressable
                  key={`${h.name}-${h.area}`}
                  onPress={() => {
                    setHospital(h.name);
                    const pin = pincodeForArea(h.area);
                    if (pin && !pincode.trim()) setPincode(pin);
                    setHospitalFocused(false);
                  }}
                  style={s.suggestRow}
                >
                  <Txt variant="title" color={color.ink} numberOfLines={1}>{h.name}</Txt>
                  <Txt variant="caption" color={color.muted}>{h.area}</Txt>
                </Pressable>
              ))}
            </View>
          )}
          <Field label="Pincode" value={pincode} onChangeText={setPincode} placeholder="201301" keyboardType="number-pad" error={pincodeErr} />
          {pincodeCheck && (
            <View style={[s.pincodeBadge, pincodeCheck.served ? s.pincodeOk : s.pincodeNo]}>
              <Txt variant="caption" color={pincodeCheck.served ? color.greenDeep : color.terracotta}>
                {pincodeCheck.served ? `✓ Serves ${pincodeCheck.area || pincodeCheck.city || 'this area'}` : '✗ We don\'t serve this pincode yet — message us on WhatsApp to confirm'}
              </Txt>
            </View>
          )}
          {locError ? <Txt variant="caption" color={color.terracotta}>{locError}</Txt> : null}
          {coords ? <Txt variant="caption" color={color.greenDeep}>✓ Location captured · {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Txt> : null}
          {locLoading ? <Txt variant="caption" color={color.muted}>Getting your location…</Txt> : null}
          <Field label="Department (optional)" value={department} onChangeText={setDepartment} placeholder="Cardiology" />
          <Field label="Doctor (optional)" value={doctor} onChangeText={setDoctor} placeholder="Dr. Sharma" />
          <View style={s.meetGrid}>
            {[
              { key: 'home', label: 'At home', sub: 'Use my location', tint: color.greenTint },
              { key: 'hospital', label: 'At hospital', sub: hospital || 'Hospital address', tint: color.card },
              { key: 'custom', label: 'Custom address', sub: 'Enter manually', tint: color.surface },
            ].map((o) => {
              const on = meetMode === o.key;
              return (
                <Card key={o.key} onPress={() => setMeetMode(o.key as any)} style={[s.meetCard, on && s.optOn, { backgroundColor: on ? color.greenTint : o.tint }]}>
                  <View style={[s.meetAccent, on && s.meetAccentOn]} />
                  <Txt variant="title" color={on ? color.greenDeep : color.ink}>{o.label}</Txt>
                  <Txt variant="caption" color={color.muted} numberOfLines={1}>{o.sub}</Txt>
                </Card>
              );
            })}
          </View>
          <Field label="Meeting address" value={meetAddress} onChangeText={setMeetAddress} placeholder={meetMode === 'home' ? 'House no., street, landmark' : meetMode === 'hospital' ? (hospital || 'Hospital address') : 'Main gate / reception'} />
          <Txt variant="h2" color={color.ink}>Getting there</Txt>
          {TRANSPORT_MODES.map((m) => {
            const on = transportMode === m.key;
            return (
              <Card key={m.key} onPress={() => setTransportMode(m.key)} style={[s.optCard, on ? s.optOn : s.optOff]}>
                <View style={[s.optAccent, on ? s.optAccentOn : s.optAccentOff]} />
                <Txt variant="title" color={on ? color.greenDeep : color.ink}>{m.label}</Txt>
              </Card>
            );
          })}
        </>
      )}

      {step === 3 && (
        <>
          {savedPatients.length > 0 && (
            <ChipRow>
              {savedPatients.map((p) => <Chip key={p.id} label={p.full_name} selected={selectedPatientId === p.id} onPress={() => pickSaved(p)} />)}
              <Chip label="+ New" selected={false} onPress={() => { setSelectedPatientId(null); setPatientName(''); setAge(''); setEmergency(''); }} />
            </ChipRow>
          )}
          <Field label="Patient name" value={patientName} onChangeText={setPatientName} placeholder="Full name" error={nameErr} />
          <Field label="Age (optional)" value={age} onChangeText={setAge} placeholder="72" keyboardType="number-pad" />
          <Field label="Your mobile" value={phone} onChangeText={setPhone} placeholder="10-digit number" keyboardType="phone-pad" error={phoneErr} />
          <Field label="Email (optional)" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" />
          <Field label="Emergency contact (optional)" value={emergency} onChangeText={setEmergency} placeholder="10-digit number" keyboardType="phone-pad" />
          <Txt variant="h2" color={color.ink}>Language preference</Txt>
          <ChipRow>{LANGUAGES.map((l) => <Chip key={l} label={l} selected={language === l} onPress={() => setLanguage(l)} />)}</ChipRow>
          <Txt variant="h2" color={color.ink}>Care needs (optional)</Txt>
          <ChipRow>{CARE_NEEDS.map((n) => <Chip key={n} label={n} selected={careNeeds.includes(n)} onPress={() => toggleNeed(n)} />)}</ChipRow>
          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Anything the companion should know" multiline />
          <Txt variant="h2" color={color.ink}>Patient document (optional)</Txt>
          <Card style={s.docCard}>
            {docUri ? <Txt variant="caption" color={color.greenDeep}>✓ Selected: {docUri.split('/').pop()}</Txt> : <Txt variant="caption" color={color.muted}>Prescription, report or receipt — visible to your companion circle.</Txt>}
            <View style={s.docRow}>
              <Button
                title={docUri ? 'Change photo' : 'Pick photo'}
                variant="secondary"
                onPress={async () => {
                  if (!ImagePicker) { Alert.alert('Not ready', 'Rebuild the dev client to enable photo picker'); return; }
                  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to attach a document'); return; }
                  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
                  if (!res.canceled && res.assets?.[0]?.uri) setDocUri(res.assets[0].uri);
                }}
                style={s.docBtn}
              />
              {docUri ? <Button title="Remove" variant="secondary" onPress={() => setDocUri(null)} style={s.docBtn} /> : null}
            </View>
          </Card>
        </>
      )}

      {step === 4 && (
        <>
          <ChipRow>
            {days.map((d) => <Chip key={d.iso} label={d.label} selected={date === d.iso} onPress={() => { setDate(d.iso); setTime(''); }} />)}
          </ChipRow>
          {date ? (
            slots.length ? (
              <>
                <Txt variant="h2" color={color.ink}>Time slot</Txt>
                <ChipRow>{slots.map((t) => <Chip key={t} label={fmtSlot(t)} selected={time === t} onPress={() => setTime(t)} />)}</ChipRow>
              </>
            ) : <Txt variant="body" color={color.muted}>No slots left that day. Pick another.</Txt>
          ) : <Txt variant="body" color={color.muted}>Choose a day to see available slots.</Txt>}

          <Card style={s.summary}>
            <Txt variant="title" color={color.ink}>{serviceLabel}</Txt>
            {hospital ? <Txt variant="body" color={color.muted}>{hospital}</Txt> : null}
            {time ? <Txt variant="body" color={color.muted}>{days.find((d) => d.iso === date)?.label} · {fmtSlot(time)}</Txt> : null}
            <Txt variant="h1" color={color.greenDeep} style={s.summaryAmount}>{formatINR(totalPaise)}</Txt>
            {eveningPaise > 0 ? <Txt variant="caption" color={color.muted}>Includes evening surcharge</Txt> : null}
            <Txt variant="caption" color={color.faint}>Estimate. Final amount is metered by actual companion time.</Txt>
          </Card>
        </>
      )}
    </FormScreen>
  );
}

const s = StyleSheet.create({
  center: { textAlign: 'center' },
  progressRow: { flexDirection: 'row', gap: space.xs },
  progressSeg: { flex: 1, height: 4, borderRadius: radius.pill },
  progressOn: { backgroundColor: color.green },
  progressOff: { backgroundColor: color.line },
  heading: { gap: space.xs },
  optCard: { gap: space.xs, borderWidth: 1.5, borderColor: 'transparent', overflow: 'hidden' },
  optAccent: { height: 4, marginHorizontal: -space.lg, marginTop: -space.lg, marginBottom: space.xs },
  optAccentOn: { backgroundColor: color.green },
  optAccentOff: { backgroundColor: color.line },
  optOn: { borderColor: color.green, backgroundColor: color.greenTint },
  optOff: { borderColor: color.line, backgroundColor: color.surface },
  summary: { marginTop: space.md, gap: space.xs },
  summaryAmount: { marginTop: space.sm },
  footer: { flexDirection: 'row', gap: space.md, padding: space.lg, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.surface },
  back: { flex: 1 },
  cta: { flex: 2 },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  tick: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: color.success, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  refBadge: { backgroundColor: color.greenTint, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, marginVertical: space.sm },
  successBtn: { alignSelf: 'stretch' },
  suggestBox: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, overflow: 'hidden', marginTop: -space.sm },
  suggestRow: { paddingVertical: space.sm, paddingHorizontal: space.md, borderBottomWidth: 1, borderBottomColor: color.line, gap: 2 },
  pincodeBadge: { marginTop: -space.sm, paddingVertical: 6, paddingHorizontal: space.md, borderRadius: radius.sm },
  pincodeOk: { backgroundColor: color.greenTint },
  pincodeNo: { backgroundColor: color.urgentBg },
  meetGrid: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  meetCard: { flexBasis: '30%', flexGrow: 1, gap: 4, overflow: 'hidden', minWidth: 96 },
  meetAccent: { height: 4, marginHorizontal: -space.lg, marginTop: -space.lg, marginBottom: space.xs, backgroundColor: color.line },
  meetAccentOn: { backgroundColor: color.green },
  meetLabel: { marginTop: space.sm },
  meetHint: { gap: space.sm, backgroundColor: color.card },
  docCard: { gap: space.sm },
  docRow: { flexDirection: 'row', gap: space.sm },
  docBtn: { flex: 1 },
});
