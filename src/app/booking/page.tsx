'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { Star } from 'lucide-react';

const COMPANION_DATABASE = {
  cardiology: {
    name: 'Priya Sharma',
    avatar: 'PS',
    photo: '/assets/caresy-companion-priya.png',
    rating: '4.9 (82 visits)',
    verification: 'Police Verified',
    lang: 'Hindi, English',
    specialty: 'Cardiology',
    color: '#08796f'
  },
  orthopedics: {
    name: 'Anil Kumar',
    avatar: 'AK',
    photo: '/assets/caresy-companion-anil.png',
    rating: '4.8 (120 visits)',
    verification: 'Police Verified',
    lang: 'Kannada, Tamil, English',
    specialty: 'Orthopedics',
    color: '#08796f'
  },
  general: {
    name: 'Sarah Mathews',
    avatar: 'SM',
    photo: '/assets/caresy-companion-sarah.png',
    rating: '4.9 (65 visits)',
    verification: 'Police Verified',
    lang: 'Malayalam, Telugu, English',
    specialty: 'General Care',
    color: '#08796f'
  }
};

export default function Booking() {
  const { user, openLogin } = useAuth();

  // Step 1: Patient details
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergency, setEmergency] = useState('');

  // Step 2: Appointment details
  const [hospital, setHospital] = useState('');
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

  // Live status states
  const [deskCompanions, setDeskCompanions] = useState(8);
  const [callbackMin, setCallbackMin] = useState(6);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallbackMin(4 + Math.floor(Math.random() * 5));
      setDeskCompanions(5 + Math.floor(Math.random() * 7));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

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

  const getMatchedCompanion = () => {
    if (!patientName && !hospital && !department) return null;
    const deptLower = department.toLowerCase();
    if (deptLower.includes('cardio') || deptLower.includes('heart')) {
      return COMPANION_DATABASE.cardiology;
    }
    if (deptLower.includes('ortho') || deptLower.includes('physio') || deptLower.includes('bone') || deptLower.includes('joint')) {
      return COMPANION_DATABASE.orthopedics;
    }
    return COMPANION_DATABASE.general;
  };

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
          age: age ? parseInt(age) : null,
          emergency_contact_phone: emergency || null,
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

      // 4. Map UI service string to schema enum values
      let serviceEnum = 'HOSPITAL_COMPANION';
      if (service.includes('Pickup')) serviceEnum = 'APPOINTMENT_ASSISTANCE';
      else if (service.includes('Full Day')) serviceEnum = 'HOSPITAL_COMPANION'; // handled via custom duration
      else if (service.includes('Custom')) serviceEnum = 'HOSPITAL_COMPANION';

      // 5. Create booking record
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

      // 6. Update local state on success
      setSuccessBookingId(`CRS-${bookingData.id.split('-')[0].toUpperCase()}`);
    } catch (err: any) {
      console.error('Error submitting booking request:', err);
      alert(err.message || 'Failed to submit booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const matched = getMatchedCompanion();

  if (successBookingId) {
    return (
      <main id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
        <div className="material-card" style={{ textAlign: 'center', padding: '40px 20px', margin: '20px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--sage)', color: 'var(--ink-teal)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '2rem', margin: '0 auto 20px' }}>✓</div>
          <h2 style={{ marginBottom: '12px' }}>Request Generated Successfully!</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--muted)' }}>We have received your booking request. An admin will review it shortly and assign a companion.</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '15px' }}>Your booking ID is <strong>{successBookingId}</strong>.</p>
          <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/my-bookings" className="btn btn-primary full">Go to My Bookings</Link>
            <Link href="/" className="btn btn-glass full" style={{ color: 'var(--primary)' }}>Return Home</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page booking-page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section className="page-hero reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <p className="eyebrow">Planned hospital visit</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0', lineHeight: 1.2 }}>Book a companion for an upcoming appointment.</h1>
        <p style={{ color: 'var(--muted)' }}>Use this when the visit is not urgent and you know the hospital, date, time, and patient support needs.</p>
      </section>

      {/* Live Status banner */}
      <div className="dispatcher-status-banner reveal active" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px 20px' }}>
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

      <section className="section booking-layout" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
        
        {/* Form Container */}
        <form className="booking-form material-card reveal active" id="bookingForm" onSubmit={handleFormSubmit} style={{ padding: '24px' }}>
          
          {/* Step 1 */}
          <div className="form-section">
            <span className="form-step">1</span>
            <h2>Patient details</h2>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>Patient name<input name="patientName" type="text" placeholder="Ramesh Kumar" required value={patientName} onChange={(e) => setPatientName(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
              <label>Age<input name="age" type="number" min="1" max="120" placeholder="68" value={age} onChange={(e) => setAge(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <label>Customer mobile<input name="phone" type="tel" placeholder="+91 97175 00225" required value={phone} onChange={(e) => setPhone(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
              <label>Customer email<input name="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
            </div>
            <div className="form-row" style={{ marginTop: '12px' }}>
              <label>Emergency contact<input name="emergency" type="tel" placeholder="+91 99887 77665" value={emergency} onChange={(e) => setEmergency(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
            </div>
          </div>

          {/* Step 2 */}
          <div className="form-section" style={{ marginTop: '24px' }}>
            <span className="form-step">2</span>
            <h2>Appointment details</h2>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label>Hospital<input name="hospital" type="text" placeholder="Max Hospital" required value={hospital} onChange={(e) => setHospital(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
              <label>Department<input name="department" type="text" placeholder="Cardiology" value={department} onChange={(e) => setDepartment(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <label>Doctor name<input name="doctor" type="text" placeholder="Dr. Mehta" value={doctor} onChange={(e) => setDoctor(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
              <label>Appointment date<input name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <label>Appointment time<input name="time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} style={{ background: 'var(--surface)' }} /></label>
              <label>Preferred language
                <select name="language" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ background: 'var(--surface)', display: 'block', width: '100%', marginTop: '6px' }}>
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

          {/* Step 3 */}
          <div className="form-section" style={{ marginTop: '24px' }}>
            <span className="form-step">3</span>
            <h2>Support needed</h2>
            <label>Service type
              <select name="service" value={service} onChange={(e) => setService(e.target.value)} style={{ background: 'var(--surface)', display: 'block', width: '100%', marginTop: '6px' }}>
                <option value="Hospital Companion">Hospital Companion (₹499)</option>
                <option value="Hospital Companion + Pickup">Hospital Companion + Pickup (₹899)</option>
                <option value="Full Day Companion">Full Day Companion (₹1,299)</option>
                <option value="Custom Support">Custom Support (Quote after review)</option>
              </select>
            </label>
            <fieldset style={{ border: 'none', padding: 0, margin: '14px 0' }}>
              <legend style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' }}>Care needs</legend>
              <label className="check" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="checkbox" name="needs" value="Wheelchair" checked={careNeeds.includes('Wheelchair')} onChange={() => handleCheckboxChange('Wheelchair')} style={{ accentColor: 'var(--primary)' }} /> Wheelchair
              </label>
              <label className="check" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="checkbox" name="needs" value="Walking assistance" checked={careNeeds.includes('Walking assistance')} onChange={() => handleCheckboxChange('Walking assistance')} style={{ accentColor: 'var(--primary)' }} /> Walking assistance
              </label>
              <label className="check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" name="needs" value="Medicine collection" checked={careNeeds.includes('Medicine collection')} onChange={() => handleCheckboxChange('Medicine collection')} style={{ accentColor: 'var(--primary)' }} /> Medicine collection
              </label>
            </fieldset>
            <label style={{ display: 'block', marginTop: '12px' }}>Additional notes
              <textarea name="notes" rows={4} placeholder="Medical notes, address, special requirements" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ background: 'var(--surface)', display: 'block', width: '100%', marginTop: '6px' }}></textarea>
            </label>
          </div>

          <button className="btn btn-primary full" type="submit" disabled={isSubmitting} style={{ marginTop: '24px', cursor: 'pointer' }}>
            {isSubmitting ? 'Generating Booking...' : 'Generate booking request'}
          </button>
        </form>

        {/* Sidebar Preview Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <aside className="booking-summary material-card reveal active" aria-live="polite" style={{ padding: '24px' }}>
            <p className="eyebrow">Request preview</p>
            <h2>{patientName && hospital ? 'CRS-READY' : 'CRS-XXXX'}</h2>
            <dl>
              <div><dt>Status</dt><dd>{patientName && hospital ? 'Ready to Request' : 'Form incomplete'}</dd></div>
              <div><dt>Patient</dt><dd>{patientName || '—'}</dd></div>
              <div><dt>Hospital</dt><dd>{hospital || '—'}</dd></div>
              <div><dt>Department</dt><dd>{department || '—'}</dd></div>
              <div><dt>Service</dt><dd>{service} ({getServicePrice()})</dd></div>
              <div><dt>Next step</dt><dd>{patientName && hospital ? 'Submit form to contact dispatch' : 'Fill in required details'}</dd></div>
            </dl>
            <div className="summary-note">
              <strong>After review</strong>
              <p>Operations assigns a companion based on distance, experience, language, and preference.</p>
            </div>
          </aside>

          <aside className="matcher-widget material-card reveal active" style={{ padding: '24px', borderColor: 'rgba(8, 121, 111, 0.13)' }}>
            <p className="eyebrow">Companion Matcher</p>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Live Match Preview</h2>
            
            {!matched ? (
              <div className="matcher-status-box">
                <p style={{ fontSize: '0.9rem', color: 'var(--muted)', margin: 0 }}>Start typing appointment details to search matching companions...</p>
              </div>
            ) : (
              <div style={{ marginTop: '15px' }}>
                <div className="companion-row" style={{ margin: '0 0 12px', background: 'rgba(8, 121, 111, 0.05)', padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="avatar" style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                    <img style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={matched.photo} alt={matched.name} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontWeight: 700, color: 'var(--ink)' }}>{matched.name}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Star style={{ width: '12px', height: '12px', fill: 'var(--amber)', stroke: 'var(--amber)' }} /> {matched.rating}
                    </span>
                  </div>
                </div>
                <div className="match-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '8px', background: 'var(--surface)', color: 'var(--primary-dark)', fontWeight: 850, boxShadow: 'var(--shadow-1)' }}>{matched.verification}</span>
                  <span style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '8px', background: 'var(--surface)', color: 'var(--primary-dark)', fontWeight: 850, boxShadow: 'var(--shadow-1)' }}>{matched.lang}</span>
                  <span style={{ padding: '4px 8px', fontSize: '0.72rem', borderRadius: '8px', background: 'var(--mint)', color: 'var(--primary-dark)', fontWeight: 850, boxShadow: 'var(--shadow-1)' }}>{matched.specialty}</span>
                </div>
              </div>
            )}
          </aside>

        </div>

      </section>
    </main>
  );
}
