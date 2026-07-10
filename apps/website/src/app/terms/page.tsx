'use client';

import React, { useState } from 'react';
import { Search, Info } from 'lucide-react';
import { Input } from '@caresy/ui';

const TERMS_SECTIONS = [
  {
    id: 'intro',
    title: 'Introduction & Agreement',
    content: 'These Terms of Service ("Terms") govern your use of the website caresy.co, our booking interfaces, and the companion care coordination services provided by Caresy Care Services Private Limited ("Caresy", "we", "us", "our").\n\nBy creating a booking request (planned or urgent), submitting callback forms, or registering a patient profile, you agree to be bound by these Terms. If you are acting on behalf of a patient, you warrant that you have obtained their full consent and authorization to agree to these Terms on their behalf.',
    summary: 'By booking a companion on Caresy, you agree to these legal rules. If you are booking for a family member, you confirm that you have their permission to do so.'
  },
  {
    id: 'scope',
    title: '1. Scope of Service',
    content: 'Caresy provides non-medical assistance and hospital companions. The service is strictly navigational, administrative, logistical, and social:\n\n• In-Hospital Navigation: Helping patients move between departments, diagnostic labs, scanning units, billing kiosks, and consultation rooms.\n• Queue Management: Standing in registration, consultation, billing, or pharmacy queues on behalf of the patient.\n• Administrative Support: Organizing medical files, filling out registration forms, and collecting physical bills or prescription sheets.\n• Note-Taking & Communication: Recording verbal instructions from doctors and sending milestone status updates to family contacts.\n• Companion Escort: Escorting patients to and from the hospital gates or their residences.',
    summary: 'Our companions assist with standing in queues, finding hospital departments, filling administrative paperwork, writing down doctor instructions, and guiding patients safely.'
  },
  {
    id: 'medical-exclusion',
    title: '2. Medical Disclaimer & Exclusions',
    content: 'CRITICAL EXCLUSIONS: NO MEDICAL OR CLINICAL CARE\n\nCaresy is NOT a healthcare, nursing, paramedic, home care, ambulance, or telemedicine provider. Our companions are trained layperson facilitators, not certified medical professionals.\n\nAccordingly, companions are strictly prohibited from performing the following activities:\n• Administering injections, setting up IV lines, dressing wounds, or monitoring clinical vitals (unless under direct supervision and order of hospital nursing staff).\n• Making clinical assessments, giving medical advice, prescribing medicines, or recommending changes to treatment.\n• Taking responsibility for clinical decisions or providing signatures on medical consent forms.',
    summary: 'Caresy is not a medical service. Companions do not administer medical treatments, make clinical diagnoses, or sign medical consent forms.'
  },
  {
    id: 'emergency',
    title: '3. Emergency SOP & Protocols',
    content: 'In the event that a patient\'s physical or mental condition deteriorates during the booking duration, the companion will activate the emergency SOP:\n\n• Alert the hospital duty nurse and medical staff immediately to move the patient to the emergency triage room.\n• Contact the primary family emergency phone number immediately.\n• Contact Caresy central operations for back-office coordination.\n• Exclusion: Caresy is not an emergency response service. The family and duty doctors retain sole clinical authority and liability during emergencies.',
    summary: 'In emergencies, companions will alert hospital staff immediately and call you. They will assist the patient to the triage room but cannot make clinical decisions.'
  },
  {
    id: 'bookings-canc',
    title: '4. Bookings & Cancellation',
    content: 'All service requests are subject to dispatcher review, location limits, and companion availability.\n\n• Urgent bookings (Same-Day): Average callback time is 6 minutes, companion dispatch within 45 minutes of booking confirmation.\n• Planned bookings: Scheduled companion profile details are shared 12 hours prior to the appointment.\n• Cancellation Policy: Cancellations made within 4 hours of the scheduled start time will incur a convenience/late fee of ₹150. This fee is automatically charged to cover companion travel and availability costs.',
    summary: 'Same-day dispatch starts within 45 minutes. Future bookings share profiles 12 hours early. Canceling less than 4 hours before the visit costs a ₹150 cancellation fee.'
  },
  {
    id: 'user-resp',
    title: '5. User Responsibilities',
    content: 'To ensure a smooth service delivery, users must fulfill the following commitments:\n\n• Provide accurate patient files, appointment timings, doctor name, and hospital credentials.\n• Disclose any mobility issues (e.g. wheelchair usage), memory challenges, or language requirements during booking.\n• Ensure that the family contact is reachable by phone throughout the entire duration of the service booking.\n• Maintain respectful and professional communication with companions. Harassment, physical or verbal abuse, or unsafe work environments will result in immediate termination of the service.',
    summary: 'You agree to give correct details (doctor, hospital room, patient mobility), stay reachable by phone, and treat companions with safety and respect.'
  },
  {
    id: 'billing',
    title: '6. Fees & Billing',
    content: 'Service fees are structured based on the service duration and package selected:\n\n• Standard Hospital Companion: Starts from ₹499 (pricing scales with duration).\n• Home Pickup & Hospital Return: Starts from ₹899 (scales with travel distance).\n• Full-Day Support: Starts from ₹1,299.\n• All payments must be made securely online. Companions are strictly prohibited from receiving cash gratuities or handling personal payments directly.',
    summary: 'Fees range from ₹499 (standard) to ₹1,299+ (full day). Pay securely online; do not pay cash tips or billing rates directly to the companions.'
  },
  {
    id: 'liability',
    title: '7. Limitation of Liability',
    content: 'Caresy acts as an operational facilitator for logistics and companionship. To the maximum extent permitted by law, you agree to the following liability parameters:\n\n• Caresy is not liable for medical outcomes, clinical delays, or errors committed by hospital staff, scanning labs, or pharmacy personnel.\n• Caresy is not responsible for lost personal belongings of the patient or family at the hospital (except where directly caused by companion negligence).\n• Our total liability under any booking is strictly limited to the amount of convenience fees actually paid for that specific service booking.',
    summary: 'We are not responsible for doctor delays, hospital medical outcomes, or misplaced patient belongings. Our maximum liability is capped at the fee paid for the booking.'
  },
  {
    id: 'dispute',
    title: '8. Governing Law & Jurisdiction',
    content: 'These Terms of Service are governed by and construed in accordance with the laws of India. Any disputes arising out of these Terms or the services shall be subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.',
    summary: 'Any legal issues between you and Caresy will be handled by the courts of Bengaluru under Indian law.'
  },
  {
    id: 'contact',
    title: '9. Grievance & Amendments',
    content: 'We reserve the right to amend these Terms at any time. The updated Terms will be published on caresy.co/terms.html with a revised effective date.\n\nFor questions or requests, contact our corporate office:\n\nCaresy Legal Department\nCaresy Care Services Private Limited\n4th Floor, Sector 7, HSR Layout,\nBengaluru, Karnataka 560102\nEmail: support@caresy.co or legal@caresy.co',
    summary: 'We may update these terms occasionally. For any legal inquiries, write to legal@caresy.co or our HSR Layout office.'
  }
];

