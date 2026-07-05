'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    id: 1,
    q: 'Which cities and hospitals does Caresy cover?',
    a: 'We currently operate in Noida and Greater Noida. We serve patients at all major hospitals in these areas, including Apollo Hospitals, Fortis Hospitals, Max Super Speciality Hospital, Kailash Hospital, and Sharda Hospital. If your hospital is not listed, contact us on WhatsApp to verify coverage.',
    isUrgent: false
  },
  {
    id: 2,
    q: 'What is your cancellation policy?',
    a: 'We offer free cancellation up to 4 hours before the scheduled visit. If you cancel within 4 hours of the appointment, a flat ₹150 convenience fee is charged to compensate the assigned companion for their time and travel preparation.',
    isUrgent: false
  },
  {
    id: 3,
    q: 'What happens if a companion is late?',
    a: 'Our operations team tracks companion locations live. If a companion is delayed due to traffic or unforeseen reasons, we notify you immediately. If the delay threatens your appointment time, we will immediately dispatch a backup companion or coordinate directly with the hospital desk.',
    isUrgent: false
  },
  {
    id: 4,
    q: 'What if we are unsatisfied with the companion?',
    a: 'Your peace of mind is our absolute priority. If you or the patient are unsatisfied with the companion\'s service or conduct, please contact our 24/7 care helpline. We will waive the service fee and match you with a different companion for your next visit.',
    isUrgent: false
  },
  {
    id: 5,
    q: 'What are your operations and helpline hours?',
    a: 'Our central operations desk operates from 6:00 AM to 10:00 PM daily for booking verifications, status updates, and support. However, companions can be scheduled and dispatched for visits happening at any hour, including overnight stays if booked in advance.',
    isUrgent: false
  },
  {
    id: 6,
    q: 'Is Caresy a medical service or home nursing agency?',
    a: 'No. Caresy provides non-medical assistance and logistics coordination. Our companions do not administer medicine, perform medical procedures, interpret diagnostics, or give medical advice. We act as family stand-ins to handle navigation, queuing, documentation, and companionship.',
    isUrgent: false
  },
  {
    id: 7,
    q: 'Emergency Situations & Boundary Policies',
    a: 'In case of emergencies where a patient\'s vital signs deteriorate or an acute medical issue occurs inside the hospital, our companions immediately alert the hospital triage staff, guide the patient to the emergency ward, and notify the family emergency contact. Caresy is not a substitute for ambulance services or professional nursing. For any life-threatening emergencies, call the hospital\'s emergency response team directly.',
    isUrgent: true
  }
];

export default function FAQ() {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(7); // Default open is the emergency boundary policy

  const filteredFaqs = FAQS.filter(faq => 
    faq.q.toLowerCase().includes(search.toLowerCase()) || 
    faq.a.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOpen = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <main className="page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      
      <section className="page-hero reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <p className="eyebrow">Got questions?</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0', lineHeight: 1.2 }}>Frequently Asked Questions & Coverage.</h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>Everything you need to know about our rates, cities covered, cancellation rules, and emergency guidelines.</p>
      </section>

      <section className="section faq-section" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '32px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', width: '20px', height: '20px' }} />
          <input 
            type="text" 
            placeholder="Search FAQs... (e.g., cancellation, late)" 
            style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '99px', border: '1px solid var(--line)', fontSize: '1.05rem', background: 'var(--surface)' }} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="faq-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredFaqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div 
                key={faq.id} 
                className="faq-accordion material-card" 
                style={{ 
                  padding: '0',
                  overflow: 'hidden',
                  background: faq.isUrgent ? 'rgba(216, 92, 70, 0.08)' : 'var(--surface)',
                  borderColor: faq.isUrgent ? 'rgba(216, 92, 70, 0.2)' : 'var(--line)'
                }}
              >
                <button 
                  onClick={() => toggleOpen(faq.id)}
                  style={{ 
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '20px', 
                    fontWeight: 700, 
                    fontSize: '1.1rem', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    textAlign: 'left',
                    color: faq.isUrgent ? '#9b432d' : 'var(--charcoal)'
                  }}
                >
                  {faq.q} 
                  {isOpen ? <ChevronUp className="acc-icon" style={{ width: '20px', height: '20px' }} /> : <ChevronDown className="acc-icon" style={{ width: '20px', height: '20px' }} />}
                </button>
                
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', color: faq.isUrgent ? 'var(--ink)' : 'var(--muted)', lineHeight: '1.6', borderTop: '1px solid var(--line)' }}>
                    <p style={{ margin: '12px 0 0' }} dangerouslySetInnerHTML={{ __html: faq.a }}></p>
                  </div>
                )}
              </div>
            );
          })}

          {filteredFaqs.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--muted)', margin: '40px 0' }}>No matching questions found. Try searching another topic.</p>
          )}
        </div>
      </section>

      <section className="section final-cta reveal active" style={{ maxWidth: '800px', margin: '40px auto 0', padding: '40px 24px' }}>
        <div>
          <p className="eyebrow">Have a specific question?</p>
          <h2>We are available for quick chat on WhatsApp.</h2>
          <p>No bots, just our core operations team answering your queries in real-time.</p>
        </div>
        <div className="final-actions">
          <a className="btn btn-primary" href="https://wa.me/919717500225" target="_blank" rel="noopener">Chat on WhatsApp</a>
          <Link className="btn btn-glass" href="/booking">Book a companion</Link>
        </div>
      </section>
    
      <section className="section coverage-section reveal active" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div className="material-card" style={{ background: 'rgba(231, 243, 237, 0.6)', display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px' }}>
          <span className="coverage-badge" style={{ background: 'var(--primary)', color: '#fff', padding: '4px 12px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', width: 'max-content', letterSpacing: '0.05em' }}>Coverage Area</span>
          <h2>Active Metro Areas & Network Hospitals</h2>
          <p>
            Caresy companions are currently deployed and operating in <strong>Noida and Greater Noida</strong>. We coordinate care across all major private and public healthcare systems.
          </p>
          <div className="grid-3-col" style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <strong style={{ color: 'var(--primary-dark)' }}>Noida</strong>
              <p style={{ fontSize: '0.88rem', margin: '4px 0 0', lineHeight: '1.45' }}>Max Super Speciality Hospital (Sector 62), Fortis Hospital (Sector 62), Kailash Hospital (Sector 27), Metro Hospital (Sector 11).</p>
            </div>
            <div>
              <strong style={{ color: 'var(--primary-dark)' }}>Greater Noida</strong>
              <p style={{ fontSize: '0.88rem', margin: '4px 0 0', lineHeight: '1.45' }}>Sharda Hospital, Yatharth Super Speciality Hospital, GIMS (Government Institute of Medical Sciences).</p>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
