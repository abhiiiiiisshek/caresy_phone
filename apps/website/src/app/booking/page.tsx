'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import {
  ArrowRight, ArrowLeft, Loader2, Check, CheckCircle2, Stethoscope,
  Building2, MapPin, CalendarDays, Clock, Star, BadgeCheck,
  Pill, Sun, HeartPulse, UserPlus,
  ChevronLeft, ChevronRight, CalendarPlus, Home as HomeIcon, Send,
} from 'lucide-react';
import { matchCompanionByDepartment } from '@/data/companions';
import HospitalAutocomplete from '@/components/HospitalAutocomplete';
import MeetingPoint, { type Coords } from '@/components/MeetingPoint';
import { pincodeForArea } from '@/data/hospitals';
import { Input, Reveal } from '@caresy/ui';
import { checkPincodeServed, isValidPincode, listServedAreas, type ServiceArea } from '@caresy/utils';
import { priceForMinutes, formatINR, eveningSurchargePaise, GRACE_MINUTES } from '@caresy/utils/pricing';
import { isValidIndianMobile, normalizeIndianMobile, toE164, mobileHint } from '@caresy/utils/phone';
import { availableSlots } from '@caresy/utils/slots';

const EPILOGUE = 'var(--font-epilogue), sans-serif';
const DRAFT_KEY = 'caresy_booking_draft';
const TOTAL_STEPS = 4;

// What they need. Price is by time, not by service, so these carry no tier of
// their own — but dropping them entirely was wrong: people could not tell
// whether a scan or a medicine run was even something Caresy does, and a bare
// "how many hours?" gives nothing to judge the cost against. Each one suggests
// the duration that visit usually takes, which is where the price comes from.
const SERVICES = [
  { key: 'HOSPITAL_COMPANION',    icon: Stethoscope, name: 'Doctor appointment', desc: 'OPD visit — queues, consultation, paperwork, pharmacy.', hours: 2 },
  { key: 'MEDICINE_PICKUP',       icon: Pill,        name: 'Medicine pickup',     desc: 'Collect a prescription and deliver it home. No patient needed.', hours: 1 },
  { key: 'APPOINTMENT_ASSISTANCE',icon: Sun,         name: 'Procedure or day-care', desc: 'Admission, surgery or dialysis — someone stays the whole time.', hours: 8 },
  { key: 'SAFE_RETURN',           icon: HeartPulse,  name: 'Elderly care visit',  desc: 'Unhurried company for an older parent through a long visit.', hours: 4 },
] as const;

// Price comes from the shared meter, so the numbers here can never drift from
// what the bill says.
const DURATIONS = [1, 2, 4, 6, 8].map((hours) => ({
  hours,
  label: hours === 8 ? 'Full day' : `${hours} hour${hours > 1 ? 's' : ''}`,
  paise: priceForMinutes(hours * 60),
}));

interface SavedPatient {
  id: string;
  full_name: string;
  age: number | null;
  emergency_contact_phone: string | null;
}

const CARE_NEEDS = ['Wheelchair', 'Walking assistance', 'Medicine collection'];

// Getting there. Caresy arranges but never sells the ride — on COMPANION_ARRANGED
// the companion compares fares, you approve, and you pay the driver directly.
const TRANSPORT_MODES = [
  { key: 'NONE', label: 'We’ll make our own way', desc: 'Meet the companion at the hospital.' },
  { key: 'COMPANION_ARRANGED', label: 'Companion arranges a cab', desc: 'They compare Uber, Rapido and Ola, tell you the fares, and book the one you pick. You pay the driver.' },
  { key: 'CUSTOMER_VEHICLE', label: 'Companion drives our vehicle', desc: 'Your own car or bike. Only companions with a verified licence are assigned.' },
] as const;
const LANGUAGES = ['No preference', 'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada'];

