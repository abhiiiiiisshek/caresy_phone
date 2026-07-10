'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Info } from 'lucide-react';
import { Input } from '@/components/ds';

const PRIVACY_SECTIONS = [
  {
    id: 'intro',
    title: 'Introduction',
    content: 'At Caresy (operated by Caresy Care Services Private Limited, "we", "us", "our"), we value the trust you place in us to accompany your family members during their hospital visits. This Privacy Policy explains how we collect, use, store, and safeguard personal and sensitive information when you access our website caresy.co, use our booking widgets, or coordinate companion services.\n\nWe are fully committed to protecting your privacy in compliance with the Information Technology Act, 2000, and the Digital Personal Data Protection (DPDP) Act, 2023 of India.',
    summary: 'Caresy respects your privacy. We strictly follow Indian data protection laws when collecting and handling information for arranging companions for your hospital visits.'
  },
  {
    id: 'info-collect',
    title: '1. Information We Collect',
    content: 'To provide reliable companion services, we collect information across three main categories:\n\n• User & Family Details: Full name, primary mobile number, email address, physical address, and emergency contact details of family members coordinating the care.\n• Patient Details: Full name, age, gender, language preferences, mobility requirements (e.g., wheelchair assistance), cognitive/language needs, and hospital-related logistics.\n• Service Details: Hospital name, branch, scheduled doctor name, department, ward or room numbers, diagnostic appointments, pharmacy logs, and time slots.\n• Companion Verification Data: For companions, we process government-issued identifiers (Aadhaar, police clearance certificate documents) through verification APIs to guarantee safety.',
    summary: 'We collect only the details needed to organize a safe visit: name, contact, hospital appointment info, language preference, and mobility needs. All companions undergo biometric ID and background checks.'
  },
  {
    id: 'info-use',
    title: '2. How We Use Information',
    content: 'The information we collect is processed solely to fulfill service requests and maintain operational safety. We use it to:\n\n• Match the patient with the most appropriate companion based on language preferences and specialty needs.\n• Send live, step-by-step milestone updates (arrival, registration, consultation notes, pharmacy pickup, return) to family contacts.\n• Coordinate logistics between our central dispatch office, the companion, and the family.\n• Enable companions and dispatchers to contact family members immediately in case of medical emergencies or clinical changes.\n• Process transaction payments, issue refunds, and manage late cancellation billing fees.',
    summary: 'We use your data to assign the right companion, send you real-time text updates, run dispatch logistics, process billing/refunds, and call you during emergencies.'
  },
  {
    id: 'data-sharing',
    title: '3. Data Sharing & Third Parties',
    content: 'We do not sell, trade, or lease personal patient details to advertising networks or third-party brokers. We share data only in the following contexts:\n\n• Assigned Companions: The companion receives only the logistics details (patient name, hospital location, room number, language preference, and emergency phone) required to perform the service.\n• Identity Verification Partners: Companion identity documents are cross-referenced securely through UIDAI (Aadhaar) and AuthBridge APIs for strict verification.\n• Communications Service Providers: Phone numbers are integrated with secure SMS and WhatsApp API gateways to dispatch real-time milestone updates.\n• Payment Gateways: All payments are processed through PCI-DSS compliant secure UPI and card processing vendors.',
    summary: 'We never sell your data. We share basic details with your assigned companion so they know who to meet. We use secure partners for companion background checks, WhatsApp notifications, and payment processing.'
  },
  {
    id: 'data-security',
    title: '4. Security & Storage',
    content: 'Data security is integral to keeping our companion ecosystem safe. We employ industry-standard protection measures:\n\n• All data transmitted via our web forms, booking modules, or database syncs is protected by SSL/TLS encryption.\n• Data is housed in secure cloud databases with restricted access protocols, limited strictly to authorized operational employees.\n• We retain patient records and consultation log notes only as long as necessary to fulfill the service, resolve billing queries, or comply with statutory tax guidelines in India.',
    summary: 'Your details are stored securely, encrypted, and only visible to authorized support staff. We only keep records as long as needed for billing and services.'
  },
  {
    id: 'user-rights',
    title: '5. Your Data Rights',
    content: 'In accordance with Indian privacy laws (including the DPDP Act 2023), you hold the following rights over your personal data:\n\n• Access & Correction: You can review or update patient details, mobile numbers, and doctor appointments stored in our records.\n• Consent Withdrawal: You can withdraw consent for processing details or receiving automated updates. However, this may render us unable to fulfill active bookings.\n• Deletion: You can request that we purge patient and family profiles from our databases, subject to standard auditing exclusions.',
    summary: 'You can ask us to show you, correct, or permanently delete your stored patient details at any time. Stopping data access might make it impossible for us to coordinate active bookings.'
  },
  {
    id: 'cookies',
    title: '6. Cookies & Tracking',
    content: 'Our website utilizes cookies and similar tracking identifiers to analyze web traffic, remember booking preferences, and improve the loading speed of page layouts. These cookies do not extract files from your hard drive or access sensitive payment credentials.\n\nYou can configure your browser to reject cookies, though doing so might affect navigation or auto-fill functions on our booking forms.',
    summary: 'We use standard website cookies to remember your bookings and analyze traffic. You can disable them in your browser settings if you wish.'
  },
  {
    id: 'governing-law',
    title: '7. Governing Law',
    content: 'This Privacy Policy is governed by and construed in accordance with the laws of India. Any disputes arising from data processing or this policy are subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.',
    summary: 'This policy falls under Indian jurisdiction, and any legal matters will be handled in Bengaluru, Karnataka.'
  },
  {
    id: 'contact',
    title: '8. Grievance & Contact',
    content: 'If you have any questions about this Privacy Policy, wish to exercise your data rights, or want to register a concern regarding how we handle customer data, please write to our designated Grievance Officer:\n\nCaresy Grievance Officer\nCaresy Care Services Private Limited\n4th Floor, Sector 7, HSR Layout,\nBengaluru, Karnataka 560102\nEmail: privacy@caresy.co or support@caresy.co',
    summary: 'For any questions or concerns about data privacy, email our Grievance Officer at privacy@caresy.co or write to our office in HSR Layout, Bengaluru.'
  }
];

export default function PrivacyPolicy() {
  const [search, setSearch] = useState('');
  const [showPlain, setShowPlain] = useState(true);
  const [activeId, setActiveId] = useState('intro');

  const filteredSections = PRIVACY_SECTIONS.filter(section => 
    section.title.toLowerCase().includes(search.toLowerCase()) || 
    section.content.toLowerCase().includes(search.toLowerCase()) || 
    section.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="page" id="main-content" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <section className="page-hero reveal active" style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0' }}>Privacy Policy</h1>
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
                <p>Try searching for keywords like "Aadhaar", "AuthBridge", "cookies", or "rights".</p>
              </div>
            )}

            {filteredSections.map(section => (
              <article key={section.id} className="legal-section" id={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="legal-text-content">
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--charcoal)', marginBottom: '10px' }}>{section.title}</h2>
                  <p style={{ fontSize: '0.94rem', color: 'var(--charcoal)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{section.content}</p>
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
