# Graph Report - caresy_m3_worktree  (2026-07-27)

## Corpus Check
- 200 files · ~410,514 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1234 nodes · 1563 edges · 133 communities (79 shown, 54 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2765af3b`
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
- route.ts
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
- package.json
- page.tsx
- next.config.ts
- postcss.config.mjs
- page.tsx
- next.config.ts
- postcss.config.mjs
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- page.tsx
- dependencies
- Capacitor.podspec.json
- AppDelegate
- CapacitorApp.podspec.json
- CapacitorSplashScreen.podspec.json
- fcm.ts
- InstallPrompt.tsx
- page.tsx
- layout.tsx
- useAuth
- index.ts
- page.tsx
- page.tsx
- Pods-App-frameworks.sh
- page.tsx
- Header.tsx
- Auth & Domain Configuration
- ExampleInstrumentedTest.java
- UpdateChecker
- MainActivity
- UpdateChecker
- ExampleUnitTest.java
- gradlew
- PodsDummy_Capacitor
- PodsDummy_CapacitorApp
- PodsDummy_CapacitorCordova
- PodsDummy_CapacitorSplashScreen
- PodsDummy_Pods_App
- layout.tsx
- layout.tsx
- layout.tsx
- layout.tsx
- layout.tsx
- layout.tsx
- layout.tsx
- layout.tsx
- layout.tsx
- capacitor.config.ts

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 55 edges
2. `useAuth()` - 33 edges
3. `Button()` - 17 edges
4. `compilerOptions` - 16 edges
5. `compilerOptions` - 16 edges
6. `compilerOptions` - 16 edges
7. `Input()` - 15 edges
8. `booking.html - Book Assistance (planned visit) page` - 12 edges
9. `AdminGuard()` - 11 edges
10. `useToast()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `OverviewBody()` --calls--> `createClient()`  [EXTRACTED]
  apps/admin/src/app/page.tsx → packages/auth/src/supabase/client.ts
- `UsersList()` --calls--> `createClient()`  [EXTRACTED]
  apps/admin/src/app/users/page.tsx → packages/auth/src/supabase/client.ts
- `LocationShare()` --calls--> `createClient()`  [EXTRACTED]
  apps/companion/src/components/LocationShare.tsx → packages/auth/src/supabase/client.ts
- `Passport()` --calls--> `createClient()`  [EXTRACTED]
  apps/website/src/app/care/page.tsx → packages/auth/src/supabase/client.ts
- `AnalyticsBody()` --calls--> `createClient()`  [EXTRACTED]
  apps/admin/src/app/analytics/page.tsx → packages/auth/src/supabase/client.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pages sharing identical footer nav template (about/services/trust/faq/quick-help/booking/my-bookings/privacy/terms links)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_my_bookings_page, vanilla_backup_privacy_page, vanilla_backup_quick_help_page, vanilla_backup_terms_page, vanilla_backup_trust_page [EXTRACTED 1.00]
- **Pages sharing identical floating WhatsApp widget (+919717500225, same inline SVG)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_quick_help_page, vanilla_backup_trust_page [EXTRACTED 1.00]

## Communities (133 total, 54 thin omitted)

### Community 0 - "Card"
Cohesion: 0.10
Nodes (21): copyFor(), FILTERS, NotifBody(), NotifRow, NotifStatus, STATUS_COPY, STATUS_TONE, ACTIVE_TRIP (+13 more)

### Community 1 - "createClient"
Cohesion: 0.04
Nodes (48): dependencies, @caresy/auth, @caresy/types, @caresy/ui, @caresy/utils, lucide-react, next, react (+40 more)

### Community 2 - "script.js"
Cohesion: 0.05
Nodes (46): API_BASE, bookingForm, bookingId, bookingStatus, CARESY_STATS, checkAndVerifyOTP(), companionDatabase, dateInput (+38 more)

### Community 3 - "page.tsx"
Cohesion: 0.05
Nodes (42): dependencies, @caresy/auth, @caresy/types, @caresy/ui, @caresy/utils, lucide-react, next, react (+34 more)

### Community 4 - "booking.html - Book Assistance (planned visit) page"
Cohesion: 0.07
Nodes (31): bookings table (central transaction table), locations table (hospitals, labs, home addresses), patients table (patient separate from paying customer), about.html - About Us page, checkAuth() function, companions[] hardcoded roster (Priya Sharma, Anil Kumar, Sarah Mathews), loadAllBookings() function (fetch /api/admin/bookings), admin-ops.html - Live Operations Desk (dispatcher board) (+23 more)

### Community 5 - "devDependencies"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, version, workspaces, apps/* (+1 more)

### Community 6 - "compilerOptions"
Cohesion: 0.05
Nodes (40): dependencies, @caresy/auth, @caresy/types, @caresy/ui, lucide-react, next, react, react-dom (+32 more)

### Community 7 - "server.js"
Cohesion: 0.12
Nodes (13): activeOtps, adminSessions, app, cors, DB_DIR, DB_FILE, express, fs (+5 more)

### Community 8 - "LocationBadge.tsx"
Cohesion: 0.13
Nodes (12): metadata, poppins, viewport, metadata, poppins, viewport, PortalHeader(), AuthContext (+4 more)

### Community 9 - "page.tsx"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+22 more)

### Community 10 - "package.json"
Cohesion: 0.15
Nodes (12): cors, express, dependencies, cors, express, description, main, name (+4 more)

### Community 11 - "patch-about-faq.js"
Cohesion: 0.29
Nodes (6): aboutContent, aboutFile, faqContent, faqFile, fs, path

### Community 12 - "proxy.ts"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+22 more)

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

### Community 17 - "route.ts"
Cohesion: 0.06
Nodes (31): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+23 more)

