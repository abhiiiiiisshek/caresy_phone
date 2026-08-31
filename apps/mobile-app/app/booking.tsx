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
import { BottomSheet, Button, Card, Chip, ChipRow, Field, FieldButton, FormScreen, Overline, Screen, Stagger, SuccessScreen, Txt } from '../components/ui';
import { color, radius, space } from '../lib/theme';
import { HOSPITALS, pincodeForArea } from '../lib/hospitals';
import { useCurrentLocation } from '../lib/useLocation';

import * as ImagePicker from 'expo-image-picker';

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
  const { coords, loading: locLoading, error: locError, blocked: locBlocked, request: requestLocation, openSettings: openLocationSettings } = useCurrentLocation();
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
  const [serviceSheet, setServiceSheet] = useState(false);
  const [transportSheet, setTransportSheet] = useState(false);
  const [patientSheet, setPatientSheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);

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

  // Live pincode served check — debounced (efficiency: avoids query on every keystroke)
  useEffect(() => {
    const pin = pincode.trim();
    if (!isValidPincode(pin)) { setPincodeCheck(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      checkPincodeServed(supabase as any, pin).then((r) => {
        if (!alive) return;
        setPincodeCheck(r.served ? { served: true, area: r.area?.area_name || undefined, city: r.area?.city } : { served: false });
      });
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [pincode]);

  // Keep meetAddress in sync with meetMode
  useEffect(() => {
    if (meetMode === 'hospital' && hospital) setMeetAddress(hospital);
    else if (meetMode === 'home' && coords) setMeetAddress(`Current location · ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
  }, [meetMode, hospital, coords]);

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
    // "At home" needs either a captured location or a typed address — don't
    // silently re-trigger the OS permission prompt on every Continue tap.
    if (step === 2 && meetMode === 'home' && !coords && !meetAddress.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Meeting address needed', 'Tap "Share current location" above, or type the address by hand.');
      return;
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

  const reduceMotion = false; // RN 0.86: reanimated removed, fallback to full motion (respect via AccessibilityInfo if needed)
  if (authLoading) return <Screen />;
  if (!session) return <Redirect href="/" />;

  if (successRef) {
    return (
      <SuccessScreen
        headerTitle="Booked"
        title="Request sent"
        body="We'll confirm a companion shortly and notify you."
        refCode={successRef}
        refLabel="Ref"
        primaryAction={{ title: 'View my bookings', onPress: () => router.replace('/my-bookings') }}
        secondaryAction={{ title: 'Back home', onPress: () => router.replace('/') }}
      />
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

      {/* progress — spring width per §4 */}
      <View style={s.progressRow}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[s.progressSeg, i < step ? s.progressOn : s.progressOff]} />
        ))}
      </View>
      <Stagger key={`heading-${step}`}>
        <Overline>Step {step} of {TOTAL_STEPS}</Overline>
        <Txt variant="h1" color={color.greenDeep}>{STEP_TITLES[step - 1]}</Txt>
      </Stagger>

      {step === 1 && (
        <Stagger key="step-1">
          <FieldButton
            label="Service"
            value={chosenService.name}
            placeholder="Choose a service"
            onPress={() => setServiceSheet(true)}
          />
          <Card level="raised" style={[s.optCard, s.optOn]}>
            <View style={[s.optAccent, s.optAccentOn]} />
            <Txt variant="title" color={color.greenDeep}>{chosenService.name}</Txt>
            <Txt variant="body" color={color.muted}>{chosenService.desc}</Txt>
          </Card>
          <BottomSheet
            visible={serviceSheet}
            title="Choose a service"
            selectedKey={serviceKey}
            onSelect={setServiceKey}
            onClose={() => setServiceSheet(false)}
            options={SERVICES.map((sv) => ({ key: sv.key, label: sv.name, desc: sv.desc }))}
          />
          <Txt variant="h2" color={color.ink}>How long?</Txt>
          <ChipRow>
            {DURATIONS.map((h) => <Chip key={h} label={durationLabel(h)} selected={durationHours === h} onPress={() => setDurationHours(h)} />)}
          </ChipRow>
          <Txt variant="title" color={color.greenDeep}>{durationLabel(durationHours)} · {formatINR(basePaise)}</Txt>
        </Stagger>
      )}

      {step === 2 && (
        <Stagger key="step-2">
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
          <Field label="Department (optional)" value={department} onChangeText={setDepartment} placeholder="Cardiology" />
          <Field label="Doctor (optional)" value={doctor} onChangeText={setDoctor} placeholder="Dr. Sharma" />
          <View style={s.meetGrid}>
            {[
              { key: 'home', label: 'At home', sub: 'Use my location', tint: color.card },
              { key: 'hospital', label: 'At hospital', sub: hospital || 'Hospital address', tint: color.card },
              { key: 'custom', label: 'Custom address', sub: 'Enter manually', tint: color.surface },
            ].map((o) => {
              const on = meetMode === o.key;
              return (
                <Card
                  key={o.key}
                  onPress={() => {
                    setMeetMode(o.key as any);
                    if (o.key === 'home' && !coords) requestLocation();
                  }}
                  style={[s.meetCard, on && s.optOn, { backgroundColor: on ? color.greenTint : o.tint }]}
                >
                  <View style={[s.meetAccent, on && s.meetAccentOn]} />
                  <Txt variant="title" color={on ? color.greenDeep : color.ink}>{o.label}</Txt>
                  <Txt variant="caption" color={color.muted} numberOfLines={1}>{o.sub}</Txt>
                </Card>
              );
            })}
          </View>
          {meetMode === 'home' && (
            <View style={s.locRow}>
              {locLoading ? (
                <Txt variant="caption" color={color.muted}>Getting your location…</Txt>
              ) : coords ? (
                <Txt variant="caption" color={color.greenDeep}>✓ Location captured · {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Txt>
              ) : locBlocked ? (
                <Pressable onPress={openLocationSettings}>
                  <Txt variant="caption" color={color.terracotta}>Location is off for Caresy — tap to open Settings</Txt>
                </Pressable>
              ) : locError ? (
                <Pressable onPress={requestLocation}>
                  <Txt variant="caption" color={color.terracotta}>{locError} — tap to try again</Txt>
                </Pressable>
              ) : (
                <Pressable onPress={requestLocation}>
                  <Txt variant="caption" color={color.greenDeep}>📍 Share current location</Txt>
                </Pressable>
              )}
            </View>
          )}
          <Field label="Meeting address" value={meetAddress} onChangeText={setMeetAddress} placeholder={meetMode === 'home' ? 'House no., street, landmark' : meetMode === 'hospital' ? (hospital || 'Hospital address') : 'Main gate / reception'} />
          <Txt variant="h2" color={color.ink}>Getting there</Txt>
          <FieldButton
            label="Transport"
            value={TRANSPORT_MODES.find((m) => m.key === transportMode)?.label ?? 'Select'}
            placeholder="How will you get there?"
            onPress={() => setTransportSheet(true)}
          />
          <BottomSheet
            visible={transportSheet}
            title="Getting there"
            selectedKey={transportMode}
            onSelect={setTransportMode}
            onClose={() => setTransportSheet(false)}
            options={TRANSPORT_MODES.map((m) => ({ key: m.key, label: m.label }))}
          />
        </Stagger>
      )}

      {step === 3 && (
        <Stagger key="step-3">
          {savedPatients.length > 0 && (
            <>
              <FieldButton
                label="Family member"
                value={selectedPatientId ? (savedPatients.find((pp) => pp.id === selectedPatientId)?.full_name ?? patientName) : (patientName ? patientName : '+ New patient')}
                placeholder="Choose family member"
                onPress={() => setPatientSheet(true)}
              />
              <BottomSheet
                visible={patientSheet}
                title="Family member"
                selectedKey={selectedPatientId ?? '__new'}
                onSelect={(k) => {
                  if (k === '__new') {
                    setSelectedPatientId(null);
                    setPatientName('');
                    setAge('');
                    setEmergency('');
                  } else {
                    const pp = savedPatients.find((x) => x.id === k);
                    if (pp) pickSaved(pp);
                  }
                }}
                onClose={() => setPatientSheet(false)}
                options={[
                  ...savedPatients.map((pp) => ({ key: pp.id, label: pp.full_name, desc: pp.age != null ? `Age ${pp.age}` : undefined })),
                  { key: '__new', label: '+ New patient', desc: 'Enter details below' },
                ]}
              />
            </>
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
                  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to attach a document'); return; }
                  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
                  if (!res.canceled && res.assets?.[0]?.uri) setDocUri(res.assets[0].uri);
                }}
                style={s.docBtn}
              />
              {docUri ? <Button title="Remove" variant="secondary" onPress={() => setDocUri(null)} style={s.docBtn} /> : null}
            </View>
          </Card>
        </Stagger>
      )}

      {step === 4 && (
        <Stagger key="step-4">
          <FieldButton
            label="Date"
            value={date ? (days.find((d) => d.iso === date)?.label ?? date) : ''}
            placeholder="Choose a day"
            onPress={() => setDateSheet(true)}
          />
          <BottomSheet
            visible={dateSheet}
            title="Choose a day"
            selectedKey={date || null}
            onSelect={(k) => { setDate(k); setTime(''); }}
            onClose={() => setDateSheet(false)}
            options={days.map((d) => ({ key: d.iso, label: d.label }))}
          />
          {date ? (
            slots.length ? (
              <>
                <FieldButton
                  label="Time slot"
                  value={time ? fmtSlot(time) : ''}
                  placeholder="Choose a time"
                  onPress={() => setTimeSheet(true)}
                />
                <BottomSheet
                  visible={timeSheet}
                  title="Choose a time"
                  selectedKey={time || null}
                  onSelect={setTime}
                  onClose={() => setTimeSheet(false)}
                  options={slots.map((s) => ({ key: s, label: fmtSlot(s) }))}
                />
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
        </Stagger>
      )}
    </FormScreen>
  );
}

const s = StyleSheet.create({
  stepBody: { gap: space.lg },
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
  locRow: { marginTop: -space.xs },
  meetHint: { gap: space.sm, backgroundColor: color.card },
  docCard: { gap: space.sm },
  docRow: { flexDirection: 'row', gap: space.sm },
  docBtn: { flex: 1 },
});
