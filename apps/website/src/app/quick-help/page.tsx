'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@caresy/auth';
import { createClient } from '@caresy/auth/supabase/client';
import { MessageSquare, Check } from 'lucide-react';
import { useLiveMetrics } from '@/hooks/useLiveMetrics';
import { Input, Button } from '@caresy/ui';
import { checkPincodeServed, isValidPincode } from '@/utils/serviceArea';

const DRAFT_KEY = 'caresy_quickhelp_draft';

export default function QuickHelp() {
  const { user, openLogin } = useAuth();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [hospital, setHospital] = useState('');
  const [pincode, setPincode] = useState('');
  const [areaStatus, setAreaStatus] = useState<'idle' | 'checking' | 'served' | 'not_served'>('idle');
  const [areaLabel, setAreaLabel] = useState('');
  const [service, setService] = useState('Appointment today');
  const [urgency, setUrgency] = useState('Call now');
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
      setCustomerName(draft.customerName || '');
      setPhone(draft.phone || '');
      setEmail(draft.email || '');
      setPatientName(draft.patientName || '');
      setHospital(draft.hospital || '');
      setPincode(draft.pincode || '');
      setService(draft.service || 'Appointment today');
      setUrgency(draft.urgency || 'Call now');
      setNotes(draft.notes || '');
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (areaStatus !== 'served') {
      alert('Sorry, we don’t serve this pincode yet. Caresy currently operates in Noida & Greater Noida.');
      return;
    }

    if (!user) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          customerName, phone, email, patientName, hospital, pincode, service, urgency, notes,
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

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_user_id: currentUser.id,
          patient_id: patientData.id,
          pickup_location_id: locationData.id,
          service_type: 'HOSPITAL_COMPANION',
          booking_type: 'INSTANT',
          status: 'PENDING',
          special_instructions: notes || '',
          service_metadata: {
            customerName,
            phone,
            email,
            urgency,
            category: service,
          },
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      setSuccessBookingId(bookingData.reference_code);
    } catch (err: any) {
      console.error('Error submitting urgent booking request:', err);
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
            <div style={{ width: '80px', height: '80px', margin: '0 auto 24px', borderRadius: '50%', background: 'rgba(39, 168, 117, 0.14)', color: '#1e7e58', display: 'grid', placeItems: 'center' }}>
              <Check style={{ width: '40px', height: '40px' }} strokeWidth={3} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px' }}>Request received!</h1>
            <p style={{ color: 'var(--muted)', fontSize: '1.05rem', marginBottom: '24px' }}>
              Our dispatcher will call <strong style={{ color: 'var(--ink)' }}>{phone || user?.email}</strong> within {callbackMin} minutes.
            </p>
            <div className="summary-note" style={{ marginBottom: '32px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--muted)' }}>Reference number</span>
              <p style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary-dark)', margin: '4px 0 0' }}>{successBookingId}</p>
            </div>
            <div className="wizard-nav" style={{ flexDirection: 'column' }}>
              <a href={`https://wa.me/919717500225?text=Hi,%20my%20quick%20help%20reference%20is%20${successBookingId}`} target="_blank" rel="noopener" className="btn btn-urgent full">
                <MessageSquare style={{ width: '18px', height: '18px' }} /> Chat on WhatsApp
              </a>
              <Link href="/my-bookings" className="btn btn-outline full">View My Bookings</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page urgent-page" id="main-content">
      <section className="page-hero">
        <p className="eyebrow">Same-day support</p>
        <h1>Need help at the hospital today?</h1>
        <p>Share the minimum details. Operations can call back, verify feasibility, and guide the next step.</p>
      </section>

      <div style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: '0 24px 20px' }}>
        <div className="material-card" style={{ background: 'rgba(196, 85, 67, 0.05)', borderColor: 'rgba(196, 85, 67, 0.18)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pulse"></span>
            <div>
              <strong style={{ color: 'var(--primary-dark)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Live Operations Desk</strong>
              <p style={{ margin: '3px 0 0', fontSize: '0.92rem', color: 'var(--muted)' }}>Desk Status: <strong>Active</strong> &bull; Estimated Callback: <strong>{callbackMin} mins</strong> &bull; Companions Online: <strong>{deskCompanions}</strong></p>
            </div>
          </div>
          <a href="https://wa.me/919717500225" target="_blank" rel="noopener" className="btn btn-glass" style={{ minHeight: 'auto', padding: '8px 14px', fontSize: '0.84rem', color: '#27a875', borderColor: '#27a875' }}>Chat on WhatsApp &rarr;</a>
        </div>
      </div>

      <section className="section booking-layout">
        <form className="booking-form urgent-form material-card" onSubmit={handleFormSubmit}>
          <div className="form-section">
            <span className="form-step">1</span>
            <h2>Contact details</h2>
            <div className="form-row">
              <Input label="Your name" name="customerName" type="text" placeholder="Ananya Rao" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <Input label="Mobile number" name="phone" type="tel" placeholder="+91 97175 00225" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-row">
              <Input label="Email address" name="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="form-section">
            <span className="form-step">2</span>
            <h2>Where is help needed?</h2>
            <div className="form-row">
              <Input label="Patient name" name="patientName" type="text" placeholder="Ramesh Kumar" required value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              <Input label="Hospital or area" name="hospital" type="text" placeholder="Max Hospital, Sector 62" required value={hospital} onChange={(e) => setHospital(e.target.value)} />
            </div>
            <div className="form-row">
              <Input
                label="Pincode (Noida / Greater Noida)" name="pincode" required
                inputMode="numeric" maxLength={6} placeholder="201301"
                value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                hint={
                  areaStatus === 'checking' ? 'Checking availability…'
                  : areaStatus === 'served' ? `✓ We serve ${areaLabel || 'this area'}`
                  : areaStatus === 'not_served' ? '✗ Sorry, we don’t serve this pincode yet — Noida & Greater Noida only.'
                  : 'We currently serve Noida & Greater Noida only.'
                }
              />
            </div>
            <label>What is happening now?
              <select name="service" value={service} onChange={(e) => setService(e.target.value)}>
                <option>Appointment today</option>
                <option>Test or scan today</option>
                <option>Registration or queue support</option>
                <option>Medicine or document support</option>
                <option>Need guidance from operations</option>
              </select>
            </label>
          </div>

          <div className="form-section">
            <span className="form-step">3</span>
            <h2>Urgency</h2>
            <fieldset>
              <legend>When should we call?</legend>
              {['Call now', 'Within 30 minutes', 'Later today'].map((opt) => (
                <label className="check" key={opt}>
                  <input type="radio" name="urgency" value={opt} checked={urgency === opt} onChange={() => setUrgency(opt)} /> {opt}
                </label>
              ))}
            </fieldset>
            <Input label="Short note" name="notes" multiline rows={4} placeholder="Patient location, appointment time, mobility needs, emergency contact" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="submit" variant="urgent" full shape="pill" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Request urgent call-back'}
          </Button>
          <p style={{ fontSize: '0.82rem', textAlign: 'center', color: 'var(--muted)', marginTop: '10px' }}>
            * Caresy operations callback and feasibility check are <strong>100% free</strong>. You only pay if a companion is successfully dispatched.
          </p>
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>Or connect with us instantly:</span><br />
            <a href="https://wa.me/919717500225" target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#27a875', fontWeight: 700, marginTop: '8px' }}>
              <MessageSquare style={{ width: '18px', height: '18px' }} /> Chat on WhatsApp for urgent help
            </a>
          </div>
        </form>

        <aside className="booking-summary urgent-summary material-card" aria-live="polite">
          <p className="eyebrow">Urgent request</p>
          <h2>Call-back pending</h2>
          <dl>
            <div><dt>Status</dt><dd>Operations review needed</dd></div>
            <div><dt>Best for</dt><dd>Same-day appointments, tests, registration, or queue support</dd></div>
            <div><dt>Important</dt><dd>Caresy is assistance and coordination, not emergency medical care</dd></div>
          </dl>
          <div className="summary-note">
            <strong>Emergency boundary</strong>
            <p>If the patient condition is worsening, contact hospital emergency services first.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
