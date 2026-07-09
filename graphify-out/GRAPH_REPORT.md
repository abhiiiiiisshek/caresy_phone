# Graph Report - .  (2026-07-09)

## Corpus Check
- Large corpus: 112 files · ~533,089 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 416 nodes · 615 edges · 43 communities (20 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.81)
- Token cost: 149,825 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 33 edges
2. `useAuth()` - 29 edges
3. `compilerOptions` - 16 edges
4. `Button()` - 14 edges
5. `Input()` - 13 edges
6. `booking.html - Book Assistance (planned visit) page` - 12 edges
7. `isValidPincode()` - 10 edges
8. `initGlobalFeatures()` - 10 edges
9. `Badge()` - 9 edges
10. `checkPincodeServed()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Design Philosophy & Theme (Deep Ink Teal, Marigold, Vermilion, Sage)` --semantically_similar_to--> `index.html - Caresy homepage (Your Care, Our Priority)`  [INFERRED] [semantically similar]
  docs/04_Customer_App/CUSTOMER_HOME_SCREEN.md → vanilla-backup/index.html
- `Services Section (Hospital Companion, Medicine Pickup, Diagnostic Test, Safe Return)` --semantically_similar_to--> `Our Services grid (Hospital Assistance, Pick-up & Drop, Elderly Care, Full-day Concierge)`  [INFERRED] [semantically similar]
  docs/04_Customer_App/CUSTOMER_HOME_SCREEN.md → vanilla-backup/index.html
- `Verified Companions Carousel (name, rating, languages, badge)` --semantically_similar_to--> `Companion profile cards (Priya Sharma, Anil Kumar, Sarah Mathews)`  [INFERRED] [semantically similar]
  docs/04_Customer_App/CUSTOMER_HOME_SCREEN.md → vanilla-backup/trust.html
- `Trust & Safety Badges (Police Verified, Partner Hospitals, 24/7 Ops)` --semantically_similar_to--> `6-step verification timeline (Aadhaar, Police, Address, Photo, Training, Background check)`  [INFERRED] [semantically similar]
  docs/04_Customer_App/CUSTOMER_HOME_SCREEN.md → vanilla-backup/trust.html
- `service_type_enum (HOSPITAL_COMPANION, MEDICINE_PICKUP, DIAGNOSTIC_TEST, ...)` --semantically_similar_to--> `#bookingForm (patient details, appointment details, support needed)`  [INFERRED] [semantically similar]
  docs/08_Database/BOOKING_ENGINE_SCHEMA.md → vanilla-backup/booking.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pages sharing identical footer nav template (about/services/trust/faq/quick-help/booking/my-bookings/privacy/terms links)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_my_bookings_page, vanilla_backup_privacy_page, vanilla_backup_quick_help_page, vanilla_backup_terms_page, vanilla_backup_trust_page [EXTRACTED 1.00]
- **Pages sharing identical floating WhatsApp widget (+919717500225, same inline SVG)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_quick_help_page, vanilla_backup_trust_page [EXTRACTED 1.00]
- **Booking lifecycle/status concept spanning DB schema, home screen spec, and both admin/customer JS renderers** — docs_08_database_booking_engine_schema_booking_status_enum, docs_04_customer_app_customer_home_screen_active_booking_banner, vanilla_backup_admin_ops_renderboard, vanilla_backup_my_bookings_renderbookings [INFERRED 0.80]

## Communities (43 total, 23 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (39): CHECKLIST, FOUNDERS, BENEFITS, STEPS, SERVICES, TESTIMONIALS, Trust(), VERIFICATION_STEPS (+31 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (35): AdminCompanions(), ApprovalStatus, CompanionRow, DocRow, FILTERS, ReviewSheet(), STATUS_TONE, ApprovalStatus (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (46): API_BASE, bookingForm, bookingId, bookingStatus, CARESY_STATS, checkAndVerifyOTP(), companionDatabase, dateInput (+38 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (25): AdminServiceAreas(), AreaRow, Booking(), STEPS, PRIVACY_SECTIONS, QuickHelp(), CATEGORIES, FAQS (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (36): Verified Companions Carousel (name, rating, languages, badge), Design Philosophy & Theme (Deep Ink Teal, Marigold, Vermilion, Sage), Services Section (Hospital Companion, Medicine Pickup, Diagnostic Test, Safe Return), Trust & Safety Badges (Police Verified, Partner Hospitals, 24/7 Ops), bookings table (central transaction table), locations table (hospitals, labs, home addresses), patients table (patient separate from paying customer), service_type_enum (HOSPITAL_COMPANION, MEDICINE_PICKUP, DIAGNOSTIC_TEST, ...) (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (25): dependencies, lucide-react, next, react, react-dom, @supabase/ssr, @supabase/supabase-js, @vercel/speed-insights (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (13): activeOtps, adminSessions, app, cors, DB_DIR, DB_FILE, express, fs (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (12): AdminOps(), BookingRecord, STATUS_OPTIONS, ActiveBookingInfo, APP_SERVICES, Home(), TRUST_ITEMS, Companion (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.20
Nodes (12): BookingCard(), BookingRecord, CompanionDetails, DetailSheet(), formatDate(), getStatusInfo(), isPastStatus(), mailLink() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (10): dependencies, cors, express, description, main, name, scripts, dev (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (6): aboutContent, aboutFile, faqContent, faqFile, fs, path

### Community 12 - "Community 12"
Cohesion: 0.60
Nodes (3): config, proxy(), updateSession()

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (4): content, file, fs, path

### Community 14 - "Community 14"
Cohesion: 0.40
Nodes (4): content, file, fs, path

### Community 15 - "Community 15"
Cohesion: 0.40
Nodes (4): content, file, fs, path

### Community 16 - "Community 16"
Cohesion: 0.40
Nodes (4): content, file, fs, path

### Community 18 - "Community 18"
Cohesion: 0.50
Nodes (3): files, fs, path

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (3): Drop-us-a-message contact form (client-side alert only), contact.html - Contact Us page, for-hospitals.html - For Hospitals partner page

## Knowledge Gaps
- **209 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+204 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 3` to `Community 8`, `Community 1`, `Community 9`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 1` to `Community 8`, `Community 9`, `Community 3`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Button()` connect `Community 0` to `Community 8`, `Community 1`, `Community 3`, `Community 9`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05480225988700565 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.055152394775036286 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.052244897959183675 - nodes in this community are weakly interconnected._