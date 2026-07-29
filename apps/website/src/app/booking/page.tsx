'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import {
  ArrowRight, ArrowLeft, Loader2, Check, CheckCircle2, Stethoscope,
  Building2, MapPin, CalendarDays, Clock, Star, BadgeCheck,
  ChevronLeft, ChevronRight, CalendarPlus, Home as HomeIcon, Send,
} from 'lucide-react';
import { matchCompanionByDepartment } from '@/data/companions';
import HospitalAutocomplete from '@/components/HospitalAutocomplete';
import { pincodeForArea } from '@/data/hospitals';
import { Input } from '@caresy/ui';
import { checkPincodeServed, isValidPincode, listServedAreas, type ServiceArea } from '@caresy/utils';
import { priceForMinutes, formatINR, eveningSurchargePaise, GRACE_MINUTES } from '@caresy/utils/pricing';

const EPILOGUE = 'var(--font-epilogue), sans-serif';
const DRAFT_KEY = 'caresy_booking_draft';
const TOTAL_STEPS = 4;

// Durations replace the old service tiers (₹499/₹899/₹1,299). Price comes from
// the shared meter, so the numbers here can never drift from what the bill
// says. Pickup & drop stopped being a ₹400 tier and became a care need.
const DURATIONS = [1, 2, 4, 6, 8].map((hours) => ({
  hours,
  label: hours === 8 ? 'Full day' : `${hours} hour${hours > 1 ? 's' : ''}`,
  paise: priceForMinutes(hours * 60),
}));

const CARE_NEEDS = ['Wheelchair', 'Walking assistance', 'Medicine collection', 'Home pickup & drop', 'Companion drives your car/bike'];
const TIME_SLOTS = ['09:00', '10:00', '11:30', '13:00', '14:30', '16:00', '17:00', '18:00', '19:00'];
const LANGUAGES = ['No preference', 'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada'];

