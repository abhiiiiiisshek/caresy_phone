'use client';

import React, { useState } from 'react';
import { Search, Info } from 'lucide-react';
import { Input } from '@caresy/ui';

const LAST_UPDATED = 'September 01, 2026';
const VERSION = '2.0';

const PRIVACY_SECTIONS = [
  {
    id: 'version',
    title: '1. Last Updated / Version',
    content: `Last Updated: ${LAST_UPDATED}\nVersion: ${VERSION} (rewritten for Apple, Google Play, and DPDP Act alignment)\n\nPrevious version: 1.0 — June 21, 2026.\n\nIf we make material changes, the Last Updated date and version will change and we will notify you as described in §17.`,
    summary: 'This is version 2.0 from Sep 01, 2026. Big changes get a new date, version, and a notice.'
  },
  {
    id: 'introduction',
    title: '2. Introduction',
    content: `Caresy is built and operated by Caresy Care Services Private Limited (“Caresy”, “we”, “us”, “our”) — a hospital companion service for families who cannot be physically present during a hospital visit.\n\nThis Privacy Policy explains what personal information we collect, how we use it, how we share it, how long we keep it, and how you control it when you use caresy.co.in, our booking widgets, and our iOS and Android apps (collectively, the “Service”).\n\nLast Updated: ${LAST_UPDATED} • Version: ${VERSION}\nCompany: Caresy Care Services Private Limited\nWebsite/App: caresy.co.in and Caresy (iOS bundle in.co.caresy.app / Android package in.co.caresy.app)`,
    summary: 'We are Caresy Care Services Pvt Ltd. This policy covers our website and apps and explains what we do with your data in plain language.'
  },
  {
    id: 'scope',
    title: '3. Scope',
    content: `This policy applies to:\n• caresy.co.in, including booking, quick-help, and support pages\n• Caresy iOS and Android apps (including push notifications and live trip sharing)\n• Companion dispatch and support communications that run the Service\n\nIt does not cover:\n• Hospital information systems, doctor notes, or pharmacy systems operated by hospitals — hospitals are independent controllers.\n• External links you tap outside Caresy.\n\nWe are governed by Indian law, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (“DPDP Act”). Where you are outside India, local law may also apply, but our primary processing is in India (§16).`,
    summary: 'Covers our site and apps. Doesn’t cover hospitals’ own systems or links you click outside Caresy. Indian law governs.'
  },
  {
    id: 'info-collect',
    title: '4. Information We Collect',
    content: `We collect only what we need to arrange and run a safe companion visit. We group it so a reviewer can map app behavior to this policy without guessing.\n\n— Information You Provide\n• Account details: full name, email (from Google/Apple sign-in or you type it), primary mobile number, address, and emergency contact you enter.\n• Patient & family details: patient full name, age, gender, language preferences, mobility needs (e.g., wheelchair), cognitive/language needs, and any health context you choose to share (symptoms, conditions, past reports you describe in text).\n• Service details: hospital name/branch, doctor name, department, ward/room, diagnostic appointments, pharmacy pick-ups, and time slots.\n• Health-related uploads (voluntary): photos of prescriptions, discharge summaries, reports, or other documents you choose to attach to a booking — including text visible inside those images.\n• Support messages: what you send to support via WhatsApp, call, email, or in-app chat, and any attachments.\n• Payment context: UPI handle or card reference passed to our PCI-DSS compliant processor — we do not store full card numbers or UPI PINs.\n\n— Automatically Collected Information\n• Device & log: IP address, browser type, device type, OS and app version, language, timestamps, pages/screens viewed, booking actions, error and crash reports.\n• Performance & analytics: anonymized performance data via Vercel Speed Insights (see §8) to improve load speed — not cross-app tracking.\n• Approximate & precise location: only if you select “At home” as the meeting point (we store latitude/longitude you confirm), and — during an active visit only — live trip coordinates shared on channel trip:<id> to your booking circle. We never collect ACCESS_BACKGROUND_LOCATION.\n• Cookies identifiers (§9): only on the website, to keep sessions and remember form progress.\n\n— Information from Third Parties\n• Authentication providers: profile name and verified email from Google or Apple when you sign in with them.\n• Verification partners: for companions, verification result (not raw document images in our long-term store) from UIDAI (Aadhaar) and AuthBridge (police clearance) — used once to approve activation.\n• Communications providers: delivery status for SMS/WhatsApp (via MSG91 and WhatsApp gateway) and push (via Firebase Cloud Messaging) — not your message content.\n• Hosting & platform: infrastructure logs from Supabase (database/auth/storage) and Vercel (hosting/edge) — see §7–8.`,
    summary: 'You give us booking details and any health notes/reports you choose to share. Your phone auto-shares basic device logs and — only if you pick “At home” — location for pickup + live trip. Sign-in and verification partners send us only what’s needed.'
  },
  {
    id: 'how-we-use',
    title: '5. How We Use Information',
    content: `We use information only for these direct purposes:\n• Create and manage your account and sign-in (including Google/Apple OAuth).\n• Provide core features: match a patient to a suitable companion by language/needs, dispatch, coordinate with the hospital front desk, and share live milestone updates (arrival, registration, consultation, pharmacy, return).\n• Generate support responses and, if you use an AI-assisted feature (§6), generate helpful draft information.\n• Personalize logistics (preferred language, mobility needs) — not ads.\n• Process payments, handle refunds, and manage late-cancellation fees via secure processors.\n• Send booking confirmations, assignment alerts, live-trip updates, and essential service notices (notification permission, §10).\n• Provide support and troubleshoot issues you report.\n• Detect fraud, abuse, or misuse of the Service.\n• Comply with law and enforce our Terms.\n\nWe do not sell personal data. We do not use health content for advertising or cross-app tracking.`,
    summary: 'We use your data to run bookings, dispatch companions, send live updates, handle payments, and keep the service safe — never to sell or advertise.'
  },
  {
    id: 'ai-processing',
    title: '6. AI Processing',
    content: `Read this before you type, paste, or upload anything sensitive.\n\nWhat may go into AI:\n• Anything you type or upload that you route into an AI-assisted feature: free-text symptom descriptions, care questions, notes you add for the companion, and text extracted from photos/reports you attach. If you do not use an AI feature, that content is handled as normal booking information only.\n\nWho processes it:\n• Caresy itself processes booking/health content to run the Service. If an AI-assisted feature is enabled, that content may be sent to a third-party AI provider to generate a response. Provider: TBD — will be named here before any generative-AI feature is made generally available (current companion dispatch does not rely on a third-party generative model for clinical diagnosis).\n\nTraining:\n• We do not use your prompts, uploads, or booking content to train or improve foundation models. If we use an API-based AI provider, we will contractually require that provider not use Caresy API data for model training unless you explicitly opt in, consistent with that provider’s API data-use terms. We will update this clause if that changes and will not imply otherwise.\n\nStorage & deletion:\n• Conversation history from an AI-assisted feature, if stored, is tied to your account and is deleted when you delete your chats or your account (§14). Account deletion cascades to AI chat history. Do not paste government IDs (Aadhaar number, etc.) into AI chat — use the dedicated verification flow for companions instead.\n\nSafeguards:\n• Access is limited to authorized operations/support staff on a need-to-know basis (role-based access, logging). Data in transit is TLS-encrypted; at rest it inherits Supabase/Vercel provider controls (§11). We review AI prompts/logs for abuse and safety only.\n\nLimitations:\n• AI output is supportive information only — not a medical diagnosis, treatment plan, nursing judgment, or emergency advice. Always consult a qualified healthcare professional. If a response looks wrong or risky, tell the companion and contact support; do not act on AI content alone.`,
    summary: 'Anything you send into an AI helper (text or photos you choose) may be processed to generate a reply. We don’t use it to train models and we don’t let our AI provider train on it. AI replies are help, not medical diagnosis — always check with a doctor.'
  },
  {
    id: 'how-we-share',
    title: '7. How We Share Information',
    content: `We share only as needed to run the Service. We do not sell data to ad networks or brokers.\n\n• Assigned companion: name, hospital/room, language/mobility preference, emergency phone — only logistics needed to perform the visit.\n• Cloud hosting & database: Supabase (Postgres, Auth, Storage) and Vercel (website/edge hosting, Speed Insights) — they host and deliver the Service and see only what is stored/sent to them.\n• AI provider (if you use AI features): the prompt/upload you submit and the generated reply, to return an answer — no other personal data by default. Provider: TBD (named in §8 when live).\n• Communications: MSG91 (SMS OTP), WhatsApp gateway, and Firebase Cloud Messaging (FCM) for push — they receive phone numbers/device tokens and message delivery metadata.\n• Identity verification (companions only): AuthBridge (+ UIDAI/DigiLocker path where used) — companion documents/photos for one-time approval.\n• Payment processor: PCI-DSS compliant UPI/card provider (TBD — named in §8; processor handles raw payment data, not Caresy).\n• Platform providers: Apple and Google to verify Sign in with Apple/Google and to deliver app updates via App Store / Play.\n• Legal & safety: when required by law, court order, or to protect rights, safety, or prevent fraud.\n• Business transfer: if Caresy is sold or merged, personal data may move with the business, subject to this policy and notice under §17.\n\nSharing beyond this list does not happen without your clear consent.`,
    summary: 'We share only with the companion and the vendors that actually run the service: hosting (Supabase/Vercel), messaging (MSG91/WhatsApp/FCM), verification (AuthBridge/UIDAI), and payments — never sold.'
  },
  {
    id: 'third-party-sdks',
    title: '8. Third-Party Services / SDKs',
    content: `What each external service does, what it receives, why we use it, and whether you can opt out.\n\n• Supabase (Postgres/Auth/Storage/Realtime)\n  What: database, auth, file storage, and live trip channel (trip:<id>)\n  Receives: account, patient, booking, trip coordinates you provide; device tokens for push\n  Why: to store and run your bookings securely\n  Opt out: no — core service cannot run without storage.\n\n• Vercel (Hosting + Speed Insights)\n  What: hosts caresy.co.in and measures anonymized web performance\n  Receives: IP, browser, pages, performance timings\n  Why: fast, reliable website + performance improvement\n  Opt out: you can block analytics cookies (§9) — core site still works.\n\n• Google & Apple (Sign-in)\n  What: OAuth sign-in\n  Receives: name/email you authorize with Google/Apple\n  Why: secure sign-in without passwords\n  Opt out: use phone OTP or email instead where offered.\n\n• Firebase Cloud Messaging (FCM)\n  What: push notifications via Expo Notifications (POST_NOTIFICATIONS)\n  Receives: device push token, title/body you expect to receive\n  Why: booking/live-trip alerts\n  Opt out: deny notification permission (§10) — other features keep working.\n\n• MSG91 + WhatsApp gateway\n  What: SMS OTP and WhatsApp milestone updates\n  Receives: phone number, message content you expect via SMS/WhatsApp\n  Why: verify you and keep family updated\n  Opt out: you can use email support, but booking updates will be slower.\n\n• AuthBridge / UIDAI / DigiLocker (companions only)\n  What: Aadhaar + police verification before a companion is activated\n  Receives: companion’s verification data/images you (as companion) submit\n  Why: safety of patients\n  Opt out: companions cannot be activated without this check.\n\n• Payment processor — TBD\n  What: UPI/card processing (PCI-DSS, tokenized)\n  Receives: payment reference your bank/UPI app shares (not full card number stored by us)\n  Why: refunds/cancellation billing\n  Opt out: TBD — cash/UPI-offline options where available.\n\n• AI provider — TBD (see §6)\n  Opt out: do not use AI chat features; normal booking works without AI.\n\nIf a stack item is “TBD” above, we have marked it so we do not invent a name. The table will be completed before the feature/processor is made live and the policy version will be bumped.`,
    summary: 'Each vendor is listed with what it gets and whether you can say no. TBD means we haven’t named the final provider yet — we won’t fake it.'
  },
  {
    id: 'cookies',
    title: '9. Cookies and Similar Technologies',
    content: `Website (caresy.co.in) uses cookies; the mobile app does not.\n\nWhat we use:\n• Essential (required): session cookies to keep you signed in, remember booking form progress, and protect against fraud/CSRF.\n• Functional/performance (optional): remember preferences and, via Vercel Speed Insights, measure anonymized page load performance.\n\nWhat we do not do: no cross-app tracking, no advertising cookies, no selling of cookie data.\n\nControl:\n• You can block optional cookies in your browser settings and in our Cookie Banner (where shown). Blocking essential cookies may break sign-in and booking. You can also clear cookies anytime in browser settings.\n• App: uses device storage (Expo SecureStore, UserDefaults, FileTimestamp/SystemBootTime reasons disclosed in iOS PrivacyInfo.xcprivacy) — not cookies.\n\nMore: see “CookieBanner” in the website footer and your browser’s Help page.`,
    summary: 'Website cookies keep you signed in and remember your booking draft. You can block optional ones in your browser; essential ones are needed to book.'
  },
  {
    id: 'device-permissions',
    title: '10. Device Permissions',
    content: `We only ask for a sensitive permission when you use a feature that needs it. Every permission is optional — deny and Caresy still works, you just type instead — and you can revoke it anytime in system Settings. We show an in-app explanation before the system dialog.\n\n• Location — ACCESS_COARSE_LOCATION + ACCESS_FINE_LOCATION (Android); NSLocationWhenInUseUsageDescription + NSLocationAlwaysAndWhenInUseUsageDescription (iOS)\n  Why: to set pickup coordinates if you choose “At home” as meeting point, and — during an active visit only — to share live trip on channel trip:<id> with your booking circle (family + assigned companion + dispatch).\n  When: at booking creation if you pick At home, and while a live trip you started is active.\n  Required?: No. Type an address instead.\n  If denied: you manually enter address; no pickup geocode and no live map.\n  Background: we explicitly do NOT use ACCESS_BACKGROUND_LOCATION — blocked via app.json blockedPermissions. No continuous background tracking.\n\n• Photos & Media — READ_EXTERNAL_STORAGE (Android, pre-Android 13); NSPhotoLibraryUsageDescription (iOS)\n  Why: to attach a prescription/report from your library to a booking.\n  When: only when you tap “Attach photo/report”.\n  Required?: No.\n  If denied: upload disabled; booking otherwise normal.\n\n• Camera — NSCameraUsageDescription (iOS); blocked on Android (cameraPermission: false in expo-image-picker)\n  Why: on iOS only, to capture a new photo of a prescription/report.\n  When: only when you choose “Take photo”.\n  Required?: No.\n  If denied: pick from library or skip.\n  Note: policy text now accurately matches app.json — Android does not request CAMERA.\n\n• Notifications — POST_NOTIFICATIONS (Android); NSUserNotificationUsageDescription (iOS)\n  Why: booking confirmations, companion assignment, milestone and live-trip alerts.\n  When: after you grant permission and have an active booking.\n  Required?: No.\n  If denied: you still get in-app and WhatsApp/SMS updates where available.\n\nRevocation: Settings → Privacy → Location/Photos/Camera/Notifications → Caresy → toggle off. Denial only disables that one feature.`,
    summary: 'Location for home pickup + live trip (no background), photos/camera for reports (iOS camera only), notifications for updates — all optional, change anytime in Settings.'
  },
  {
    id: 'data-security',
    title: '11. Data Security',
    content: `What we actually do — no perfect-security promises:\n• In transit: TLS/HTTPS for website, app sync, and API calls (Supabase TLS, Firebase TLS).\n• At rest: data stored in Supabase managed Postgres/Storage with provider-managed encryption; backups inherit the same controls.\n• Access control: role-based access — only authorized operations/support staff can see booking data; least-privilege and session checks for every API call.\n• Isolation: companion verification data is handled in a separate approval queue; companions see only logistics for their assigned visit, not your whole history.\n• Monitoring: infrastructure and auth logs, rate limits, and abuse detection.\n• Third-party processors: we choose PCI-DSS compliant payment and verified-identity vendors and require them to handle data securely.\n• Incident response: if we learn of a security incident affecting your personal data, we will investigate, contain, and notify you/and regulators where legally required.\n\nWhat this does not mean: no system is 100% secure. You also help by using device biometrics/passcode and not sharing OTPs.`,
    summary: 'Encrypted in transit and at rest, limited staff access, role-based controls, and vetted vendors — but no service can promise perfect security.'
  },
  {
    id: 'data-retention',
    title: '12. Data Retention',
    content: `How long we keep things, and what happens after:\n• Active account & bookings: while your account is active and for 12 months after your last booking to help with rebooking and support.\n• Patient records & care logs: until you delete them or your account — see §14. If you keep the account, you can delete a single patient or report at any time.\n• Trip/live location: precise coordinates for the trip are kept for 30 days after drop-off to resolve disputes, then deleted or anonymized. Logs of milestone timestamps may be kept 12 months.\n• AI chat history (if you use AI features): until you delete the chat or your account — then permanently removed per §14.\n• Analytics/performance logs: aggregated/anonymized within 90 days; raw IP-logs rotated per provider default (TBD exact window).\n• Support tickets: 24 months for quality/audit, then deleted or anonymized.\n• Billing/tax invoices: anonymized statutory records retained up to 8 years under Indian law, then purged — this is the only personal-data exception after account deletion (§14).\n\nAfter deletion: personal data is removed from live databases and backups on the provider’s rolling purge cycle (typically within 30–60 days). Anonymized or aggregated data that cannot identify you may be kept for research/service improvement.`,
    summary: 'We keep bookings ~12 months, live location 30 days, support 24 months, invoices up to 8 years for law — everything else deleted when you delete your account.'
  },
  {
    id: 'user-rights',
    title: '13. User Rights',
    content: `Under the DPDP Act and applicable law, you can:\n• Access: ask what personal data we hold about you.\n• Correction: fix name, phone, address, patient details, or report attachments.\n• Deletion: delete a patient, report, chat, or your whole account (§14).\n• Withdraw consent: toggle off optional processing with the same ease as you gave it — turn off location/photos/notifications in Settings (§10) or withdraw marketing consent in the Cookie Banner/profile.\n• Export/copy (where offered): request a copy of your account/booking data in a common format.\n• Object/restrict: ask us to pause certain processing where legally available.\n• Complain: contact our Grievance Officer or email privacy@caresy.co.in — and you can approach the Data Protection Board of India where your rights under DPDP are concerned.\n\nHow to exercise:\n• In product: Profile (correct phone/name), booking detail (correct booking), app/device Settings (permissions), and Cookie Banner (cookies).\n• By email: privacy@caresy.co.in or support@caresy.co.in from your registered email — we verify ownership and respond within 30 days (DPDP-style). Identity is checked via your signed-in account — we never use an ID in the request body.\n\nWithdrawing consent may mean we cannot fulfill an active booking that needs that data (e.g., no location after you denied it). We will explain at the time.`,
    summary: 'Access, correct, delete, withdraw consent, export where available, and complain — via the app/website or privacy@caresy.co.in within 30 days.'
  },
  {
    id: 'account-deletion',
    title: '14. Account Deletion',
    content: `This is the dedicated, always-available way to erase your data — required by Google Play and Apple Guideline 5.1.1(v). No need to contact support.\n\nHow to delete:\n• Web (recommended, works for Play/App Store reviewers): visit https://caresy.co.in/account/delete while signed in (Google or Apple), type DELETE, tap “Permanently delete my account”. Direct API: POST https://caresy.co.in/api/account/delete (authenticated — you can only delete your own account).\n• In the mobile app: Profile → Danger zone → Delete account → Continue → type DELETE → confirm (calls the same endpoint with your session token).\n• By email (if you cannot sign in): email privacy@caresy.co.in or support@caresy.co.in from your registered email with subject “Delete my data” + your registered phone number — verified via account email.\n\nWhat gets deleted:\n• Deleting auth.users permanently cascades to profile, patient records, saved locations, bookings, trips/live-tracking data, care logs, AI chat history, push tokens, and notifications. Companion assignments on past bookings become anonymized (companion_user_id → null) — companions’ own accounts are untouched.\n\nWhat may remain:\n• Only anonymized billing/tax invoices retained up to 8 years by law (§12). Nothing else is kept.\n\nIs it reversible?\n• No. After you confirm, you are signed out and personal data is not recoverable. If you sign up again, it is a new account.\n\nTimeline:\n• Web/app: immediate, typically within minutes, with on-screen + email confirmation. Email requests: within 7 days. Backups: purged on provider cycle within 30–60 days (§12).\n\nIf deletion fails, contact the Grievance Officer (§18) — we will fix it within 7 days.`,
    summary: 'Delete instantly at caresy.co.in/account/delete or in the app (Profile → Delete → type DELETE). Everything erased immediately except anonymized invoices kept for law. No undo.'
  },
  {
    id: 'childrens-privacy',
    title: '15. Children’s Privacy',
    content: `Caresy is not for children. The Service is for adults (family members) booking companion assistance, typically for elderly patients.\n\n• Minimum age: you must be 18 or older to create an account. We require Google or Apple sign-in via an adult account holder — children cannot create accounts alone.\n• When a patient is a minor (e.g., a young family member): by adding that patient you confirm you are the parent or legal guardian and that you consent to us processing that minor’s information only to provide the booked visit (name, age, hospital logistics as in §4). We collect the minimum necessary, use it only for dispatch/matching/live updates (§5–7), and never for marketing, profiling, or ads.\n• If we learn a child’s data was provided without proper guardian consent, we delete it promptly after notice to privacy@caresy.co.in.\n• Target audience declaration for stores: Adults/Families — not children. No child-directed design or content.\n\nIf you are under 18, please use Caresy only with a parent or guardian.`,
    summary: '18+ to create an account. If a patient is under 18, their parent/guardian must book and consent; otherwise we delete the data.'
  },
  {
    id: 'international-transfers',
    title: '16. International Transfers',
    content: `Primary processing is in India (Supabase — region TBD, expected ap-south-1 Mumbai; Vercel global edge may route requests via the nearest edge, which can be outside India for performance). Ancillary processors (e.g., Firebase Cloud Messaging, Google/Apple auth) may process limited data (device token, email/name you authorized) outside India/ your country.\n\nWhere a transfer outside India is needed to run the Service (e.g., edge caching, push delivery), we rely on the DPDP Act’s conditions for cross-border processing and on our vendors’ contractual safeguards (encryption in transit/at rest and access controls, §11). Exact hosting region will be confirmed from Supabase/Vercel project settings and this clause will be updated from TBD to a concrete region — we will not guess.\n\nIf you are outside India, your information may be processed in India and in the vendor locations described in §7–8.`,
    summary: 'Main storage is in India; website edge and push/auth may touch systems outside India to deliver the service. We protect transfers with encryption and contracts.'
  },
  {
    id: 'changes',
    title: '17. Changes to This Policy',
    content: `We will not hide changes.\n\n• For non-material updates (typos, clarifications, new TBD filled in): we update Last Updated/Version (§1) and publish at https://caresy.co.in/privacy.\n• For material changes (new data type, new sharing, new retention rule, new AI behavior): we also notify in-app and/or by email to your registered address at least 7 days before the change takes effect, so you can review and withdraw consent or delete your account if you disagree.\n• We never reduce your rights without your clear, affirmative consent consistent with DPDP notice/consent expectations.\n• The current version is always at https://caresy.co.in/privacy — older versions available on request to privacy@caresy.co.in.`,
    summary: 'Small fixes update the date. Big changes get 7 days’ in-app/email notice before they start.'
  },
  {
    id: 'contact',
    title: '18. Contact Us',
    content: `Questions, requests, complaints, or deletion help — contact us in your preferred way.\n\nCompany: Caresy Care Services Private Limited\nSupport: support@caresy.co.in • support@caresy.co (deprecated mirror — use .in) — replies within 24 hours\nPrivacy: privacy@caresy.co.in — for rights, deletion, and DPDP requests\nGrievance Officer: Caresy Grievance Officer, Caresy Care Services Private Limited\nPostal: The Skyboat Affection, Paramount Emotions, Sector 1, Bisrakh Jalalpur, Uttar Pradesh 201318\nWebsite: https://caresy.co.in • In-app: Profile → Help & support → Chat on WhatsApp / Call / Email\nPhone: +91 97175 00225 (also WhatsApp: https://wa.me/919717500225)\n\nWe aim to acknowledge privacy/rights requests within 48 hours and resolve within 30 days. If you are in India and remain unresolved, you can approach the Data Protection Board of India.`,
    summary: 'Email privacy@caresy.co.in or support@caresy.co.in, call +91 97175 00225, or write to the Grievance Officer in Bisrakh Jalalpur.'
  }
];



export default function PrivacyPolicy() {
  const [search, setSearch] = useState('');
  const [showPlain, setShowPlain] = useState(true);
  const [activeId, setActiveId] = useState('version');

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
        <p style={{ color: 'var(--muted)' }}>Effective Date: September 01, 2026 • Version: 2.0 — rewritten, children’s privacy, and device-permission disclosures for Play & App Store compliance.</p>
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