### Community 18 - "update-html.js"
Cohesion: 0.50
Nodes (3): files, fs, path

### Community 19 - "contact.html - Contact Us page"
Cohesion: 0.67
Nodes (3): Drop-us-a-message contact form (client-side alert only), contact.html - Contact Us page, for-hospitals.html - For Hospitals partner page

### Community 22 - "eslint.config.mjs"
Cohesion: 0.08
Nodes (23): dependencies, @caresy/ui, lucide-react, @supabase/ssr, @supabase/supabase-js, exports, ./modal, ./supabase/callback (+15 more)

### Community 23 - "next.config.ts"
Cohesion: 0.16
Nodes (16): Calendar(), BookingRecord, BookingRow(), CompanionDetails, DetailSheet(), formatDate(), getStatusInfo(), isPastBooking() (+8 more)

### Community 24 - "postcss.config.mjs"
Cohesion: 0.12
Nodes (9): CHECKLIST, FOUNDERS, BENEFITS, STEPS, TESTIMONIALS, Card(), CardProps, CardVariant (+1 more)

### Community 25 - "route.ts"
Cohesion: 0.08
Nodes (28): SERVICES, Trust(), VERIFICATION_STEPS, APP_TABS, Badge(), BadgeProps, BadgeSize, BadgeTone (+20 more)

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
Cohesion: 0.14
Nodes (14): GET, config, proxy(), GET, config, proxy(), GET, config (+6 more)

### Community 47 - "index.ts"
Cohesion: 0.47
Nodes (4): Companion, COMPANIONS, findCompanionByName(), matchCompanionByDepartment()

### Community 48 - "Badge.tsx"
Cohesion: 0.27
Nodes (8): HospitalAutocomplete(), AREA_PINCODE, areas, pct, served, sql, Hospital, HOSPITALS

### Community 50 - "page.tsx"
Cohesion: 0.31
Nodes (6): AnalyticsBody(), MUTED_STATUSES, Stats, STATUS_ORDER, estimateBookingPrice(), PricedBooking

### Community 51 - "page.tsx"
Cohesion: 0.22
Nodes (8): exports, ./theme.css, react, name, peerDependencies, react, private, version

### Community 52 - "README.md"
Cohesion: 0.04
Nodes (42): Client integration (see blueprint (c)), ETA (Edge Function `trip-eta`), Required dashboard step (cannot be done in SQL), Transport model (why two channels), Trip creation & lifecycle (migration 18), Trips & Real-Time Companion Location Tracking, What the migration creates, 1. Update the existing Vercel project (website) (+34 more)

### Community 53 - "Card.tsx"
Cohesion: 0.22
Nodes (7): LocationShare(), CHIPS, FaqCategory, FAQS, Support(), supWa(), Button()

### Community 54 - "page.tsx"
Cohesion: 0.25
Nodes (7): dependencies, @caresy/auth, exports, @caresy/auth, name, private, version

### Community 55 - "page.tsx"
Cohesion: 0.15
Nodes (24): AreasBody(), Booking(), CARE_NEEDS, fmtSlot(), label, LANGUAGES, SERVICES, TIME_SLOTS (+16 more)

### Community 66 - "package.json"
Cohesion: 0.40
Nodes (4): exports, name, private, version

### Community 68 - "page.tsx"
Cohesion: 0.22
Nodes (4): PRIVACY_SECTIONS, TERMS_SECTIONS, Input(), InputProps

### Community 72 - "page.tsx"
Cohesion: 0.08
Nodes (29): GuidesPage(), metadata, ACTIVE_STATUS_LABEL, ActiveBookingInfo, BOOKING_HEADERS, fmtWhen(), GestureKey, GESTURES (+21 more)

### Community 79 - "page.tsx"
Cohesion: 0.16
Nodes (10): CompanionRow, CompanionRow, DOC_TYPES, fmtWhen(), JobCard(), JobRow, LANGUAGE_OPTIONS, SPECIALTY_OPTIONS (+2 more)

