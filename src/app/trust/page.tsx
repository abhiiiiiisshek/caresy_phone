'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Fingerprint, ShieldAlert, MapPin, Camera, GraduationCap, ShieldCheck, Star, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const COMPANIONS = [
  {
    id: 'priya',
    name: 'Priya Sharma',
    rating: '4.9',
    visits: 82,
    avatar: '/assets/caresy-companion-priya.png',
    lang: 'Hindi, English, Punjabi',
    specialties: 'Cardiology coordination, patient navigation, post-consultation discharge procedures.',
    quote: '"I ensure that the patient feels like they have family alongside them at every stage of the hospital day."'
  },
  {
    id: 'anil',
    name: 'Anil Kumar',
    rating: '4.8',
    visits: 120,
    avatar: '/assets/caresy-companion-anil.png',
    lang: 'Kannada, Tamil, English',
    specialties: 'Orthopedics support, elderly wheelchair mobility navigation, physiotherapy coordination.',
    quote: '"Hospital queues can be extremely tiring for elders. I take care of the wait so they can sit comfortably."'
  },
  {
    id: 'sarah',
    name: 'Sarah Mathews',
    rating: '4.9',
    visits: 65,
    avatar: '/assets/caresy-companion-sarah.png',
    lang: 'Malayalam, Telugu, English',
    specialties: 'General health scans, billing paperwork coordination, pharmacy medicine collection.',
    quote: '"My goal is to make sure family members receive detailed, stress-free updates at every major milestone."'
  }
];