function fmtSlot(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`;
}

const label: React.CSSProperties = { fontSize: 14, fontWeight: 500, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--m3-green-deep)' };

function StepHeader({ step, title, sub }: { step: number; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--m3-green-deep)' }}>Step {step} of {TOTAL_STEPS}</span>
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700, color: 'var(--m3-green-deep)' }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: 'var(--m3-muted)' }}>{sub}</p>
    </div>
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

  // Step 1: Duration. 2 hours preselected — the typical OPD visit, and the
  // middle of the menu.
  const [durationHours, setDurationHours] = useState(2);
  const [careNeeds, setCareNeeds] = useState<string[]>([]);

  // Step 2: Hospital
  const [hospital, setHospital] = useState('');
  const [pincode, setPincode] = useState('');
  const [areaStatus, setAreaStatus] = useState<'idle' | 'checking' | 'served' | 'not_served'>('idle');
  // True while the pincode came from the picked hospital's area rather than typing.
  const [pinAutoFilled, setPinAutoFilled] = useState(false);
  const [areaLabel, setAreaLabel] = useState('');
  const [department, setDepartment] = useState('');
  const [doctor, setDoctor] = useState('');

  // Step 3: Patient
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
      setDate(draft.date || '');
      setTime(draft.time || '');
      setLanguage(draft.language || 'No preference');
      setDurationHours(draft.durationHours || 2);
      setCareNeeds(draft.careNeeds || []);
      setNotes(draft.notes || '');
      setStep(TOTAL_STEPS);
      setReview(true);
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore malformed/unavailable sessionStorage
    }
  }, []);

  // The pincodes we cover, offered as quick-picks. People were asked to type a
  // pincode for a hospital they had just chosen from a list, with no way to know
  // which ones we accept. Same table the check below reads, so it cannot drift.
  const [servedAreas, setServedAreas] = useState<ServiceArea[]>([]);
  useEffect(() => {
    let alive = true;
    listServedAreas().then((a) => { if (alive) setServedAreas(a); });
    return () => { alive = false; };
  }, []);

  // Live service-area check as the pincode is typed.
  useEffect(() => {
    if (!isValidPincode(pincode)) { setAreaStatus('idle'); setAreaLabel(''); return; }
    let cancelled = false;
    setAreaStatus('checking');
    checkPincodeServed(pincode).then(({ served, area }) => {
      if (cancelled) return;
      setAreaStatus(served ? 'served' : 'not_served');
      setAreaLabel(area?.area_name || area?.city || '');
    });
    return () => { cancelled = true; };
  }, [pincode]);

  const toggleNeed = (need: string) =>
    setCareNeeds(careNeeds.includes(need) ? careNeeds.filter((n) => n !== need) : [...careNeeds, need]);

  const serviceLabel = `${DURATIONS.find((d) => d.hours === durationHours)?.label || `${durationHours} hours`} companion`;
  const basePaise = priceForMinutes(durationHours * 60);
  // ₹99 on 6–8pm starts. Slot strings are the customer's wall clock, so the
  // hour can be read straight off the front of "18:00".
  const eveningPaise = time ? eveningSurchargePaise(parseInt(time, 10)) : 0;
  const totalPaise = basePaise + eveningPaise;

  const isStepValid = (s: number) => {
    if (s === 1) return durationHours > 0;
    if (s === 2) return hospital.trim() !== '' && areaStatus === 'served';
    if (s === 3) return patientName.trim() !== '' && phone.trim() !== '' && email.trim() !== '';
    if (s === 4) return date !== '' && time !== '';
    return true;
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
          durationHours, careNeeds, notes,
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
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        alert('Authentication error. Please log in.');
        setIsSubmitting(false);
        return;
      }

      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          customer_user_id: currentUser.id,
          full_name: patientName,
          age: age ? parseInt(age) : null,
          emergency_contact_phone: emergency || null,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .insert({
          customer_user_id: currentUser.id,
          title: hospital,
          address_line_1: hospital,
          city: areaLabel || 'Noida',
          state: 'Uttar Pradesh',
          pincode: pincode.trim(),
        })
        .select()
        .single();

      if (locationError) throw locationError;

      // Pickup used to be its own ₹899 tier; now it's a care need on the same
      // meter. The enum split is kept so ops can still see which jobs involve
      // a home pickup leg.
      const wantsPickup = careNeeds.includes('Home pickup & drop');
      const serviceEnum = wantsPickup ? 'APPOINTMENT_ASSISTANCE' : 'HOSPITAL_COMPANION';

      const scheduledStart = new Date(`${date}T${time}:00`);
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_user_id: currentUser.id,
          patient_id: patientData.id,
          pickup_location_id: locationData.id,
          service_type: serviceEnum,
          booking_type: 'SCHEDULED',
          status: 'PENDING',
          scheduled_start_time: scheduledStart.toISOString(),
          special_instructions: notes || '',
          estimated_duration_minutes: durationHours * 60,
          service_metadata: {
            customerEmail: email,
            customerPhone: phone,
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
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
          </div>

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
            <StepHeader step={1} title="How long do you need us?" sub="A verified companion through queues, consultations and paperwork — pay for the time you use." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DURATIONS.map((d) => {
                const active = durationHours === d.hours;
                const fullDay = d.hours === 8;
                return (
                  <button key={d.hours} onClick={() => setDurationHours(d.hours)} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '17px 20px', borderRadius: 'var(--m3-radius-card)', background: active ? '#fff' : 'var(--m3-chip)', border: active ? '2px solid var(--m3-green-deep)' : '2px solid transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', boxShadow: active ? '0 4px 12px rgba(0,0,0,0.08)' : 'none' }}>
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
            </div>
            <p style={{ margin: '-8px 4px 0', fontSize: 12.5, lineHeight: '18px', color: 'var(--m3-muted)' }}>
              Runs a little over? First {GRACE_MINUTES} minutes are free, then just ₹4 a minute.
              We always charge whichever is less.
            </p>
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
          </div>
        )}

        {!review && step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <StepHeader step={3} title="Patient Details" sub="Who will our companion be supporting? We keep this private and secure." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 25, borderRadius: 'var(--m3-radius-card)', background: '#fff', border: '1px solid var(--m3-line)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <Input label="Patient name" name="patientName" placeholder="Ramesh Kumar" required value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                <Input label="Age" name="age" type="number" min={1} max={120} placeholder="68" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <Input label="Customer mobile" name="phone" type="tel" placeholder="+91 97175 00225" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Customer email" name="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Emergency contact" name="emergency" type="tel" placeholder="+91 99887 77665" value={emergency} onChange={(e) => setEmergency(e.target.value)} />
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
            <Calendar value={date} onChange={setDate} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={label}>Available times</span>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {TIME_SLOTS.map((t) => {
                  const evening = eveningSurchargePaise(parseInt(t, 10)) > 0;
                  return (
                    <button key={t} onClick={() => setTime(t)} style={chip(time === t)}>
                      {fmtSlot(t)}{evening ? ' · +₹99' : ''}
                    </button>
                  );
                })}
              </div>
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
              <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.5px', color: 'var(--m3-muted)' }}>You can change your selection later</span>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