### Community 84 - "dependencies"
Cohesion: 0.06
Nodes (30): dependencies, @capacitor/android, @capacitor/app, @capacitor/core, @capacitor/haptics, @capacitor/ios, @capacitor/network, @capacitor/push-notifications (+22 more)

### Community 85 - "Capacitor.podspec.json"
Cohesion: 0.09
Nodes (21): authors, Ionic Team, dependencies, CapacitorCordova, homepage, license, module_map, name (+13 more)

### Community 86 - "AppDelegate"
Cohesion: 0.13
Nodes (13): Any, AppDelegate, Bool, Capacitor, NSUserActivity, UIApplication, UIApplicationDelegate, UIKit (+5 more)

### Community 87 - "CapacitorApp.podspec.json"
Cohesion: 0.11
Nodes (18): authors, dependencies, Capacitor, homepage, ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}, license, name, platforms (+10 more)

### Community 88 - "CapacitorSplashScreen.podspec.json"
Cohesion: 0.11
Nodes (18): authors, dependencies, Capacitor, homepage, ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}, license, name, platforms (+10 more)

### Community 89 - "fcm.ts"
Cohesion: 0.19
Nodes (14): GET(), QueuedRow, accessToken(), b64url(), importPrivateKey(), projectId(), PushMessage, PushResult (+6 more)

### Community 90 - "InstallPrompt.tsx"
Cohesion: 0.16
Nodes (11): BIPEvent, ic, InstallPrompt(), isStandalone(), BrowserBarArt(), ConfirmCardArt(), Item, LeafSprig() (+3 more)

### Community 91 - "page.tsx"
Cohesion: 0.13
Nodes (12): CareEvent, CareInner(), DOC_TYPES, Documents(), fmt(), KIND_STYLE, Member, Passport() (+4 more)

### Community 92 - "layout.tsx"
Cohesion: 0.15
Nodes (11): epilogue, JSON_LD, metadata, poppins, viewport, CookieBanner(), MobileBottomNav(), RegisterSW() (+3 more)

### Community 93 - "useAuth"
Cohesion: 0.18
Nodes (10): AdminTopbar(), ApprovedDashboard(), CompanionPortal(), ReapplyButton(), RegistrationForm(), Login(), CapacitorGlobal, NativeBridge() (+2 more)

### Community 94 - "index.ts"
Cohesion: 0.24
Nodes (7): corsHeaders(), isAllowed(), STATIC_ALLOWED, EtaRequest, EtaResponse, LatLng, NOTE: OpenRouteService gives free-flow durations (no live traffic), which is

### Community 95 - "page.tsx"
Cohesion: 0.15
Nodes (14): CompanionsBody(), DocRow, FILTERS, ReviewSheet(), STATUS_TONE, statusLabel(), ACTIVE_STATUSES, fmtEta() (+6 more)

### Community 96 - "page.tsx"
Cohesion: 0.22
Nodes (7): ApprovedCompanion, BookingRecord, COLUMNS, initials(), OpsBoard(), OpsMetrics, STATUS_OPTIONS

### Community 97 - "Pods-App-frameworks.sh"
Cohesion: 0.43
Nodes (6): code_sign_if_enabled(), install_bcsymbolmap(), install_dsym(), install_framework(), Pods-App-frameworks.sh script, strip_invalid_archs()

### Community 98 - "page.tsx"
Cohesion: 0.43
Nodes (5): headline(), osmEmbed(), stepsFor(), TrackedBooking, TrackingInner()

### Community 99 - "Header.tsx"
Cohesion: 0.47
Nodes (5): APP_TABS, Header(), STANDALONE, titleFor(), TITLES

### Community 100 - "Auth & Domain Configuration"
Cohesion: 0.33
Nodes (5): Auth & Domain Configuration, Google Cloud console (OAuth client), How the flow works (already built), Supabase dashboard config, Verify

### Community 101 - "ExampleInstrumentedTest.java"
Cohesion: 0.60
Nodes (3): ExampleInstrumentedTest, Test, RunWith

### Community 103 - "MainActivity"
Cohesion: 0.50
Nodes (3): MainActivity, BridgeActivity, Override

### Community 107 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **594 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+589 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `page.tsx` to `Card`, `page.tsx`, `page.tsx`, `page.tsx`, `LocationBadge.tsx`, `layout.tsx`, `page.tsx`, `page.tsx`, `Card.tsx`, `next.config.ts`, `page.tsx`, `useAuth`, `page.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `cookieOptionsFor()` connect `layout.tsx` to `page.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `useAuth` to `Card`, `LocationBadge.tsx`, `page.tsx`, `page.tsx`, `IconButton.tsx`, `next.config.ts`, `page.tsx`, `page.tsx`, `layout.tsx`, `page.tsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _594 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Card` be split into smaller, more focused modules?**
  _Cohesion score 0.10483870967741936 - nodes in this community are weakly interconnected._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `script.js` be split into smaller, more focused modules?**
  _Cohesion score 0.052244897959183675 - nodes in this community are weakly interconnected._