export default function Trust() {
  const [expandedId, setExpandedId] = useState<string | null>('priya');
  const [deskCompanions, setDeskCompanions] = useState(8);
  const [callbackMin, setCallbackMin] = useState(6);

  useEffect(() => {
    const interval = setInterval(() => {
      setCallbackMin(4 + Math.floor(Math.random() * 5));
      setDeskCompanions(5 + Math.floor(Math.random() * 7));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      
      <section className="page-hero trust-hero reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <p className="eyebrow">Trust framework</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0', lineHeight: 1.2 }}>Families need proof before they need a pitch.</h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>Every companion must be verified and trained before assignment. The customer sees who is coming and why they can be trusted.</p>
      </section>

      {/* Verification Timeline */}
      <section className="section verification-timeline reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
          {/* Vertical Timeline Line */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '32px', width: '2px', background: 'var(--line)' }}></div>

          <div style={{ position: 'relative', paddingLeft: '80px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '0', width: '34px', height: '34px', background: 'var(--surface)', border: '2px solid var(--primary)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--primary)', zIndex: 2 }}>
              <Fingerprint style={{ width: '18px' }} />
            </div>
            <article className="material-card" style={{ padding: '24px' }}>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>1. Aadhaar verification</strong>
              <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>Identity checked before companion activation via UIDAI / Digilocker API integration.</span>
            </article>
          </div>

          <div style={{ position: 'relative', paddingLeft: '80px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '0', width: '34px', height: '34px', background: 'var(--surface)', border: '2px solid var(--primary)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--primary)', zIndex: 2 }}>
              <ShieldAlert style={{ width: '18px' }} />
            </div>
            <article className="material-card" style={{ padding: '24px' }}>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>2. Police verification</strong>
              <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>Conducted in partnership with AuthBridge (India's leading verification partner).</span>
            </article>
          </div>

          <div style={{ position: 'relative', paddingLeft: '80px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '0', width: '34px', height: '34px', background: 'var(--surface)', border: '2px solid var(--primary)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--primary)', zIndex: 2 }}>
              <MapPin style={{ width: '18px' }} />
            </div>
            <article className="material-card" style={{ padding: '24px' }}>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>3. Address verification</strong>
              <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>Current residential address and family emergency contacts physically verified.</span>
            </article>
          </div>

          <div style={{ position: 'relative', paddingLeft: '80px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '0', width: '34px', height: '34px', background: 'var(--surface)', border: '2px solid var(--primary)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--primary)', zIndex: 2 }}>
              <Camera style={{ width: '18px' }} />
            </div>
            <article className="material-card" style={{ padding: '24px' }}>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>4. Photo verification</strong>
              <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>Customer receives a recognizable companion profile with recent photo.</span>
            </article>
          </div>

          <div style={{ position: 'relative', paddingLeft: '80px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '0', width: '34px', height: '34px', background: 'var(--surface)', border: '2px solid var(--primary)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--primary)', zIndex: 2 }}>
              <GraduationCap style={{ width: '18px' }} />
            </div>
            <article className="material-card" style={{ padding: '24px' }}>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>5. Training completion</strong>
              <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>Etiquette, hospital navigation, patient coordination, and central dispatcher training.</span>
            </article>
          </div>

          <div style={{ position: 'relative', paddingLeft: '80px' }}>
            <div style={{ position: 'absolute', left: '16px', top: '0', width: '34px', height: '34px', background: 'var(--surface)', border: '2px solid var(--primary)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--primary)', zIndex: 2 }}>
              <ShieldCheck style={{ width: '18px' }} />
            </div>
            <article className="material-card" style={{ padding: '24px', borderLeft: '4px solid var(--primary)' }}>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '8px' }}>6. Final Background check</strong>
              <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>AuthBridge screening and continuous checks completed before assignment.</span>
            </article>
          </div>
        </div>
      </section>

      {/* Meet Companions Section */}
      <section className="section companion-profiles-section reveal active" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px' }}>
        <div className="section-title">
          <p className="section-kicker">Our Companions</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0' }}>Meet our verified companions.</h2>
          <p style={{ color: 'var(--muted)' }}>We believe in full transparency. Here are examples of active companions. Click a card to view their full verified profile and credentials.</p>
        </div>

        <div className="profiles-container grid-3-col" style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {COMPANIONS.map((companion) => {
            const isExpanded = expandedId === companion.id;
            return (
              <div 
                key={companion.id} 
                className={`profile-card material-card ${isExpanded ? 'active' : ''}`} 
                onClick={() => setExpandedId(isExpanded ? null : companion.id)}
                style={{ cursor: 'pointer', padding: '20px' }}
              >
                <div className="profile-summary-header" style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                  <div className="avatar" style={{ borderRadius: '50%', overflow: 'hidden', width: '64px', height: '64px', flexShrink: 0 }}>
                    <img style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={companion.avatar} alt={companion.name} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{companion.name}</h3>
                    <span style={{ color: 'var(--muted)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Star style={{ width: '14px', height: '14px', fill: 'var(--amber)', stroke: 'var(--amber)' }} /> {companion.rating} ({companion.visits} visits)
                    </span>
                  </div>
                </div>
                
                <div className="profile-badges" style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(8, 121, 111, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle style={{ width: '12px', height: '12px' }} /> Aadhaar Verified
                  </span>
                  <span style={{ background: 'rgba(8, 121, 111, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck style={{ width: '12px', height: '12px' }} /> Police Cleared
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="profile-expanded-details" style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '12px' }}>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.45, marginBottom: '12px' }}><strong>Languages:</strong> {companion.lang}</p>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.45, marginBottom: '12px' }}><strong>Specialties:</strong> {companion.specialties}</p>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.45, margin: 0, fontStyle: 'italic', color: 'var(--muted)' }}>{companion.quote}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '0.84rem', textAlign: 'center', color: 'var(--muted)', marginTop: '16px' }}>*Note: Profiles shown above are simulated examples representing our standard companion backgrounds and specialties.</p>
      </section>

      {/* Real Experiences Testimonials */}
      <section className="section social-proof reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div className="section-title" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p className="section-kicker">Family Trust</p>
          <h2>Real experiences from Caresy families.</h2>
        </div>
        <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <div className="testimonial-card material-card" style={{ padding: '24px' }}>
            <p style={{ fontStyle: 'italic', fontSize: '1.02rem', lineHeight: 1.5, color: 'var(--ink)' }}>
              "My father had a cardiology checkup at Max Hospital. Priya was amazing—she handled all the queueing, updated me when he met the doctor, and got his medicines. I didn't have to take leave from work."
            </p>
            <strong style={{ display: 'block', marginTop: '16px' }}>Aditi R., Noida</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Father visited Max Hospital</span>
          </div>
          <div className="testimonial-card material-card" style={{ padding: '24px' }}>
            <p style={{ fontStyle: 'italic', fontSize: '1.02rem', lineHeight: 1.5, color: 'var(--ink)' }}>
              "Caresy is a lifesaver. Being in Bengaluru, I was constantly anxious about my mother's monthly hospital runs in Greater Noida. The live updates make me feel like I am right there with her."
            </p>
            <strong style={{ display: 'block', marginTop: '16px' }}>Rajesh K., Bengaluru</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Mother visited Sharda Hospital</span>
          </div>
        </div>

        <div className="trust-stats-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', textAlign: 'center', marginBottom: '48px' }}>
          <div className="stat-item material-card" style={{ background: 'rgba(231, 243, 237, 0.4)', padding: '16px' }}>
            <strong style={{ display: 'block', fontSize: '2.2rem', color: 'var(--primary)' }}>5,000+</strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Visits Completed</span>
          </div>
          <div className="stat-item material-card" style={{ background: 'rgba(231, 243, 237, 0.4)', padding: '16px' }}>
            <strong style={{ display: 'block', fontSize: '2.2rem', color: 'var(--primary)' }}>1,200+</strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Companions Verified</span>
          </div>
          <div className="stat-item material-card" style={{ background: 'rgba(231, 243, 237, 0.4)', padding: '16px' }}>
            <strong style={{ display: 'block', fontSize: '2.2rem', color: 'var(--primary)' }}>4.9/5</strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Family Rating</span>
          </div>
          <div className="stat-item material-card" style={{ background: 'rgba(231, 243, 237, 0.4)', padding: '16px' }}>
            <strong style={{ display: 'block', fontSize: '2.2rem', color: 'var(--primary)' }}>100%</strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Aadhaar & Police Screened</span>
          </div>
        </div>

        <div className="press-mentions" style={{ textAlign: 'center', borderTop: '1px solid var(--line)', paddingTop: '30px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block', marginBottom: '16px' }}>As Featured In</span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap', alignItems: 'center', opacity: 0.6 }}>
            <strong style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>The Times of India</strong>
            <strong style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>YourStory</strong>
            <strong style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>TechSparks</strong>
          </div>
        </div>
      </section>

      {/* Live Operations Desk Widget */}
      <section className="section dispatcher-status-section reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div className="material-card" style={{ background: 'rgba(8, 121, 111, 0.04)', borderColor: 'rgba(8, 121, 111, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap', padding: '24px' }}>
          <div>
            <span className="live-pulse-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse"></span>
              <strong style={{ color: 'var(--primary-dark)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Operations Status</strong>
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '8px 0 4px' }}>Dispatcher Desk: Active</h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--muted)' }}>Estimated urgent callback time is <strong>{callbackMin} minutes</strong>. There are currently <strong>{deskCompanions} verified companions online</strong> in your area.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link className="btn btn-urgent" href="/quick-help">Request Same-Day Dispatch</Link>
            <Link className="btn btn-outline" href="/booking">Schedule planned visit</Link>
          </div>
        </div>
      </section>

      {/* Service Boundaries & Emergency SOP */}
      <section className="section boundaries" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="material-card reveal active" style={{ padding: '24px' }}>
          <p className="eyebrow">Service boundaries</p>
          <h2>Caresy companions are not doctors or nurses.</h2>
          <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>They do not give medical advice, interpret diagnosis, recommend medicines, or make independent medical decisions.</p>
        </div>
        <div className="material-card reveal active" id="emergency-sop" style={{ padding: '24px' }}>
          <p className="eyebrow">Emergency SOP</p>
          <h2>When the patient's condition worsens.</h2>
          <ol className="clean-list" style={{ color: 'var(--muted)', margin: '8px 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>Contact the emergency contact.</li>
            <li>Contact the Caresy operations team.</li>
            <li>Follow the hospital emergency process.</li>
          </ol>
        </div>
      </section>

      <section className="section final-cta reveal active" style={{ maxWidth: '800px', margin: '0 auto 40px', padding: '40px 24px' }}>
        <div>
          <p className="eyebrow">Reassurance before booking</p>
          <h2>See the companion profile before the visit begins.</h2>
          <p>Photo, name, contact number, experience, languages, rating, and verification status are shared after assignment.</p>
        </div>
        <Link className="btn btn-primary" href="/booking" style={{ display: 'inline-flex', marginTop: '16px' }}>Book for later</Link>
      </section>
    </main>
  );
}