function fmtSlot(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`;
}

const label: React.CSSProperties = { fontSize: 14, fontWeight: 500, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--m3-green-deep)' };

function StepHeader({ step, title, sub }: { step: number; title: string; sub: string }) {
  return (
    <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--m3-green-deep)' }}>Step {step} of {TOTAL_STEPS}</span>
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>{sub}</p>
    </Reveal>
  );
}

function Calendar({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const selected = value ? new Date(value + 'T00:00:00') : null;
  const [view, setView] = useState(() => {
    const base = selected || today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const firstDow = view.getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const navBtn: React.CSSProperties = { display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', border: '1px solid #c0c9c3', background: 'transparent', cursor: 'pointer', color: 'var(--m3-ink)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 24px 32px', borderRadius: 'var(--m3-radius-card)', background: '#fff', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 700, color: 'var(--m3-ink)' }}>
          {view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" aria-label="Previous month" style={navBtn} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><ChevronLeft style={{ width: 16, height: 16 }} /></button>
          <button type="button" aria-label="Next month" style={navBtn} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><ChevronRight style={{ width: 16, height: 16 }} /></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>{d}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const date = new Date(view.getFullYear(), view.getMonth(), day);
          const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const past = date < today;
          const isSel = selected && date.getTime() === selected.getTime();
          return (
            <button
              key={iso} type="button" disabled={past}
              onClick={() => onChange(iso)}
              style={{
                justifySelf: 'center', width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: past ? 'default' : 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px',
                background: isSel ? 'var(--m3-green-deep)' : 'transparent',
                color: isSel ? '#fff' : past ? '#c0c9c3' : 'var(--m3-ink)',
                boxShadow: isSel ? '0 0 0 4px rgba(158,209,189,0.2)' : 'none',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Booking() {
  const { user, openLogin } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);

  // Step 1: what and how long. 2 hours preselected — the typical OPD visit,
  // and the middle of the menu.
  const [serviceKey, setServiceKey] = useState<string>('HOSPITAL_COMPANION');
  const [durationHours, setDurationHours] = useState(2);
  // Once someone moves the duration slider themselves, picking a different
  // service must not silently overwrite their choice.
  const [durationTouched, setDurationTouched] = useState(false);
  const [careNeeds, setCareNeeds] = useState<string[]>([]);
  const [transportMode, setTransportMode] = useState<string>('NONE');

  // Step 2: Hospital
  const [hospital, setHospital] = useState('');
  const [pincode, setPincode] = useState('');
  const [areaStatus, setAreaStatus] = useState<'idle' | 'checking' | 'served' | 'not_served'>('idle');
  // True while the pincode came from the picked hospital's area rather than typing.
  const [pinAutoFilled, setPinAutoFilled] = useState(false);
  const [areaLabel, setAreaLabel] = useState('');
  const [department, setDepartment] = useState('');
  const [doctor, setDoctor] = useState('');
  // Meeting point: a typed landmark and/or the exact GPS point, both optional.
  const [meetAddress, setMeetAddress] = useState('');
  const [meetCoords, setMeetCoords] = useState<Coords | null>(null);

  // Step 3: Patient. selectedPatientId is set when they pick someone they have
  // booked for before, so the booking attaches to that existing patient record
  // instead of minting a new one.
  const [savedPatients, setSavedPatients] = useState<SavedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergency, setEmergency] = useState('');
  const [language, setLanguage] = useState('No preference');
  const [notes, setNotes] = useState('');

  // Step 4: Time
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [review, setReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<{ ref: string } | null>(null);

  // Restore an in-progress form after a Google sign-in redirect took the user away and back.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setPatientName(draft.patientName || '');
      setAge(draft.age || '');
      setPhone(draft.phone || '');
      setEmail(draft.email || '');
      setEmergency(draft.emergency || '');
      setHospital(draft.hospital || '');
      setPincode(draft.pincode || '');
      setDepartment(draft.department || '');
      setDoctor(draft.doctor || '');
      setMeetAddress(draft.meetAddress || '');
      setMeetCoords(draft.meetCoords || null);
      setDate(draft.date || '');
      setTime(draft.time || '');
      setLanguage(draft.language || 'No preference');
      setServiceKey(draft.serviceKey || 'HOSPITAL_COMPANION');
      setDurationHours(draft.durationHours || 2);
      setDurationTouched(true);   // a restored draft is already their choice
      setCareNeeds(draft.careNeeds || []);
      setTransportMode(draft.transportMode || 'NONE');
      setNotes(draft.notes || '');
      setStep(TOTAL_STEPS);
      setReview(true);
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore malformed/unavailable sessionStorage
    }
  }, []);

  // People they have booked for before. Nobody should retype their mother's
  // name and age on every visit, and reusing the row is what keeps the care
  // timeline and documents attached to one person instead of scattering across
  // a new patient record per booking.
  useEffect(() => {
    // No synchronous reset on the signed-out branch: the list starts empty and
    // a guest never fills it, so clearing here would only be a setState inside
    // an effect for no observable change.
    if (!user) return;
    let alive = true;
    createClient()
      .from('patients')
      .select('id, full_name, age, emergency_contact_phone')
      .eq('customer_user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (alive) setSavedPatients((data as SavedPatient[]) ?? []); });
    return () => { alive = false; };
  }, [user]);

  const pickPatient = (p: SavedPatient) => {
    setSelectedPatientId(p.id);
    setPatientName(p.full_name);
    setAge(p.age ? String(p.age) : '');
    // Stored as +91……; the field holds the 10 national digits.
    setEmergency(normalizeIndianMobile(p.emergency_contact_phone || '') || '');
  };

  const clearPatient = () => {
    setSelectedPatientId(null);
    setPatientName(''); setAge(''); setEmergency('');
  };

  // The pincodes we cover, offered as quick-picks. People were asked to type a
  // pincode for a hospital they had just chosen from a list, with no way to know
  // which ones we accept. Same table the check below reads, so it cannot drift.
  const [servedAreas, setServedAreas] = useState<ServiceArea[]>([]);
  useEffect(() => {
    let alive = true;
    listServedAreas(createClient()).then((a) => { if (alive) setServedAreas(a); });
    return () => { alive = false; };
  }, []);

  // Live service-area check as the pincode is typed.
  useEffect(() => {
    if (!isValidPincode(pincode)) { setAreaStatus('idle'); setAreaLabel(''); return; }
    let cancelled = false;
    setAreaStatus('checking');
    checkPincodeServed(createClient(), pincode).then(({ served, area }) => {
      if (cancelled) return;
      setAreaStatus(served ? 'served' : 'not_served');
      setAreaLabel(area?.area_name || area?.city || '');
    });
    return () => { cancelled = true; };
  }, [pincode]);

  const toggleNeed = (need: string) =>
    setCareNeeds(careNeeds.includes(need) ? careNeeds.filter((n) => n !== need) : [...careNeeds, need]);

  const chosenService = SERVICES.find((s) => s.key === serviceKey) || SERVICES[0];
  const durationLabel = DURATIONS.find((d) => d.hours === durationHours)?.label || `${durationHours} hours`;
  const serviceLabel = `${chosenService.name} · ${durationLabel}`;
  const basePaise = priceForMinutes(durationHours * 60);
  // ₹99 on 6–8pm starts. Slot strings are the customer's wall clock, so the
  // hour can be read straight off the front of "18:00".
  const eveningPaise = time ? eveningSurchargePaise(parseInt(time, 10)) : 0;
  const totalPaise = basePaise + eveningPaise;
  const slots = availableSlots(date);

  const isStepValid = (s: number) => {
    if (s === 1) return durationHours > 0;
    if (s === 2) return hospital.trim() !== '' && areaStatus === 'served';
    // A nine-digit number passed the old check and produced a booking nobody
    // could be dispatched to. Emergency contact is optional, but must be
    // reachable if given at all.
    // A typo'd email is the only way we can reach them with the invoice, and
    // the field was previously satisfied by a single space.
    if (s === 3) return patientName.trim() !== '' && isValidIndianMobile(phone) && /\S+@\S+\.\S+/.test(email)
      && (emergency.trim() === '' || isValidIndianMobile(emergency));
    // Re-checked on every render, so a slot that lapses while the form is open
    // stops being valid rather than submitting a visit in the past.
    if (s === 4) return date !== '' && time !== '' && availableSlots(date).includes(time);
    return true;
  };

  // Why Continue is greyed out, in the user's words.
  //
  // Step 2 was the trap QA fell into: a served pincode shows a green tick, so
  // the screen looks finished, but the step also needs a hospital and said so
  // nowhere. A disabled button with no reason is a dead end — the person cannot
  // tell whether the form is broken or they are.
  const blockingReason = (s: number): string | null => {
    if (isStepValid(s)) return null;
    if (s === 1) return 'Choose how long you need a companion for.';
    if (s === 2) {
      if (!hospital.trim()) return 'Pick the hospital or clinic you are going to.';
      if (areaStatus === 'checking') return 'Checking that pincode…';
      if (areaStatus === 'not_served') return 'We do not cover that pincode yet — Noida and Greater Noida only.';
      return 'Add the pincode of the hospital.';
    }
    if (s === 3) {
      if (!patientName.trim()) return 'Add the name of the person the companion is meeting.';
      if (!isValidIndianMobile(phone)) return 'A 10-digit mobile number is needed — the companion calls it on the day.';
      if (!/\S+@\S+\.\S+/.test(email)) return 'That email address looks incomplete. The booking confirmation goes there.';
      return 'The emergency contact must be a 10-digit mobile, or left empty.';
    }
    if (s === 4) {
      if (!date || !time) return 'Pick a date and a time slot.';
      return 'That slot has just passed. Pick another time.';
    }
    return null;
  };

  const goNext = () => {
    if (!isStepValid(step)) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
    else setReview(true);
  };

  const goBack = () => {
    if (review) { setReview(false); return; }
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const matched = matchCompanionByDepartment(department);

  const handleConfirm = () => {
    if (!user) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          patientName, age, phone, email, emergency,
          hospital, pincode, department, doctor, date, time, language,
          serviceKey, durationHours, careNeeds, transportMode, notes,
          meetAddress, meetCoords,
          patientId: selectedPatientId,
        }));
      } catch {
        // ignore unavailable sessionStorage
      }
      openLogin();
      return;
    }
    submitBookingRequest();
  };

  const submitBookingRequest = async () => {
    // The review screen can sit open for a long time, and a sign-in round trip
    // restores a draft straight onto it. Re-check the slot here rather than
    // trusting the one that was valid when it was picked.
    if (!availableSlots(date).includes(time)) {
      alert('That time has passed. Please pick a new slot.');
      setTime('');
      setReview(false);
      setStep(TOTAL_STEPS);
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        alert('Authentication error. Please log in.');
        setIsSubmitting(false);
        return;
      }

      // Reuse the existing patient when they picked a saved one. Inserting
      // unconditionally meant booking for the same parent five times created
      // five patient records, which fragmented their care timeline and
      // documents across all of them.
      let patientId = selectedPatientId;
      if (patientId) {
        // Details are editable after picking, so persist any changes.
        await supabase.from('patients')
          .update({
            full_name: patientName,
            age: age ? parseInt(age) : null,
            emergency_contact_phone: toE164(emergency),
          })
          .eq('id', patientId);
      } else {
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .insert({
            customer_user_id: currentUser.id,
            full_name: patientName,
            age: age ? parseInt(age) : null,
            emergency_contact_phone: toE164(emergency),
          })
          .select()
          .single();

        if (patientError) throw patientError;
        patientId = patientData.id;
      }

      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .insert({
          customer_user_id: currentUser.id,
          title: hospital,
          // The meeting point if they gave one, else the hospital — the column is
          // NOT NULL and "Max Hospital" is still better than failing the insert.
          address_line_1: meetAddress.trim() || hospital,
          city: areaLabel || 'Noida',
          state: 'Uttar Pradesh',
          pincode: pincode.trim(),
          // Read by the companion's Open in Maps link, and by
          // get_trip_destination() for the ETA (migrations 17, 18).
          latitude: meetCoords?.lat ?? null,
          longitude: meetCoords?.lng ?? null,
        })
        .select()
        .single();

      if (locationError) throw locationError;

      // The service they picked maps straight onto the enum now, so ops sees a
      // scan as a scan rather than everything arriving as HOSPITAL_COMPANION.
      const serviceEnum = chosenService.key;

      const scheduledStart = new Date(`${date}T${time}:00`);
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_user_id: currentUser.id,
          patient_id: patientId,
          pickup_location_id: locationData.id,
          service_type: serviceEnum,
          booking_type: 'SCHEDULED',
          status: 'PENDING',
          transport_mode: transportMode,
          scheduled_start_time: scheduledStart.toISOString(),
          special_instructions: notes || '',
          estimated_duration_minutes: durationHours * 60,
          service_metadata: {
            customerEmail: email,
            customerPhone: toE164(phone),
            doctor,
            department,
            language,
            careNeeds,
            originalService: serviceLabel,
            quotedPaise: totalPaise,
            eveningSurchargePaise: eveningPaise,
          },
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      setSuccessBooking({ ref: bookingData.reference_code });
    } catch (err: any) {
      console.error('Error submitting booking request:', err);
      alert(err.message || 'Failed to submit booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- Confirmed screen ---------- */
  if (successBooking) {
    const when = new Date(`${date}T${time}:00`);
    const whenLabel = `${when.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} · ${fmtSlot(time)}`;
    const gcalStart = `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Caresy companion visit — ' + hospital)}&dates=${gcalStart}/${gcalStart}&details=${encodeURIComponent('Booking ' + successBooking.ref)}`;
    return (
      <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE, paddingBottom: 96 }}>
        <div style={{ maxWidth: 576, margin: '0 auto', padding: '48px 16px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <Reveal style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ maxWidth: 500, width: '100%', borderRadius: 'var(--m3-radius-card)', overflow: 'hidden', background: 'var(--m3-chip)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/booking-confirmed.jpg" alt="" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '8px 16px', borderRadius: 999, background: 'var(--m3-cyan)', color: 'var(--m3-cyan-ink)', fontSize: 16 }}>
              <CheckCircle2 style={{ width: 15, height: 15 }} />
              Success
            </span>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700, letterSpacing: '-0.7px', color: 'var(--m3-green-deep)', textAlign: 'center' }}>Booking Confirmed!</h1>
            <p style={{ margin: 0, maxWidth: 512, fontSize: 16, lineHeight: '24px', letterSpacing: '0.5px', color: 'var(--m3-muted)', textAlign: 'center' }}>
              Your request has been received. Our operations team will review it and assign a verified companion shortly.
            </p>
          </Reveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: 32, borderRadius: 'var(--m3-radius-card)', background: '#e7e9e4', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
            <div style={{ paddingBottom: 25, borderBottom: '1px solid #c0c9c3' }}>
              <h2 style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 500, color: 'var(--m3-green-deep)' }}>Appointment Details</h2>
              <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--m3-muted)' }}>Booking ID: {successBooking.ref}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                { icon: Stethoscope, bg: '#baeed9', label: 'Service', value: serviceLabel },
                { icon: Building2, bg: 'var(--m3-cyan)', label: 'Hospital', value: hospital },
                { icon: Clock, bg: 'var(--m3-cyan)', label: 'Schedule', value: whenLabel },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, background: row.bg, color: 'var(--m3-green-deep)', flexShrink: 0 }}>
                    <row.icon style={{ width: 20, height: 20 }} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>{row.label}</span>
                    <span style={{ display: 'block', fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--m3-ink)' }}>{row.value}</span>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
              <Link href="/my-bookings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 999, background: 'var(--m3-green-deep)', color: '#fff', fontSize: 16, textDecoration: 'none' }}>
                Track Status
                <Send style={{ width: 18, height: 18 }} />
              </Link>
              <div style={{ display: 'flex', gap: 12 }}>
                <a href={gcalUrl} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, padding: '0 17px', borderRadius: 999, border: '1px solid #707974', color: 'var(--m3-ink)', fontSize: 16, textDecoration: 'none' }}>
                  <CalendarPlus style={{ width: 17, height: 17 }} />
                  Add to Cal
                </a>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, padding: '0 21px', borderRadius: 999, background: '#e1e3de', color: 'var(--m3-ink)', fontSize: 16, textDecoration: 'none' }}>
                  <HomeIcon style={{ width: 15, height: 15 }} />
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '13px 25px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, letterSpacing: '0.1px',
    fontWeight: active ? 700 : 500,
    background: active ? 'var(--m3-green-deep)' : 'transparent',
    border: active ? '1px solid transparent' : '1px solid #c0c9c3',
    color: active ? '#fff' : 'var(--m3-ink)',
    boxShadow: active ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
    whiteSpace: 'nowrap',
  });

  /* ---------- Wizard ---------- */
  return (
    // No bottom padding: the tab bar is suppressed on /booking, and the sticky
    // footer below would otherwise float above 96px of dead space.
    <main id="main-content" style={{ background: 'var(--m3-bg)', minHeight: '100vh', fontFamily: EPILOGUE }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px 0' }}>

        {/* Top bar: back + progress + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 24 }}>
          <button onClick={goBack} aria-label="Go back" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--m3-ink)' }}>
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--m3-muted)' }}>
              {review ? 'Review & Confirm' : `Step ${step} of ${TOTAL_STEPS}`}
            </span>
            <div style={{ display: 'flex', gap: 4, width: 128 }}>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: review || i < step ? 'var(--m3-green-deep)' : '#c0c9c3' }} />
              ))}
            </div>
          </div>
          <Link href="/" aria-label="Close booking" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', color: 'var(--m3-ink)' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>
          </Link>
        </div>

        {!review && step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <StepHeader step={1} title="What do you need?" sub="A verified companion for the visit. You pay for the time used — the price updates as you choose." />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SERVICES.map((s) => {
                const active = serviceKey === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setServiceKey(s.key);
                      // Suggest the usual duration, unless they have already set one.
                      if (!durationTouched) setDurationHours(s.hours);
                    }}
                    style={{ display: 'flex', gap: 14, alignItems: 'flex-start', width: '100%', padding: '15px 17px', borderRadius: 'var(--m3-radius-card)', background: active ? '#fff' : 'var(--m3-chip)', border: active ? '2px solid var(--m3-green-deep)' : '2px solid transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', boxShadow: active ? '0 4px 12px rgba(0,0,0,0.07)' : 'none' }}
                  >
                    <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 12, background: active ? 'var(--m3-green-deep)' : 'var(--m3-cyan)', color: active ? '#fff' : 'var(--m3-cyan-ink)', flexShrink: 0 }}>
                      <s.icon style={{ width: 19, height: 19 }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--m3-green-deep)' }}>{s.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m3-ink)', flexShrink: 0 }}>
                          {formatINR(priceForMinutes(s.hours * 60))}
                          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--m3-muted)' }}> / {s.hours}h</span>
                        </span>
                      </span>
                      <span style={{ display: 'block', paddingTop: 3, fontSize: 12.5, lineHeight: '17px', color: 'var(--m3-muted)' }}>{s.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={label}>How long</span>
              {DURATIONS.map((d) => {
                const active = durationHours === d.hours;
                const fullDay = d.hours === 8;
                return (
                  <button key={d.hours} onClick={() => { setDurationHours(d.hours); setDurationTouched(true); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '17px 20px', borderRadius: 'var(--m3-radius-card)', background: active ? '#fff' : 'var(--m3-chip)', border: active ? '2px solid var(--m3-green-deep)' : '2px solid transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', boxShadow: active ? '0 4px 12px rgba(0,0,0,0.08)' : 'none' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', border: active ? 'none' : '2px solid #c0c9c3', background: active ? 'var(--m3-green-deep)' : 'transparent', color: '#fff', flexShrink: 0 }}>
                      {active && <Check style={{ width: 13, height: 13 }} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--m3-green-deep)' }}>{d.label}</span>
                        {fullDay && (
                          <span style={{ padding: '2px 10px', borderRadius: 999, background: 'var(--m3-cyan)', color: 'var(--m3-cyan-ink)', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase' }}>Best value</span>
                        )}
                      </span>
                      {fullDay && (
                        <span style={{ display: 'block', paddingTop: 2, fontSize: 12.5, color: 'var(--m3-muted)' }}>
                          2 extra hours for {formatINR(d.paise - priceForMinutes(6 * 60))} more than 6 hours
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--m3-ink)', flexShrink: 0 }}>{formatINR(d.paise)}</span>
                  </button>
                );
              })}
              <p style={{ margin: '-2px 4px 0', fontSize: 12.5, lineHeight: '18px', color: 'var(--m3-muted)' }}>
                Runs a little over? First {GRACE_MINUTES} minutes are free, then just ₹4 a minute.
                We always charge whichever is less.
              </p>
            </div>

            {/* Cost stays visible while choosing, so nobody reaches step 4
                still wondering what this will come to. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '15px 18px', borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-green-deep)', color: '#fff' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', opacity: 0.75 }}>Estimated</span>
                <span style={{ display: 'block', fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chosenService.name} · {durationLabel}</span>
              </span>
              <strong style={{ fontSize: 24, fontWeight: 700, flexShrink: 0 }}>{formatINR(basePaise)}</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={label}>Getting there</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TRANSPORT_MODES.map((t) => {
                  const on = transportMode === t.key;
                  return (
                    <button key={t.key} onClick={() => setTransportMode(t.key)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', padding: '14px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', background: on ? '#fff' : 'var(--m3-chip)', border: on ? '2px solid var(--m3-green-deep)' : '2px solid transparent' }}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, marginTop: 2, borderRadius: '50%', flexShrink: 0, border: on ? 'none' : '2px solid #c0c9c3', background: on ? 'var(--m3-green-deep)' : 'transparent', color: '#fff' }}>
                        {on && <Check style={{ width: 11, height: 11 }} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--m3-green-deep)' }}>{t.label}</span>
                        <span style={{ display: 'block', paddingTop: 2, fontSize: 12.5, lineHeight: '17px', color: 'var(--m3-muted)' }}>{t.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {transportMode === 'COMPANION_ARRANGED' && (
                <p style={{ margin: 0, fontSize: 12, lineHeight: '17px', color: 'var(--m3-muted)' }}>
                  Caresy doesn&rsquo;t charge for the ride or add anything to the fare — you pay the driver directly, by cash, UPI or card.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={label}>Care needs</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CARE_NEEDS.map((need) => {
                  const on = careNeeds.includes(need);
                  return (
                    <button key={need} onClick={() => toggleNeed(need)} style={{ padding: '9px 17px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', background: on ? 'var(--m3-cyan)' : '#e1e3de', border: on ? '1px solid transparent' : '1px solid #c0c9c3', color: on ? 'var(--m3-cyan-ink)' : 'var(--m3-muted)' }}>
                      {need}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!review && step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <StepHeader step={2} title="Select Hospital" sub="Tell us where the visit is happening — we currently serve Noida & Greater Noida." />
            <HospitalAutocomplete
              value={hospital}
              onChange={(v, picked) => {
                setHospital(v);
                // Only when chosen from the list, and only for areas whose
                // pincode is unambiguous. Still editable — this is a shortcut,
                // not a lock.
                const pin = picked && pincodeForArea(picked.area);
                if (pin) { setPincode(pin); setPinAutoFilled(true); }
                else setPinAutoFilled(false);
              }}
            />
            {/* Picking a listed hospital tells us the area, so there is nothing
                to ask. Collapses to a confirmation line with a way back out for
                the rare case the hospital's area is wrong. */}
            {pinAutoFilled ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--success-soft, #e7f0ea)', border: '1px solid var(--m3-line)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Check style={{ width: 16, height: 16, color: 'var(--m3-green)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, color: 'var(--m3-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    In our service area — {areaLabel || 'Noida'} · {pincode}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setPinAutoFilled(false)}
                  style={{ flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--m3-green-deep)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Change
                </button>
              </div>
            ) : (
              <Input
                label="Pincode" name="pincode" required
                inputMode="numeric" maxLength={6} placeholder="201301"
                value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                hint={
                  areaStatus === 'checking' ? 'Checking availability…'
                  : areaStatus === 'served' ? `✓ We serve ${areaLabel || 'this area'}`
                  : areaStatus === 'not_served' ? '✗ Sorry, we don’t serve this pincode yet — we currently cover Noida & Greater Noida.'
                  : 'The hospital’s pincode. We use it to confirm the visit is inside our service area.'
                }
              />
            )}

            {!pinAutoFilled && areaStatus !== 'served' && servedAreas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: -12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--m3-muted)' }}>Or pick the area you&rsquo;re visiting</span>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                  {servedAreas.map((a) => (
                    <button
                      key={a.pincode}
                      type="button"
                      onClick={() => setPincode(a.pincode)}
                      style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, border: '1px solid var(--m3-line)', background: 'var(--m3-chip)', color: 'var(--m3-ink)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {a.area_name || a.city} · {a.pincode}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Department" name="department" placeholder="Cardiology" value={department} onChange={(e) => setDepartment(e.target.value)} />
              <Input label="Doctor name" name="doctor" placeholder="Dr. Mehta" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
            </div>
            <MeetingPoint
              address={meetAddress} coords={meetCoords}
              onAddressChange={setMeetAddress} onCoordsChange={setMeetCoords}
            />
          </div>
        )}

        {!review && step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <StepHeader step={3} title="Patient Details" sub="Who will our companion be supporting? We keep this private and secure." />

            {savedPatients.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={label}>Booking for</span>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                  {savedPatients.map((p) => {
                    const on = selectedPatientId === p.id;
                    return (
                      <button key={p.id} type="button" onClick={() => pickPatient(p)}
                        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: on ? 700 : 500,
                          background: on ? 'var(--m3-green-deep)' : 'var(--m3-chip)',
                          border: on ? '1px solid transparent' : '1px solid var(--m3-line)',
                          color: on ? '#fff' : 'var(--m3-ink)' }}>
                        {on && <Check style={{ width: 13, height: 13 }} />}
                        {p.full_name}{p.age ? ` · ${p.age}` : ''}
                      </button>
                    );
                  })}
                  <button type="button" onClick={clearPatient}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 15px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: selectedPatientId ? 500 : 700,
                      background: selectedPatientId ? 'transparent' : 'var(--m3-chip)',
                      border: '1px solid var(--m3-line)', color: 'var(--m3-ink)' }}>
                    <UserPlus style={{ width: 14, height: 14 }} />
                    Someone else
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 25, borderRadius: 'var(--m3-radius-card)', background: '#fff', border: '1px solid var(--m3-line)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <Input label="Patient name" name="patientName" placeholder="Ramesh Kumar" required value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                <Input label="Age" name="age" type="number" min={1} max={120} placeholder="68" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <Input
                label="Customer mobile" name="phone" type="tel" required
                inputMode="numeric" maxLength={10} placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                hint={mobileHint(phone) ?? '+91 — this is the number our companion will call'}
              />
              <Input label="Customer email" name="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input
                label="Emergency contact" name="emergency" type="tel"
                inputMode="numeric" maxLength={10} placeholder="99887 77665"
                value={emergency}
                onChange={(e) => setEmergency(e.target.value.replace(/\D/g, '').slice(0, 10))}
                hint={mobileHint(emergency) ?? 'Optional — someone else we can reach'}
              />
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--m3-ink)' }}>
                Preferred language
                <select name="language" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #c0c9c3', background: '#fff', fontSize: 15, fontFamily: 'inherit', color: 'var(--m3-ink)' }}>
                  {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
              <Input label="Additional notes" name="notes" multiline rows={3} placeholder="Medical notes, address, special requirements" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {!review && step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <StepHeader step={4} title="When do you need care?" sub="Select a date and time for your booking." />
            <Calendar
              value={date}
              onChange={(iso) => {
                setDate(iso);
                // Moving to a date that no longer offers the chosen slot must
                // not silently keep it selected.
                if (time && !availableSlots(iso).includes(time)) setTime('');
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={label}>Available times</span>
              {slots.length === 0 ? (
                <p style={{ margin: '0 4px', fontSize: 13.5, lineHeight: '19px', color: 'var(--m3-muted)' }}>
                  No slots left today — we need about an hour to brief a companion.
                  Pick tomorrow above, or{' '}
                  <Link href="/quick-help" style={{ color: 'var(--m3-green-deep)', fontWeight: 700 }}>ask for urgent help</Link>{' '}
                  and we&rsquo;ll call you back.
                </p>
              ) : (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {slots.map((t) => {
                    const evening = eveningSurchargePaise(parseInt(t, 10)) > 0;
                    return (
                      <button key={t} onClick={() => setTime(t)} style={chip(time === t)}>
                        {fmtSlot(t)}{evening ? ' · +₹99' : ''}
                      </button>
                    );
                  })}
                </div>
              )}
              <p style={{ margin: '0 4px', fontSize: 12, color: 'var(--m3-muted)' }}>Evening slots (6–8pm) carry a ₹99 surcharge. Services end at 8pm.</p>
            </div>
            {date && time && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 25, borderRadius: 'var(--m3-radius-card)', background: '#fff', border: '1px solid rgba(192,201,195,0.3)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
                <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)', paddingBottom: 8 }}>Selected Slot</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, lineHeight: '28px', fontWeight: 700, color: 'var(--m3-ink)' }}>
                  <CalendarDays style={{ width: 20, height: 20, color: 'var(--m3-green-deep)' }} />
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} • {fmtSlot(time)}
                </span>
              </div>
            )}
          </div>
        )}

        {review && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Summary header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 25, borderRadius: 'var(--m3-radius-card)', background: 'var(--m3-chip)', border: '1px solid rgba(192,201,195,0.3)', boxShadow: '0 1px 1px rgba(0,0,0,0.05)' }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--m3-muted)' }}>Booking summary</span>
                <h2 style={{ margin: '4px 0 0', fontSize: 28, lineHeight: '35px', fontWeight: 600, color: 'var(--m3-green-deep)', textTransform: 'capitalize' }}>{serviceLabel}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>
                  <Building2 style={{ width: 17, height: 17 }} />{hospital}{department ? ` · ${department}` : ''}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>
                  <CalendarDays style={{ width: 17, height: 17 }} />
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {fmtSlot(time)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>
                  <MapPin style={{ width: 17, height: 17 }} />Patient: {patientName}{age ? ` (${age} yrs)` : ''}
                </span>
              </div>
            </div>

            {/* Likely companion */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ margin: 0, padding: '0 4px', fontSize: 16, fontWeight: 500, letterSpacing: '0.15px', color: 'var(--m3-ink)' }}>Who you might get</h3>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 17, borderRadius: 12, background: '#fff', border: '1px solid rgba(192,201,195,0.2)' }}>
                {matched.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={matched.photo} alt={matched.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #baeed9', flexShrink: 0 }} />
                ) : (
                  <span style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', background: 'var(--m3-green)', color: '#fff', fontWeight: 800, fontSize: 22, border: '2px solid #baeed9', flexShrink: 0 }}>{matched.avatarInitials}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.15px', color: 'var(--m3-green-deep)' }}>{matched.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 500, color: 'var(--m3-ink)' }}>
                      <Star style={{ width: 14, height: 14, fill: 'var(--warning)', color: 'var(--warning)' }} />{matched.rating}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--m3-cyan)', color: 'var(--m3-cyan-ink)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.55px' }}>{matched.verification}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--m3-cyan)', color: 'var(--m3-cyan-ink)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.55px' }}>{matched.specialty}</span>
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, padding: '0 4px', fontSize: 12, color: 'var(--m3-muted)' }}>*Illustrative match by specialty. Your actual companion is confirmed by operations after review.</p>
            </div>

            {/* Price breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 25, borderRadius: 'var(--m3-radius-card)', background: 'rgba(225,227,222,0.3)', border: '1px dashed #c0c9c3' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '0.15px', color: 'var(--m3-green-deep)' }}>Price Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    <span style={{ display: 'block', fontSize: 14, letterSpacing: '0.25px', color: 'var(--m3-ink)' }}>Companion time</span>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)', textTransform: 'capitalize' }}>{serviceLabel}</span>
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--m3-ink)' }}>{formatINR(basePaise)}</span>
                </div>
                {eveningPaise > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>
                      <span style={{ display: 'block', fontSize: 14, letterSpacing: '0.25px', color: 'var(--m3-ink)' }}>Evening slot</span>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>Bookings starting 6–8pm</span>
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--m3-ink)' }}>{formatINR(eveningPaise)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid rgba(192,201,195,0.5)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.55px', textTransform: 'uppercase', color: 'var(--m3-green-deep)' }}>Total</span>
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: 28, lineHeight: '36px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>{formatINR(totalPaise)}</span>
                    <span style={{ display: 'block', fontSize: 12, fontStyle: 'italic', letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>Pay after your visit — cash or UPI</span>
                  </span>
                </div>
                <span style={{ fontSize: 12, letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>
                  Runs over? First {GRACE_MINUTES} min free, then ₹4/min — never more than the next duration up.
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'rgba(64,73,69,0.7)', textAlign: 'center' }}>
              By tapping &quot;Confirm Booking&quot;, you agree to Caresy&apos;s{' '}
              <Link href="/terms" style={{ color: 'var(--m3-green-deep)' }}>Terms of Service</Link> and{' '}
              <Link href="/privacy" style={{ color: 'var(--m3-green-deep)' }}>Cancellation Policy</Link>.
            </p>
          </div>
        )}

        {/* Footer action — sticky so Continue is always reachable. On the longer
            steps (hospital + pincode + department + doctor) it used to sit below
            the fold, and people could not tell the form had an end. */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
            padding: '16px 0 max(16px, env(safe-area-inset-bottom))',
            background: 'linear-gradient(to bottom, rgba(242,244,239,0) 0%, var(--m3-bg) 22%)',
          }}
        >
          {review ? (
            <button onClick={handleConfirm} disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', height: 64, borderRadius: 999, border: 'none', background: 'var(--m3-green-deep)', color: '#fff', fontSize: 22, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? <><Loader2 className="animate-spin" style={{ width: 22, height: 22 }} /> Confirming…</> : <>Confirm Booking <ArrowRight style={{ width: 16, height: 16 }} /></>}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <button onClick={goNext} disabled={!isStepValid(step)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 56, borderRadius: 999, border: 'none', background: 'var(--m3-green)', color: isStepValid(step) ? '#fff' : 'var(--m3-green-soft)', fontSize: 14, fontWeight: 500, letterSpacing: '0.1px', cursor: isStepValid(step) ? 'pointer' : 'default', fontFamily: 'inherit', opacity: isStepValid(step) ? 1 : 0.5 }}>
                {step === TOTAL_STEPS ? 'Review Booking' : 'Continue'}
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
              <span
                role={blockingReason(step) ? 'status' : undefined}
                style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', textAlign: 'center', color: blockingReason(step) ? 'var(--terracotta, #c45543)' : 'var(--m3-muted)' }}
              >
                {blockingReason(step) || 'You can change your selection later'}
              </span>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
