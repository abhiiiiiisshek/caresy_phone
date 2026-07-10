# Graph Report - caresy_phone  (2026-07-09)

## Corpus Check
- 86 files · ~539,006 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 516 nodes · 745 edges · 65 communities (31 shown, 34 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db70bda3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Card
- createClient
- script.js
- page.tsx
- booking.html - Book Assistance (planned visit) page
- devDependencies
- compilerOptions
- server.js
- LocationBadge.tsx
- page.tsx
- package.json
- patch-about-faq.js
- proxy.ts
- patch-index.js
- patch-quickhelp.js
- patch-services.js
- patch-trust.js
- route.ts
- update-html.js
- contact.html - Contact Us page
- Warning: Non-standard Next.js version with breaking changes
- Dynamic Active Booking Banner (renders when bookings.status is ASSIGNED/IN_PROGRESS)
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- graphify knowledge-graph workflow rules
- Accessibility & WCAG AA Checklist
- Sticky App Bar (Header) component spec
- Sticky Bottom Navigation Bar (Home, Bookings, Support, Profile)
- Hero Intent Selector: Emergency Now vs Schedule Visit
- Micro-Animations & Interactions (pulse, hover/tap, carousel physics)
- Responsive Design (Desktop Adaptation, phone-frame wrapper)
- Spacing & Typography (Material 3 scale, 8px grid, Poppins)
- Home Screen Wireframe & Visual Layout (mermaid graph)
- audit_logs table (immutable compliance ledger)
- booking_type_enum (INSTANT, SCHEDULED)
- Entity Relationship Diagram (USERS, PATIENTS, BOOKINGS, LOCATIONS, AUDIT_LOGS)
- Query indexes (customer_id, companion_id, status, scheduled_time)
- trigger_audit_bookings() function/trigger
- trigger_set_timestamp() function/trigger
- Caresy Next.js project README (create-next-app bootstrap)
- how-it-works.html - How It Works timeline page
- Caresy — Developer Handoff
- Customer Home Screen Design Specification
- Caresy Booking Engine Schema
- layout.tsx
- index.ts
- Badge.tsx
- IconButton.tsx
- page.tsx
- page.tsx
- README.md
- Card.tsx
- page.tsx
- page.tsx
- AGENTS.md
- CLAUDE.md
- CLAUDE.md project instructions (imports AGENTS.md)
- Verified Companions Carousel (name, rating, languages, badge)
- Design Philosophy & Theme (Deep Ink Teal, Marigold, Vermilion, Sage)
- Services Section (Hospital Companion, Medicine Pickup, Diagnostic Test, Safe Return)
- Trust & Safety Badges (Police Verified, Partner Hospitals, 24/7 Ops)
- booking_status_enum (DRAFT, PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- service_type_enum (HOSPITAL_COMPANION, MEDICINE_PICKUP, DIAGNOSTIC_TEST, ...)

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 41 edges
2. `useAuth()` - 37 edges
3. `Button()` - 18 edges
4. `compilerOptions` - 16 edges
5. `Input()` - 15 edges
6. `booking.html - Book Assistance (planned visit) page` - 12 edges
7. `Badge()` - 11 edges
8. `Caresy — Developer Handoff` - 11 edges
9. `isValidPincode()` - 10 edges
10. `initGlobalFeatures()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `#bookingForm (patient details, appointment details, support needed)` --shares_data_with--> `patients table (patient separate from paying customer)`  [INFERRED]
  vanilla-backup/booking.html → docs/08_Database/BOOKING_ENGINE_SCHEMA.md
- `#bookingForm (patient details, appointment details, support needed)` --shares_data_with--> `locations table (hospitals, labs, home addresses)`  [INFERRED]
  vanilla-backup/booking.html → docs/08_Database/BOOKING_ENGINE_SCHEMA.md
- `renderBoard() function (renders pending/active/completed columns, wires Save button)` --shares_data_with--> `bookings table (central transaction table)`  [INFERRED]
  vanilla-backup/admin-ops.html → docs/08_Database/BOOKING_ENGINE_SCHEMA.md
- `renderBookings() function (booking cards + live tracker timeline)` --shares_data_with--> `bookings table (central transaction table)`  [INFERRED]
  vanilla-backup/my-bookings.html → docs/08_Database/BOOKING_ENGINE_SCHEMA.md
- `Trust()` --calls--> `useLiveMetrics()`  [EXTRACTED]
  src/app/trust/page.tsx → src/hooks/useLiveMetrics.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pages sharing identical footer nav template (about/services/trust/faq/quick-help/booking/my-bookings/privacy/terms links)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_my_bookings_page, vanilla_backup_privacy_page, vanilla_backup_quick_help_page, vanilla_backup_terms_page, vanilla_backup_trust_page [EXTRACTED 1.00]
- **Pages sharing identical floating WhatsApp widget (+919717500225, same inline SVG)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_quick_help_page, vanilla_backup_trust_page [EXTRACTED 1.00]

## Communities (65 total, 34 thin omitted)

### Community 0 - "Card"
Cohesion: 0.15
Nodes (6): CHECKLIST, FOUNDERS, BENEFITS, STEPS, TESTIMONIALS, Card()

### Community 1 - "createClient"
Cohesion: 0.06
Nodes (63): AdminAnalytics(), Stats, STATUS_ORDER, AdminCompanions(), ApprovalStatus, CompanionRow, DocRow, FILTERS (+55 more)

### Community 2 - "script.js"
Cohesion: 0.05
Nodes (46): API_BASE, bookingForm, bookingId, bookingStatus, CARESY_STATS, checkAndVerifyOTP(), companionDatabase, dateInput (+38 more)

### Community 3 - "page.tsx"
Cohesion: 0.33
Nodes (4): CATEGORIES, FAQS, Support(), supWa()

### Community 4 - "booking.html - Book Assistance (planned visit) page"
Cohesion: 0.07
Nodes (31): bookings table (central transaction table), locations table (hospitals, labs, home addresses), patients table (patient separate from paying customer), about.html - About Us page, checkAuth() function, companions[] hardcoded roster (Priya Sharma, Anil Kumar, Sarah Mathews), loadAllBookings() function (fetch /api/admin/bookings), admin-ops.html - Live Operations Desk (dispatcher board) (+23 more)

### Community 5 - "devDependencies"
Cohesion: 0.08
Nodes (25): dependencies, lucide-react, next, react, react-dom, @supabase/ssr, @supabase/supabase-js, @vercel/speed-insights (+17 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "server.js"
Cohesion: 0.12
Nodes (13): activeOtps, adminSessions, app, cors, DB_DIR, DB_FILE, express, fs (+5 more)

### Community 8 - "LocationBadge.tsx"
Cohesion: 0.13
Nodes (14): ActiveBookingInfo, APP_SERVICES, Home(), TRUST_ITEMS, BadgeState, LocationBadge(), QUICK_PICKS, readStored() (+6 more)

### Community 9 - "page.tsx"
Cohesion: 0.20
Nodes (12): BookingCard(), BookingRecord, CompanionDetails, DetailSheet(), formatDate(), getStatusInfo(), isPastStatus(), mailLink() (+4 more)

### Community 10 - "package.json"
Cohesion: 0.18
Nodes (10): dependencies, cors, express, description, main, name, scripts, dev (+2 more)

### Community 11 - "patch-about-faq.js"
Cohesion: 0.29
Nodes (6): aboutContent, aboutFile, faqContent, faqFile, fs, path

### Community 12 - "proxy.ts"
Cohesion: 0.60
Nodes (3): config, proxy(), updateSession()

### Community 13 - "patch-index.js"
Cohesion: 0.40
Nodes (4): content, file, fs, path

### Community 14 - "patch-quickhelp.js"
Cohesion: 0.40
Nodes (4): content, file, fs, path

### Community 15 - "patch-services.js"
Cohesion: 0.40
Nodes (4): content, file, fs, path

### Community 16 - "patch-trust.js"
Cohesion: 0.40
Nodes (4): content, file, fs, path

### Community 18 - "update-html.js"
Cohesion: 0.50
Nodes (3): files, fs, path

### Community 19 - "contact.html - Contact Us page"
Cohesion: 0.67
Nodes (3): Drop-us-a-message contact form (client-side alert only), contact.html - Contact Us page, for-hospitals.html - For Hospitals partner page

### Community 43 - "Caresy — Developer Handoff"
Cohesion: 0.06
Nodes (32): 10. Quick status snapshot, 1. Product overview & vision, 2. Tech stack, 3. Repository map (key files), 4. Database — schema & migrations, 5. What has been built (chronological), 6. What's PENDING and HOW to do it, 7. Setup / running locally (+24 more)

### Community 44 - "Customer Home Screen Design Specification"
Cohesion: 0.11
Nodes (18): 1. Design Philosophy & Theme, 2. Wireframe & Visual Layout, 3. Component Hierarchy & Specifications, 4. Spacing & Typography (Material 3 Scale), 5. Micro-Animations & Interactions, 6. Accessibility & WCAG AA Checklist, 7. Responsive Design (Desktop Adaptation), A. Sticky App Bar (Header) (+10 more)

### Community 45 - "Caresy Booking Engine Schema"
Cohesion: 0.12
Nodes (15): 1. Enums & Custom Types, 2. Core Tables, 3. Indexes, 4. Database Triggers & Functions, 5. Entity Relationship Diagram (ERD), 6. Migration Notes & Deployment Strategy, 7. TODOs (Pending Product Clarifications), A. Auto-Update Timestamp (+7 more)

### Community 46 - "layout.tsx"
Cohesion: 0.19
Nodes (8): metadata, poppins, viewport, CookieBanner(), MobileBottomNav(), APP_TABS, WhatsAppWidget(), AuthProvider()

### Community 47 - "index.ts"
Cohesion: 0.24
Nodes (9): ButtonProps, ButtonShape, ButtonSize, ButtonVariant, SIZES, VARIANTS, InputProps, StepItem() (+1 more)

### Community 48 - "Badge.tsx"
Cohesion: 0.22
Nodes (7): BadgeProps, BadgeSize, BadgeTone, SIZES, TONES, CompanionCard(), CompanionCardProps

### Community 49 - "IconButton.tsx"
Cohesion: 0.25
Nodes (5): IconButton(), IconButtonProps, IconButtonVariant, VARIANTS, APP_TABS

### Community 50 - "page.tsx"
Cohesion: 0.33
Nodes (4): Trust(), VERIFICATION_STEPS, StatCard(), StatCardProps

### Community 51 - "page.tsx"
Cohesion: 0.40
Nodes (3): SERVICES, ServiceCard(), ServiceCardProps

### Community 52 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 53 - "Card.tsx"
Cohesion: 0.50
Nodes (3): CardProps, CardVariant, VARIANTS

## Knowledge Gaps
- **279 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+274 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `createClient` to `LocationBadge.tsx`, `page.tsx`, `page.tsx`, `layout.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `createClient` to `LocationBadge.tsx`, `page.tsx`, `layout.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Button()` connect `createClient` to `LocationBadge.tsx`, `page.tsx`, `page.tsx`, `index.ts`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _280 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05669050051072523 - nodes in this community are weakly interconnected._
- **Should `script.js` be split into smaller, more focused modules?**
  _Cohesion score 0.052244897959183675 - nodes in this community are weakly interconnected._
- **Should `booking.html - Book Assistance (planned visit) page` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._