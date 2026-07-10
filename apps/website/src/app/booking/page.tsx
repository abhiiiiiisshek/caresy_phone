'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
import { useLiveMetrics } from '@/hooks/useLiveMetrics';
import { matchCompanionByDepartment } from '@/data/companions';
import { Input, Button, CompanionCard } from '@caresy/ui';
import { checkPincodeServed, isValidPincode } from '@/utils/serviceArea';

const STEPS = ['Patient details', 'Appointment details', 'Support needed'];
const DRAFT_KEY = 'caresy_booking_draft';

export default function Booking() {
  const { user, openLogin } = useAuth();

  const [step, setStep] = useState(1);

  // Step 1: Patient details
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergency, setEmergency] = useState('');

  // Step 2: Appointment details
  const [hospital, setHospital] = useState('');
  const [pincode, setPincode] = useState('');
  const [areaStatus, setAreaStatus] = useState<'idle' | 'checking' | 'served' | 'not_served'>('idle');
  const [areaLabel, setAreaLabel] = useState('');
  const [department, setDepartment] = useState('');
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [language, setLanguage] = useState('No preference');

  // Step 3: Support needed
  const [service, setService] = useState('Hospital Companion');
  const [careNeeds, setCareNeeds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);

  const { deskCompanions, callbackMin } = useLiveMetrics();

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
      setService(draft.service || 'Hospital Companion');
      setCareNeeds(draft.careNeeds || []);
      setNotes(draft.notes || '');
      setStep(STEPS.length);
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore malformed/unavailable sessionStorage
    }
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

  const handleCheckboxChange = (need: string) => {
    if (careNeeds.includes(need)) {
      setCareNeeds(careNeeds.filter(n => n !== need));
    } else {
      setCareNeeds([...careNeeds, need]);
    }
  };

  const getServicePrice = () => {
    if (service.includes('Pickup')) return '₹899';
    if (service.includes('Full Day')) return '₹1,299';
    if (service.includes('Custom')) return 'Quote after review';
    return '₹499';
  };

  const isStepValid = (s: number) => {
    if (s === 1) return patientName.trim() !== '' && phone.trim() !== '' && email.trim() !== '';
    if (s === 2) return hospital.trim() !== '' && date !== '' && time !== '' && areaStatus === 'served';
    return true;
  };

  const goNext = () => {
    if (!isStepValid(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const matched = matchCompanionByDepartment(department);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < STEPS.length) {
      goNext();
      return;
    }

    if (!user) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          patientName, age, phone, email, emergency,
          hospital, pincode, department, doctor, date, time, language,
          service, careNeeds, notes,
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

      let serviceEnum = 'HOSPITAL_COMPANION';
      if (service.includes('Pickup')) serviceEnum = 'APPOINTMENT_ASSISTANCE';

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
          estimated_duration_minutes: service.includes('Full Day') ? 480 : 240,
          service_metadata: {
            customerEmail: email,
            customerPhone: phone,
            doctor,
            department,
            language,
            careNeeds,
            originalService: service,
          },
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      setSuccessBookingId(bookingData.reference_code);
    } catch (err: any) {
      console.error('Error submitting booking request:', err);
      alert(err.message || 'Failed to submit booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successBookingId) {
    return (
      <main className="page" id="main-content">
        <section className="section" style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '40px' }}>
          <div className="material-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', margin: '0 auto 24px', borderRadius: '50%', background: 'var(--sage)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
              <Check style={{ width: '40px', height: '40px' }} strokeWidth={3} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px' }}>Request generated!</h1>
            <p style={{ color: 'var(--muted)', fontSize: '1.05rem', marginBottom: '24px' }}>
              We&apos;ve received your booking request. Operations will review it shortly and assign a companion.
            </p>
            <div className="summary-note" style={{ marginBottom: '32px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--muted)' }}>Booking ID</span>
              <p style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary-dark)', margin: '4px 0 0' }}>{successBookingId}</p>
            </div>
            <div className="wizard-nav" style={{ flexDirection: 'column' }}>
              <Link href="/my-bookings" className="btn btn-primary full">Go to My Bookings</Link>
              <Link href="/" className="btn btn-outline full">Return Home</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page booking-page" id="main-content">
      <section className="page-hero">
        <p className="eyebrow">Planned hospital visit</p>
        <h1>Book a companion for an upcoming appointment.</h1>
        <p>Use this when the visit is not urgent and you know the hospital, date, time, and patient support needs.</p>
      </section>

      <div style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: '0 24px 20px' }}>
        <div className="material-card" style={{ background: 'rgba(13, 122, 102, 0.04)', borderColor: 'rgba(13, 122, 102, 0.15)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pulse"></span>
            <div>
              <strong style={{ color: 'var(--primary-dark)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Live Operations Desk</strong>
              <p style={{ margin: '3px 0 0', fontSize: '0.92rem', color: 'var(--muted)' }}>Desk Status: <strong>Active</strong> &bull; Estimated Callback: <strong>{callbackMin} mins</strong> &bull; Nearby Companions: <strong>{deskCompanions} online</strong></p>
            </div>
          </div>
          <a href="https://wa.me/919717500225" target="_blank" rel="noopener" className="btn btn-glass" style={{ minHeight: 'auto', padding: '8px 14px', fontSize: '0.84rem', color: '#27a875', borderColor: '#27a875' }}>Chat on WhatsApp &rarr;</a>
        </div>
      </div>

      <section className="section booking-layout">
        <form className="booking-form material-card" onSubmit={handleFormSubmit}>

          <div className="wizard-progress">
            {STEPS.map((label, idx) => {
              const num = idx + 1;
              const state = num < step ? 'completed' : num === step ? 'active' : '';
              return (
                <React.Fragment key={label}>
                  <div className={`wizard-progress-step ${state}`}>
                    <div className="wizard-progress-dot">{num < step ? <Check style={{ width: '16px', height: '16px' }} /> : num}</div>
                    <span className="wizard-progress-label">{label}</span>
                  </div>
                  {idx < STEPS.length - 1 && <div className={`wizard-progress-connector ${num < step ? 'completed' : ''}`} />}
                </React.Fragment>
              );
            })}
          </div>

          {step === 1 && (
            <div className="form-section" style={{ border: 'none', paddingBottom: 0, marginBottom: 0 }}>
              <h2>Patient details</h2>
              <div className="form-row">
                <Input label="Patient name" name="patientName" type="text" placeholder="Ramesh Kumar" required value={patientName} onChange={(e) => setPatientName(e.target.value)} />
                <Input label="Age" name="age" type="number" min={1} max={120} placeholder="68" value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
              <div className="form-row">
                <Input label="Customer mobile" name="phone" type="tel" placeholder="+91 97175 00225" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input label="Customer email" name="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-row">
                <Input label="Emergency contact" name="emergency" type="tel" placeholder="+91 99887 77665" value={emergency} onChange={(e) => setEmergency(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-section" style={{ border: 'none', paddingBottom: 0, marginBottom: 0 }}>
              <h2>Appointment details</h2>
              <div className="form-row">
                <Input label="Hospital" name="hospital" type="text" placeholder="Apollo Hospitals" required value={hospital} onChange={(e) => setHospital(e.target.value)} />
                <Input label="Department" name="department" type="text" placeholder="Cardiology" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div className="form-row">
                <Input
                  label="Pincode (Noida / Greater Noida)" name="pincode" required
                  inputMode="numeric" maxLength={6} placeholder="201301"
                  value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  hint={
                    areaStatus === 'checking' ? 'Checking availability…'
                    : areaStatus === 'served' ? `✓ We serve ${areaLabel || 'this area'}`
                    : areaStatus === 'not_served' ? '✗ Sorry, we don’t serve this pincode yet — we currently cover Noida & Greater Noida.'
                    : 'We currently serve Noida & Greater Noida only.'
                  }
                />
              </div>
              <div className="form-row">
                <Input label="Doctor name" name="doctor" type="text" placeholder="Dr. Mehta" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
                <Input label="Appointment date" name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="form-row">
                <Input label="Appointment time" name="time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
                <label>Preferred language
                  <select name="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option>No preference</option>
                    <option>Hindi</option>
                    <option>English</option>
                    <option>Tamil</option>
                    <option>Telugu</option>
                    <option>Kannada</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-section" style={{ border: 'none', paddingBottom: 0, marginBottom: 0 }}>
              <h2>Support needed</h2>
              <label>Service type
                <select name="service" value={service} onChange={(e) => setService(e.target.value)}>
                  <option value="Hospital Companion">Hospital Companion (₹499)</option>
                  <option value="Hospital Companion + Pickup">Hospital Companion + Pickup (₹899)</option>
                  <option value="Full Day Companion">Full Day Companion (₹1,299)</option>
                  <option value="Custom Support">Custom Support (Quote after review)</option>
                </select>
              </label>
              <fieldset>
                <legend>Care needs</legend>
                {['Wheelchair', 'Walking assistance', 'Medicine collection'].map((need) => (
                  <label className="check" key={need}>
                    <input type="checkbox" value={need} checked={careNeeds.includes(need)} onChange={() => handleCheckboxChange(need)} /> {need}
                  </label>
                ))}
              </fieldset>
              <Input label="Additional notes" name="notes" multiline rows={4} placeholder="Medical notes, address, special requirements" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}

          <div className="wizard-nav">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={goBack} iconLeft={<ArrowLeft style={{ width: '18px', height: '18px' }} />}>
                Back
              </Button>
            ) : <span />}

            {step < STEPS.length ? (
              <Button type="button" variant="primary" onClick={goNext} disabled={!isStepValid(step)} iconRight={<ArrowRight style={{ width: '18px', height: '18px' }} />}>
                Continue
              </Button>
            ) : (
              <Button type="submit" variant="primary" disabled={isSubmitting} iconRight={isSubmitting ? undefined : <ArrowRight style={{ width: '18px', height: '18px' }} />}>
                {isSubmitting ? <><Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} /> Generating...</> : 'Generate booking request'}
              </Button>
            )}
          </div>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <aside className="booking-summary material-card" aria-live="polite">
            <p className="eyebrow">Request preview</p>
            <h2>{patientName && hospital ? 'CRS-READY' : 'CRS-XXXX'}</h2>
            <dl>
              <div><dt>Status</dt><dd>{patientName && hospital ? 'Ready to request' : 'Form incomplete'}</dd></div>
              <div><dt>Patient</dt><dd>{patientName || '—'}</dd></div>
              <div><dt>Hospital</dt><dd>{hospital || '—'}</dd></div>
              <div><dt>Department</dt><dd>{department || '—'}</dd></div>
              <div><dt>Service</dt><dd>{service} ({getServicePrice()})</dd></div>
            </dl>
            <div className="summary-note">
              <strong>After review</strong>
              <p>Operations assigns a companion based on distance, experience, language, and preference.</p>
            </div>
          </aside>

          <aside className="matcher-widget material-card" style={{ padding: '24px', borderColor: 'rgba(13, 122, 102, 0.13)' }}>
            <p className="eyebrow">Companion matcher</p>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Who you might get</h2>
            <CompanionCard
              name={matched.name}
              photo={matched.photo}
              initials={matched.avatarInitials}
              rating={matched.rating}
              visits={matched.visits}
              verification={matched.verification}
              languages={matched.languages}
              specialty={matched.specialty}
              style={{ width: 'auto' }}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '14px', marginBottom: 0 }}>
              *Illustrative example matched by specialty. Your actual companion is confirmed by operations after review.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
