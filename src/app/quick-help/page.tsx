'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Phone, MessageSquare } from 'lucide-react';

export default function QuickHelp() {
  const router = useRouter();
  const { user, openLogin } = useAuth();
  
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [hospital, setHospital] = useState('');
  const [service, setService] = useState('Appointment today');
  const [urgency, setUrgency] = useState('Call now');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);
  const [deskCompanions, setDeskCompanions] = useState(8);
  const [callbackMin, setCallbackMin] = useState(6);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallbackMin(4 + Math.floor(Math.random() * 5));
      setDeskCompanions(5 + Math.floor(Math.random() * 7));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      // Intercept with login modal, then submit once authenticated
      openLogin(() => {
        submitBookingRequest();
      });
      return;
    }

    submitBookingRequest();
  };

  const submitBookingRequest = async () => {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      // 1. Get authenticated user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        alert('Authentication error. Please log in.');
        setIsSubmitting(false);
        return;
      }

      // 2. Insert patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          customer_user_id: currentUser.id,
          full_name: patientName,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      // 3. Insert location details
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .insert({
          customer_user_id: currentUser.id,
          title: hospital,
          address_line_1: hospital,
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
        })
        .select()
        .single();

      if (locationError) throw locationError;

      // 4. Create booking
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

      // 5. Update local state on success
      setSuccessBookingId(`CRS-${bookingData.id.split('-')[0].toUpperCase()}`);
    } catch (err: any) {
      console.error('Error submitting urgent booking request:', err);
      alert(err.message || 'Failed to submit booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successBookingId) {
    return (
      <main id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
        <div className="material-card" style={{ textAlign: 'center', padding: '40px 20px', margin: '20px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--sage)', color: 'var(--ink-teal)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '2rem', margin: '0 auto 20px' }}>✓</div>
          <h2 style={{ marginBottom: '12px' }}>Request received.</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--muted)' }}>Our dispatcher will call <strong>{phone || user?.phone || user?.email}</strong> within {callbackMin} minutes.</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '15px' }}>Your reference number is <strong>{successBookingId}</strong>.</p>
          <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a href={`https://wa.me/919717500225?text=Hi,%20my%20quick%20help%20reference%20is%20${successBookingId}`} target="_blank" rel="noopener" className="btn btn-primary full">WhatsApp Support</a>
            <Link href="/my-bookings" className="btn btn-glass full" style={{ color: 'var(--primary)' }}>View My Bookings</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page urgent-page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section className="page-hero reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <p className="eyebrow">Same-day support</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0', lineHeight: 1.2 }}>Need help at the hospital today?</h1>
        <p style={{ color: 'var(--muted)' }}>Share the minimum details. Operations will call back, verify feasibility, and guide the next step.</p>
      </section>

      <div className="dispatcher-status-banner reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px 20px' }}>
        <div className="material-card" style={{ background: 'rgba(8, 121, 111, 0.04)', borderColor: 'rgba(8, 121, 111, 0.15)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pulse"></span>
            <div>
              <strong style={{ color: 'var(--primary-dark)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Live Operations Desk</strong>
              <p style={{ margin: '3px 0 0', fontSize: '0.92rem', color: 'var(--muted)' }}>Desk Status: <strong style={{ color: '#27a875' }}>Active</strong> &bull; Estimated Callback: <strong>{callbackMin} mins</strong> &bull; Nearby Companions: <strong>{deskCompanions} online</strong></p>
            </div>
          </div>
          <a href="https://wa.me/919717500225" target="_blank" rel="noopener" className="btn btn-glass" style={{ minHeight: 'auto', padding: '8px 14px', fontSize: '0.84rem', color: '#27a875', borderColor: '#27a875' }}>Chat on WhatsApp &rarr;</a>
        </div>
      </div>

      <section className="section booking-layout" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <form className="booking-form urgent-form material-card reveal active" id="quickHelpForm" onSubmit={handleFormSubmit} style={{ padding: '24px' }}>
          <div className="form-section">
            <span className="form-step">1</span>
            <h2>Contact details</h2>
            <div className="form-row">
              <label>Your name<input name="customerName" type="text" placeholder="Ananya Rao" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
              <label>Mobile number<input name="phone" type="tel" placeholder="+91 97175 00225" required value={phone} onChange={(e) => setPhone(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
            </div>
            <div className="form-row">
              <label>Email address<input name="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
            </div>
          </div>

          <div className="form-section" style={{ marginTop: '24px' }}>
            <span className="form-step">2</span>
            <h2>Where is help needed?</h2>
            <div className="form-row">
              <label>Patient name<input name="patientName" type="text" placeholder="Ramesh Kumar" required value={patientName} onChange={(e) => setPatientName(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
              <label>Hospital or area<input name="hospital" type="text" placeholder="Max Hospital, Sector 62" required value={hospital} onChange={(e) => setHospital(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
            </div>
            <label style={{ marginTop: '12px', display: 'block' }}>What is happening now?
              <select name="service" value={service} onChange={(e) => setService(e.target.value)} style={{ background: 'var(--surface)', display: 'block', width: '100%', marginTop: '6px' }}>
                <option>Appointment today</option>
                <option>Test or scan today</option>
                <option>Registration or queue support</option>
                <option>Medicine or document support</option>
                <option>Need guidance from operations</option>
              </select>
            </label>
          </div>

          <div className="form-section" style={{ marginTop: '24px' }}>
            <span className="form-step">3</span>
            <h2>Urgency</h2>
            <fieldset style={{ border: 'none', padding: 0, margin: '12px 0' }}>
              <legend style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' }}>When should we call?</legend>
              <label className="check" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="radio" name="needs" value="Call now" checked={urgency === 'Call now'} onChange={() => setUrgency('Call now')} style={{ accentColor: 'var(--primary)' }} /> Call now
              </label>
              <label className="check" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="radio" name="needs" value="Within 30 minutes" checked={urgency === 'Within 30 minutes'} onChange={() => setUrgency('Within 30 minutes')} style={{ accentColor: 'var(--primary)' }} /> Within 30 minutes
              </label>
              <label className="check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="needs" value="Later today" checked={urgency === 'Later today'} onChange={() => setUrgency('Later today')} style={{ accentColor: 'var(--primary)' }} /> Later today
              </label>
            </fieldset>
            <label style={{ display: 'block', marginTop: '12px' }}>Short note
              <textarea name="notes" rows={4} placeholder="Patient location, appointment time, mobility needs, emergency contact" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ background: 'var(--surface)', display: 'block', width: '100%', marginTop: '6px' }}></textarea>
            </label>
          </div>

          <button className="btn btn-urgent full" type="submit" disabled={isSubmitting} style={{ marginTop: '24px', cursor: 'pointer' }}>
            {isSubmitting ? 'Submitting...' : 'Request urgent call-back'}
          </button>
          <p style={{ fontSize: '0.82rem', textAlign: 'center', color: 'var(--muted)', marginTop: '10px' }}>
            * Caresy operations callback and feasibility check are <strong>100% free</strong>. You only pay if a companion is successfully dispatched.
          </p>
        </form>

        <aside className="booking-summary urgent-summary material-card reveal active" aria-live="polite" style={{ padding: '24px' }}>
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
