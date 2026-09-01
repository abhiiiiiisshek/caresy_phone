'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Info } from 'lucide-react';
import { Input } from '@caresy/ui';

const PRIVACY_SECTIONS = [
  {
    id: 'intro',
    title: 'Introduction',
    content: 'At Caresy (operated by Caresy Care Services Private Limited, "we", "us", "our"), we value the trust you place in us to accompany your family members during their hospital visits. This Privacy Policy explains how we collect, use, store, and safeguard personal and sensitive information when you access our website caresy.co.in, use our booking widgets, or coordinate companion services.\n\nWe are fully committed to protecting your privacy in compliance with the Information Technology Act, 2000, and the Digital Personal Data Protection (DPDP) Act, 2023 of India.',
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
    id: 'account-deletion',
    title: '5. Account & Data Deletion — How to Delete Your Data',
    content: 'You can delete your Caresy account and all associated personal data at any time, without needing to contact support. We provide a dedicated, always-available web mechanism and an in-app flow, plus an email alternative — satisfying Google Play Data Deletion and Apple App Store Guideline 5.1.1(v).\n\n• Web (recommended, works for Play/App Store reviewers): Visit https://caresy.co.in/account/delete while signed in (Google or Apple sign-in), type DELETE to confirm, and tap "Permanently delete my account". You will receive on-screen confirmation and be signed out automatically. Direct deletion API: POST https://caresy.co.in/api/account/delete (authenticated — you can only delete your own account).\n\n• In the mobile app: Open Profile → Danger zone → Delete account → Continue → type DELETE → confirm. The app securely calls the same deletion endpoint using your session token.\n\n• By email (if you cannot sign in): Email privacy@caresy.co.in or support@caresy.co.in from your registered email with subject "Delete my data" and your registered phone number. We verify ownership via your account email and complete the request within 7 days.\n\nWhat is deleted: Deleting your auth.users row permanently cascades to your profile, patient records, saved locations, bookings, trips/live-tracking data, care logs, push tokens and notifications. Companion assignments on past bookings are retained only as anonymised service records (companion_user_id set to null) — companions\' own accounts are untouched.\n\nWhat we retain: Only what the law requires — anonymised billing/tax invoices retained for up to 8 years under Indian statutory requirements, then purged. No other personal data is retained.\n\nTimeline: Requests via web/app are processed immediately (typically within minutes) and confirmed on-screen and by email; email requests are fulfilled within 7 days. After confirmation you are signed out and data is no longer recoverable. For questions, see §11 Grievance & Contact.',
    summary: 'Delete anytime at caresy.co.in/account/delete or in the app: Profile → Delete account (type DELETE). Can\'t sign in? Email privacy@caresy.co.in — we verify and erase everything within 7 days, except anonymised invoices kept for law. Instant confirmation in-app/web.'
  },
  {
    id: 'childrens-privacy',
    title: '6. Children’s Privacy',
    content: 'Caresy is not directed to children under 18, and we do not knowingly collect personal data directly from a child. Our service is used by adults (family members) to book companions for patients, who may occasionally be minors (for example, a young family member requiring hospital accompaniment).\n\nWhen you add a patient who is under 18, you confirm that you are the parent or legal guardian and that you consent to us processing that minor\'s information solely to provide the booked companion service (name, age and hospital logistics as listed in §1). We collect the minimum necessary, use it only for dispatch, companion matching and live updates as described in §2–3, and never use a minor\'s data for marketing, profiling or advertising.\n\nIf we learn that a child\'s data was provided without proper guardian consent, we will delete it promptly upon notice to privacy@caresy.co.in. If you are under 18, please use Caresy only with a parent or guardian. We do not allow children to create accounts independently — account creation requires Google or Apple sign-in via an adult account holder.',
    summary: 'We don\'t target kids and never collect from a child directly. If a patient is under 18, their parent or guardian must book and consent. Tell us at privacy@caresy.co.in and we delete any child\'s data sent without permission.'
  },
  {
    id: 'device-permissions',
    title: '7. Device Permissions — Why We Ask',
    content: 'Our website and mobile app may request access to sensitive device features only when you choose a feature that needs them. Every permission is optional — you can deny and continue to use Caresy (e.g., type an address instead of sharing location), and you can revoke any permission anytime in your device Settings. Each permission shows an in-app disclosure explaining the purpose before the system dialog appears.\n\n• Location (Approximate & Precise — ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription): Requested only if you select "At home" as the meeting point (to set pickup coordinates) and, during an active visit, to share live trip location on channel trip:<id> with your booking\'s circle (family + assigned companion + dispatch) so family can follow progress. We explicitly do NOT use ACCESS_BACKGROUND_LOCATION — location is never tracked continuously in the background, only at booking creation and during a live visit you started. Blocked permissions guarantee this cannot be added via a library.\n\n• Photos & Media (READ_EXTERNAL_STORAGE, NSPhotoLibraryUsageDescription) and Camera (NSCameraUsageDescription on iOS; Android camera access is disabled via expo-image-picker cameraPermission: false): Requested only if you choose to attach a prescription, discharge summary or report to a booking. You may pick an existing photo from your library or — on iOS — capture a new photo. On Android the app never opens the camera directly. Attachments are user-initiated and optional.\n\n• Notifications (POST_NOTIFICATIONS, NSUserNotificationUsageDescription): Requested to send booking confirmations, companion assignment, milestone updates (arrival, registration, consultation, pharmacy), and trip-sharing alerts.\n\nDenying a permission only disables the related feature; core booking and tracking via manual address entry remain available.',
    summary: 'Location only for home pickup + live trip during a visit (no background tracking). Photos/camera only if you attach a report. Notifications for visit updates. All optional — deny and keep using the app, change anytime in Settings.'
  },
  {
    id: 'user-rights',
    title: '8. Your Data Rights',
    content: 'In accordance with Indian privacy laws (including the DPDP Act 2023), you hold the following rights over your personal data:\n\n• Access & Correction: You can review or update patient details, mobile numbers, and doctor appointments stored in our records.\n• Consent Withdrawal: You can withdraw consent for processing details or receiving automated updates. However, this may render us unable to fulfill active bookings.\n• Deletion: You can request that we purge patient and family profiles from our databases — see §5 Account & Data Deletion (https://caresy.co.in/account/delete) for the instant web/app mechanism and 7-day email fulfilment, subject only to statutory invoice retention.',
    summary: 'You can ask us to show, correct, or permanently delete your data at any time — use caresy.co.in/account/delete for instant deletion (§5). Stopping data access may make active bookings impossible.'
  },
  {
    id: 'cookies',
    title: '9. Cookies & Tracking',
    content: 'Our website utilizes cookies and similar tracking identifiers to analyze web traffic, remember booking preferences, and improve the loading speed of page layouts. These cookies do not extract files from your hard drive or access sensitive payment credentials.\n\nYou can configure your browser to reject cookies, though doing so might affect navigation or auto-fill functions on our booking forms.',
    summary: 'We use standard website cookies to remember your bookings and analyze traffic. You can disable them in your browser settings if you wish.'
  },
  {
    id: 'governing-law',
    title: '10. Governing Law',
    content: 'This Privacy Policy is governed by and construed in accordance with the laws of India. Any disputes arising from data processing or this policy are subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.',
    summary: 'This policy falls under Indian jurisdiction, and any legal matters will be handled in Bengaluru, Karnataka.'
  },
  {
    id: 'contact',
    title: '11. Grievance & Contact',
    content: 'If you have any questions about this Privacy Policy, wish to exercise your data rights, or want to register a concern regarding how we handle customer data, please write to our designated Grievance Officer:\n\nCaresy Grievance Officer\nCaresy Care Services Private Limited\nThe Skyboat Affection, Paramount Emotions, Sector 1,\nBisrakh Jalalpur, Uttar Pradesh 201318\nEmail: privacy@caresy.co.in or support@caresy.co.in\n\nData deletion requests: https://caresy.co.in/account/delete (instant) or email privacy@caresy.co.in with subject "Delete my data" (fulfilled within 7 days).',
    summary: 'For any questions or concerns about data privacy, email our Grievance Officer at privacy@caresy.co.in or write to our HSR Layout office. To delete data instantly: caresy.co.in/account/delete.'
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
      <section className="page-hero" style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px 24px' }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '10px 0' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--muted)' }}>Effective Date: September 01, 2026 — Last updated to add account deletion URL, children’s privacy, and device-permission disclosures for Play & App Store compliance.</p>
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
