'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Fingerprint, ShieldAlert, MapPin, Camera, GraduationCap, ShieldCheck } from 'lucide-react';
import { useLiveMetrics } from '@/hooks/useLiveMetrics';
import { COMPANIONS } from '@/data/companions';
import { StepItem, CompanionCard, StatCard, Card, Badge } from '@caresy/ui';

const VERIFICATION_STEPS = [
  { icon: Fingerprint, title: 'Aadhaar verification', desc: 'Identity checked before companion activation via UIDAI / Digilocker API integration.' },
  { icon: ShieldAlert, title: 'Police verification', desc: "Conducted in partnership with AuthBridge (India's leading verification partner)." },
  { icon: MapPin, title: 'Address verification', desc: 'Current residential address and family emergency contacts physically verified.' },
  { icon: Camera, title: 'Photo verification', desc: 'Customer receives a recognizable companion profile with recent photo.' },
  { icon: GraduationCap, title: 'Training completion', desc: 'Etiquette, hospital navigation, patient coordination, and central dispatcher training.' },
  { icon: ShieldCheck, title: 'Final background check', desc: 'AuthBridge screening and continuous checks completed before assignment.' },
];

export default function Trust() {
  const [expandedId, setExpandedId] = useState<string | null>('priya');
  const { deskCompanions, callbackMin } = useLiveMetrics();

  return (
    <main className="page" id="main-content">

      <section className="page-hero" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <p className="eyebrow">Trust framework</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0', lineHeight: 1.2 }}>Families need proof before they need a pitch.</h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>Every companion must be verified and trained before assignment. The customer sees who is coming and why they can be trusted.</p>
      </section>

      {/* Verification steps */}
      <section className="section" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {VERIFICATION_STEPS.map((step, i) => (
            <StepItem key={step.title} number={<step.icon style={{ width: 20, height: 20 }} />} title={`${i + 1}. ${step.title}`} description={step.desc} />
          ))}
        </div>
      </section>

      {/* Meet Companions Section */}
      <section className="section" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="section-title" style={{ textAlign: 'center' }}>
          <p className="section-kicker">Our Companions</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0' }}>Meet our verified companions.</h2>
          <p style={{ color: 'var(--muted)', margin: '0 auto' }}>We believe in full transparency. Here are examples of active companions. Click a card to view their full verified profile and credentials.</p>
        </div>

        <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {COMPANIONS.map((companion) => {
            const isExpanded = expandedId === companion.id;
            return (
              <div key={companion.id} onClick={() => setExpandedId(isExpanded ? null : companion.id)} style={{ cursor: 'pointer' }}>
                <CompanionCard
                  name={companion.name}
                  photo={companion.photo}
                  initials={companion.avatarInitials}
                  rating={companion.rating}
                  visits={companion.visits}
                  verification={companion.verification}
                  languages={isExpanded ? companion.languages : undefined}
                  specialty={isExpanded ? companion.specialtyDescription : companion.specialty}
                  quote={isExpanded ? companion.quote : ''}
                  style={{ width: '100%' }}
                />
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '0.84rem', textAlign: 'center', color: 'var(--muted)', marginTop: '16px' }}>*Note: Profiles shown above are simulated examples representing our standard companion backgrounds and specialties.</p>
      </section>

      {/* Real Experiences Testimonials */}
      <section className="section" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="section-title" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p className="section-kicker">Family Trust</p>
          <h2>Real experiences from Caresy families.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <Card>
            <p style={{ fontStyle: 'italic', fontSize: '1.02rem', lineHeight: 1.5, color: 'var(--ink)', margin: 0 }}>
              "My father had a cardiology checkup at Max Hospital. Priya was amazing—she handled all the queueing, updated me when he met the doctor, and got his medicines. I didn't have to take leave from work."
            </p>
            <strong style={{ display: 'block', marginTop: '16px' }}>Aditi R., Noida</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Father visited Max Hospital</span>
          </Card>
          <Card>
            <p style={{ fontStyle: 'italic', fontSize: '1.02rem', lineHeight: 1.5, color: 'var(--ink)', margin: 0 }}>
              "Caresy is a lifesaver. Being in Bengaluru, I was constantly anxious about my mother's monthly hospital runs in Greater Noida. The live updates make me feel like I am right there with her."
            </p>
            <strong style={{ display: 'block', marginTop: '16px' }}>Rajesh K., Bengaluru</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Mother visited Sharda Hospital</span>
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '48px' }}>
          <StatCard headline="5,000+" detail="Visits Completed" />
          <StatCard headline="1,200+" detail="Companions Verified" />
          <StatCard headline="4.9/5" detail="Family Rating" />
          <StatCard headline="100%" detail="Aadhaar & Police Screened" />
        </div>

        <div style={{ textAlign: 'center', borderTop: '1px solid var(--line)', paddingTop: '30px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block', marginBottom: '16px' }}>As Featured In</span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap', alignItems: 'center', opacity: 0.6 }}>
            <strong style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>The Times of India</strong>
            <strong style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>YourStory</strong>
            <strong style={{ fontSize: '1.2rem', color: 'var(--muted)' }}>TechSparks</strong>
          </div>
        </div>
      </section>

      {/* Live Operations Desk Widget */}
      <section className="section" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Card style={{ background: 'rgba(13, 122, 102, 0.04)', borderColor: 'rgba(13, 122, 102, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <Badge tone="success" live size="sm" style={{ marginBottom: 8 }}>Live Operations Status</Badge>
            <h2 style={{ fontSize: '1.8rem', margin: '8px 0 4px' }}>Dispatcher Desk: Active</h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--muted)' }}>Estimated urgent callback time is <strong>{callbackMin} minutes</strong>. There are currently <strong>{deskCompanions} verified companions online</strong> in your area.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link className="btn btn-urgent" href="/quick-help">Request Same-Day Dispatch</Link>
            <Link className="btn btn-outline" href="/booking">Schedule planned visit</Link>
          </div>
        </Card>
      </section>

      {/* Service Boundaries & Emergency SOP */}
      <section className="section" style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <Card>
          <p className="eyebrow">Service boundaries</p>
          <h2>Caresy companions are not doctors or nurses.</h2>
          <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>They do not give medical advice, interpret diagnosis, recommend medicines, or make independent medical decisions.</p>
        </Card>
        <Card id="emergency-sop">
          <p className="eyebrow">Emergency SOP</p>
          <h2>When the patient's condition worsens.</h2>
          <ol className="clean-list" style={{ color: 'var(--muted)', margin: '8px 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>Contact the emergency contact.</li>
            <li>Contact the Caresy operations team.</li>
            <li>Follow the hospital emergency process.</li>
          </ol>
        </Card>
      </section>

      <section className="section final-cta" style={{ maxWidth: '900px', margin: '0 auto' }}>
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