export default function TermsOfService() {
  const [search, setSearch] = useState('');
  const [showPlain, setShowPlain] = useState(true);
  const [activeId, setActiveId] = useState('intro');

  const filteredSections = TERMS_SECTIONS.filter(section => 
    section.title.toLowerCase().includes(search.toLowerCase()) || 
    section.content.toLowerCase().includes(search.toLowerCase()) || 
    section.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section className="page-hero reveal active" style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0' }}>Terms of Service</h1>
        <p style={{ color: 'var(--muted)' }}>Effective Date: June 21, 2026</p>
      </section>

      <section className="section" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
        <div className="legal-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px', alignItems: 'start' }}>
          
          {/* Sidebar Navigation */}
          <aside className="legal-sidebar" style={{ position: 'sticky', top: '100px', background: 'var(--surface)', padding: '20px', borderRadius: '16px', border: '1px solid var(--line)' }}>
            <div style={{ marginBottom: '20px' }}>
              <Input
                type="text"
                placeholder="Search clauses..."
                icon={<Search style={{ width: '16px', height: '16px' }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <nav aria-label="Table of contents" style={{ marginBottom: '20px' }}>
              <ul className="legal-toc-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredSections.map(section => (
                  <li key={section.id}>
                    <a 
                      href={`#${section.id}`} 
                      className={`legal-toc-link ${activeId === section.id ? 'active' : ''}`}
                      onClick={() => setActiveId(section.id)}
                      style={{ fontSize: '0.9rem', color: activeId === section.id ? 'var(--primary-dark)' : 'var(--muted)', fontWeight: activeId === section.id ? 'bold' : 'normal' }}
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            
            <div className="plain-toggle-wrapper" style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
              <label className="plain-toggle-label" htmlFor="plainEnglishToggle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}>
                <span>Plain English summaries</span>
                <span className="plain-toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                  <input 
                    type="checkbox" 
                    id="plainEnglishToggle" 
                    checked={showPlain} 
                    onChange={(e) => setShowPlain(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: showPlain ? 'var(--primary)' : '#ccc', transition: '.3s', borderRadius: '20px' }}>
                    <span style={{ position: 'absolute', content: '""', height: '14px', width: '14px', left: showPlain ? '18px' : '3px', bottom: '3px', background: '#white', transition: '.3s', borderRadius: '50%' }}></span>
                  </span>
                </span>
              </label>
            </div>
          </aside>

          {/* Main Document Content */}
          <div className="legal-content" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {filteredSections.length === 0 && (
              <div className="search-no-results">
                <h3>No matching clauses found</h3>
                <p>Try searching for keywords like "cancellation", "liability", "emergency", or "medical".</p>
              </div>
            )}

            {filteredSections.map(section => (
              <article key={section.id} className="legal-section" id={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="legal-text-content">
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '10px' }}>{section.title}</h2>
                  {section.content.includes('CRITICAL EXCLUSIONS') ? (
                    <div style={{
                      background: 'rgba(216, 92, 70, 0.08)',
                      borderColor: 'rgba(216, 92, 70, 0.2)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      padding: '16px',
                      borderRadius: '12px',
                      marginBottom: '14px'
                    }}>
                      <strong style={{ color: 'var(--vermilion-deep)', fontSize: '0.94rem' }}>CRITICAL EXCLUSIONS: NO MEDICAL OR CLINICAL CARE</strong>
                      <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: 'var(--charcoal)', lineHeight: '1.5' }}>
                        Caresy is NOT a healthcare, nursing, paramedic, home care, ambulance, or telemedicine provider. Our companions are trained layperson facilitators, not certified medical professionals.
                      </p>
                    </div>
                  ) : null}
                  <p style={{ fontSize: '0.94rem', color: 'var(--charcoal)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {section.content.includes('CRITICAL EXCLUSIONS') 
                      ? section.content.split('Accordingly, companions are strictly prohibited from performing the following activities:')[1]
                        ? 'Accordingly, companions are strictly prohibited from performing the following activities:' + section.content.split('Accordingly, companions are strictly prohibited from performing the following activities:')[1]
                        : section.content
                      : section.content}
                  </p>
                </div>
                {showPlain && (
                  <div className="plain-english-card" style={{ padding: '16px', borderRadius: '16px', background: 'rgba(231, 163, 62, 0.06)', border: '1px solid rgba(231, 163, 62, 0.15)' }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--marigold-deep)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info style={{ width: '16px', height: '16px' }} />
                      Plain English Summary
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--charcoal)', lineHeight: '1.5' }}>{section.summary}</p>
                  </div>
                )}
              </article>
            ))}
          </div>

        </div>
      </section>
    </main>
  );
}
