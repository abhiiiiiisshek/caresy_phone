# Graph Report - caresy_m3_worktree  (2026-08-11)

## Corpus Check
- 255 files · ~456,230 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1556 nodes · 2139 edges · 174 communities (112 shown, 62 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6dc9600a`
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
- Card
- Badge.tsx
- Database
- updateSession
- page.tsx
- README.md
- page.tsx
- page.tsx
- createClient
- AGENTS.md
- useAuth
- CLAUDE.md project instructions (imports AGENTS.md)
- Verified Companions Carousel (name, rating, languages, badge)
- Design Philosophy & Theme (Deep Ink Teal, Marigold, Vermilion, Sage)
- Services Section (Hospital Companion, Medicine Pickup, Diagnostic Test, Safe Return)
- Trust & Safety Badges (Police Verified, Partner Hospitals, 24/7 Ops)
- booking_status_enum (DRAFT, PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- service_type_enum (HOSPITAL_COMPANION, MEDICINE_PICKUP, DIAGNOSTIC_TEST, ...)
- Card
- package.json
- page.tsx
- page.tsx
- next.config.ts
- postcss.config.mjs
- page.tsx
- next.config.ts
- postcss.config.mjs
- layout.tsx
- next.config.ts
- postcss.config.mjs
- page.tsx
- README.md
- Caresy Live Tracking — Handoff, Next Steps & Vision
- Phases
- AuthContext.tsx
- dependencies
- Capacitor.podspec.json
- AppDelegate
- CapacitorApp.podspec.json
- CapacitorSplashScreen.podspec.json
- fcm.ts
- InstallPrompt.tsx
- page.tsx
- layout.tsx
- TRIPS_AND_LIVE_TRACKING.md
- index.ts
- page.tsx
- PROJECT_MEMORY.md — durable "what & why"
- Pods-App-frameworks.sh
- page.tsx
- Trips & Real-Time Companion Location Tracking
- Auth & Domain Configuration
- ExampleInstrumentedTest.java
- UpdateChecker
- MainActivity
- UpdateChecker
- Architecture
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
- Caresy Monorepo Deployment
- page.tsx
- hospitals.ts
- ADR-NNNN: <short decision, present tense>
- ADR-0002: npm workspaces monorepo, three Next apps, no build orchestrator
- ADR-0006: Transport is facilitated and recorded, never billed
- Current state
- Security
- ADR-0001: Supabase (Postgres + RLS) is the backend; no custom API tier
- ADR-0003: Scheduling and push dispatch run in Postgres (pg_cron + pg_net)
- ADR-0004: The Android app is a Capacitor shell pointing at the live site
- ADR-0005: Cash/UPI collected at completion; no payment gateway
- ADR-0007: Guest tracking uses a separate `share_token`, not `reference_code`
- ADR-0008: `assert`-based self-checks instead of a test framework
- Caresy
- page.tsx
- page.tsx
- page.tsx
- IconButton.tsx
- LocationBadge.tsx
- README.md
- slots.check.ts
- Header.tsx
- companions.ts
- layout.tsx
- msg91.ts
- ADR-0009 — Native mobile with Expo, not a WebView shell
- page.tsx
- @caresy/types
- @caresy/utils
- @lottiefiles/dotlottie-react
- react-dom
- @vercel/speed-insights

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 56 edges
2. `useAuth()` - 38 edges
3. `Button()` - 20 edges
4. `Booking()` - 18 edges
5. `compilerOptions` - 16 edges
6. `compilerOptions` - 16 edges
7. `compilerOptions` - 16 edges
8. `Input()` - 16 edges
9. `normalizeIndianMobile()` - 14 edges
10. `isValidIndianMobile()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `OverviewBody()` --calls--> `createClient()`  [EXTRACTED]
  apps/admin/src/app/page.tsx → packages/auth/src/supabase/client.ts
- `UsersList()` --calls--> `createClient()`  [EXTRACTED]
  apps/admin/src/app/users/page.tsx → packages/auth/src/supabase/client.ts
- `AdminTopbar()` --calls--> `useAuth()`  [EXTRACTED]
  apps/admin/src/components/AdminShell.tsx → packages/auth/src/AuthContext.tsx
- `RideLog()` --calls--> `createClient()`  [EXTRACTED]
  apps/companion/src/app/page.tsx → packages/auth/src/supabase/client.ts
- `Passport()` --calls--> `createClient()`  [EXTRACTED]
  apps/website/src/app/care/page.tsx → packages/auth/src/supabase/client.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pages sharing identical footer nav template (about/services/trust/faq/quick-help/booking/my-bookings/privacy/terms links)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_my_bookings_page, vanilla_backup_privacy_page, vanilla_backup_quick_help_page, vanilla_backup_terms_page, vanilla_backup_trust_page [EXTRACTED 1.00]
- **Pages sharing identical floating WhatsApp widget (+919717500225, same inline SVG)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_quick_help_page, vanilla_backup_trust_page [EXTRACTED 1.00]

## Communities (174 total, 62 thin omitted)

### Community 0 - "Card"
Cohesion: 0.13
Nodes (17): ACTIVE_TRIP, CARDS, Counts, OverviewBody(), AreaRow, AreasBody(), SettingRow, SettingsBody() (+9 more)

### Community 1 - "createClient"
Cohesion: 0.12
Nodes (17): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+9 more)

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
Nodes (42): dependencies, @caresy/auth, @caresy/types, @caresy/ui, @caresy/utils, lucide-react, next, react (+34 more)

### Community 7 - "server.js"
Cohesion: 0.12
Nodes (13): activeOtps, adminSessions, app, cors, DB_DIR, DB_FILE, express, fs (+5 more)

### Community 8 - "LocationBadge.tsx"
Cohesion: 0.16
Nodes (14): Booking(), CARE_NEEDS, DURATIONS, fmtSlot(), label, LANGUAGES, SavedPatient, SERVICES (+6 more)

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
Nodes (25): dependencies, @caresy/ui, @caresy/utils, lucide-react, @supabase/ssr, @supabase/supabase-js, exports, ./modal (+17 more)

### Community 23 - "next.config.ts"
Cohesion: 0.15
Nodes (14): MascotProps, ARM_ROT, ArmPose, Eyes, Mouth, Obj, PlaceholderMascot(), PoseSpec (+6 more)

### Community 24 - "postcss.config.mjs"
Cohesion: 0.06
Nodes (51): AnalyticsBody(), FareRow, hourLabel(), MUTED_STATUSES, rupees(), Stats, STATUS_ORDER, bookingRevenueRupees() (+43 more)

### Community 25 - "route.ts"
Cohesion: 0.17
Nodes (16): InputProps, StatCard(), StatCardProps, EmptyState(), EmptyStateProps, ErrorState(), ErrorStateProps, LoadingState() (+8 more)

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
Cohesion: 0.13
Nodes (14): GET, config, proxy(), GET, config, proxy(), GET, config (+6 more)

### Community 47 - "Card"
Cohesion: 0.22
Nodes (8): copyFor(), FILTERS, NotifBody(), NotifRow, NotifStatus, STATUS_COPY, STATUS_TONE, Badge()

### Community 48 - "Badge.tsx"
Cohesion: 0.23
Nodes (8): CompanionRow, DocRow, FILTERS, ReviewSheet(), STATUS_TONE, statusLabel(), CompanionRow, ApprovalStatus

### Community 49 - "Database"
Cohesion: 0.29
Nodes (7): Booking status, Core tables, Database, Functions that enforce rules, Gotchas, Ledger, Rules

### Community 51 - "page.tsx"
Cohesion: 0.22
Nodes (8): exports, ./theme.css, react, name, peerDependencies, react, private, version

### Community 52 - "README.md"
Cohesion: 0.18
Nodes (11): 1. What we built, 2. Get it on your machine (import to your CLI), 2a. Backend setup (`caresy_phone` + Supabase), 2b. Mobile app setup (`caresy-app`), 2c. Test the full loop, 3. Keep in mind — DO, 4. Keep in mind — DON'T, 5. How to proceed (next steps, prioritized) (+3 more)

### Community 53 - "page.tsx"
Cohesion: 0.25
Nodes (7): FilterKey, FILTERS, PaymentRow, PaymentsLedger(), PaymentStatus, startOfToday(), STATUS_TONE

### Community 54 - "page.tsx"
Cohesion: 0.18
Nodes (10): dependencies, @supabase/supabase-js, exports, ./phone, ./pricing, ./slots, @supabase/supabase-js, name (+2 more)

### Community 55 - "createClient"
Cohesion: 0.21
Nodes (13): CompanionsBody(), ApprovedDashboard(), CompanionPortal(), ReapplyButton(), RegistrationForm(), LocationShare(), DeleteAccount(), CareInner() (+5 more)

### Community 56 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): After changing code, Finding code, This is NOT the Next.js you know, Where to look

### Community 57 - "useAuth"
Cohesion: 0.29
Nodes (5): btn(), ic, Login(), Step, Mascot()

### Community 65 - "Card"
Cohesion: 0.12
Nodes (9): CHECKLIST, FOUNDERS, BENEFITS, STEPS, TESTIMONIALS, Card(), CardProps, CardVariant (+1 more)

### Community 66 - "package.json"
Cohesion: 0.40
Nodes (4): exports, name, private, version

### Community 69 - "page.tsx"
Cohesion: 0.20
Nodes (8): ApprovedCompanion, BookingRecord, COLUMNS, initials(), OpsBoard(), OpsMetrics, STATUS_OPTIONS, TRANSPORT_LABEL

### Community 72 - "page.tsx"
Cohesion: 0.08
Nodes (29): GuidesPage(), metadata, ACTIVE_STATUS_LABEL, ActiveBookingInfo, BOOKING_HEADERS, fmtWhen(), GestureKey, GESTURES (+21 more)

### Community 75 - "layout.tsx"
Cohesion: 0.06
Nodes (37): metadata, poppins, viewport, metadata, poppins, viewport, PortalHeader(), epilogue (+29 more)

### Community 79 - "page.tsx"
Cohesion: 0.13
Nodes (11): directionsUrl(), DOC_TYPES, fmtWhen(), JobCard(), JobRow, LANGUAGE_OPTIONS, RIDE_PAYERS, RIDE_PROVIDERS (+3 more)

### Community 80 - "README.md"
Cohesion: 0.20
Nodes (8): ADR-0003: Scheduling and push dispatch run in Postgres (pg_cron + pg_net), Alternatives rejected, Consequences, Context, Decision, Deploy, Symptom index, Troubleshooting & deployment playbook

### Community 81 - "Caresy Live Tracking — Handoff, Next Steps & Vision"
Cohesion: 0.22
Nodes (9): Architecture at a glance, Caresy Live Tracking — Handoff, Next Steps & Vision, Key files, Next steps (prioritized), Test the loop end to end, The idea in one paragraph, Turn-it-on checklist (manual, one-time), Vision (+1 more)

### Community 82 - "Phases"
Cohesion: 0.12
Nodes (17): 1. `@caresy/auth` cannot be shared with React Native, 2. `@caresy/utils` is not platform-independent today, 3. `packages/validation` does not exist and should not yet, Constraints and gotchas, Deployment, Mobile plan — Expo native app, Next action, Phase 0 — Unblock sharing (no mobile code yet) ✅ done 2026-08-07 (+9 more)

### Community 83 - "AuthContext.tsx"
Cohesion: 0.13
Nodes (15): dependencies, @caresy/auth, @caresy/ui, lucide-react, next, react, @supabase/ssr, @supabase/supabase-js (+7 more)

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
Cohesion: 0.17
Nodes (16): asciiOnly(), GET(), pageOps(), QueuedRow, accessToken(), b64url(), importPrivateKey(), projectId() (+8 more)

### Community 90 - "InstallPrompt.tsx"
Cohesion: 0.16
Nodes (11): BIPEvent, ic, InstallPrompt(), isStandalone(), BrowserBarArt(), ConfirmCardArt(), Item, LeafSprig() (+3 more)

### Community 91 - "page.tsx"
Cohesion: 0.14
Nodes (11): CareEvent, DOC_TYPES, Documents(), fmt(), KIND_STYLE, Member, Passport(), PASSPORT_FIELDS (+3 more)

### Community 92 - "layout.tsx"
Cohesion: 0.25
Nodes (8): Architecture rules, Caresy — coding standards, Naming, Post-change workflow (run before saying "done"), Prompt budget, Stack (do not substitute), Testing, TypeScript

### Community 93 - "TRIPS_AND_LIVE_TRACKING.md"
Cohesion: 0.40
Nodes (4): Deploy, Local dev, Secrets, Supabase Edge Functions

### Community 94 - "index.ts"
Cohesion: 0.24
Nodes (7): corsHeaders(), isAllowed(), STATIC_ALLOWED, EtaRequest, EtaResponse, LatLng, NOTE: OpenRouteService gives free-flow durations (no live traffic), which is

### Community 95 - "page.tsx"
Cohesion: 0.13
Nodes (15): 10. Conventions, 11. Traps that catch newcomers, 12. Known gaps, 13. Reading order, 1. The product, 2. Stack, 3. Layout, 4. The one idea you must absorb (+7 more)

### Community 96 - "PROJECT_MEMORY.md — durable "what & why""
Cohesion: 0.14
Nodes (12): In progress (uncommitted WIP on feature/structured-data), NEXT_SESSION.md — "where we are & what's next", Next tasks (do these), On restart / low-context ritual, Open decisions / unknowns, Gotchas, Key identifiers, Load-bearing rules (+4 more)

### Community 97 - "Pods-App-frameworks.sh"
Cohesion: 0.43
Nodes (6): code_sign_if_enabled(), install_bcsymbolmap(), install_dsym(), install_framework(), Pods-App-frameworks.sh script, strip_invalid_archs()

### Community 98 - "page.tsx"
Cohesion: 0.43
Nodes (5): headline(), osmEmbed(), stepsFor(), TrackedBooking, TrackingInner()

### Community 99 - "Trips & Real-Time Companion Location Tracking"
Cohesion: 0.29
Nodes (7): Client integration (see blueprint (c)), ETA (Edge Function `trip-eta`), Required dashboard step (cannot be done in SQL), Transport model (why two channels), Trip creation & lifecycle (migration 18), Trips & Real-Time Companion Location Tracking, What the migration creates

### Community 100 - "Auth & Domain Configuration"
Cohesion: 0.33
Nodes (5): Auth & Domain Configuration, Google Cloud console (OAuth client), How the flow works (already built), Supabase dashboard config, Verify

### Community 101 - "ExampleInstrumentedTest.java"
Cohesion: 0.60
Nodes (3): ExampleInstrumentedTest, Test, RunWith

### Community 103 - "MainActivity"
Cohesion: 0.50
Nodes (3): MainActivity, BridgeActivity, Override

### Community 105 - "Architecture"
Cohesion: 0.25
Nodes (7): Architecture, Environments, Module ownership, Request flow (booking → money), Server-side surface, Shape, Smoke tests after any change

### Community 107 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 141 - "Caresy Monorepo Deployment"
Cohesion: 0.29
Nodes (7): 1. Update the existing Vercel project (website), 2. Create the two new Vercel projects, 3. Supabase Auth redirect URLs, 4. DNS (at your registrar for caresy.co.in), 5. Order of operations (zero downtime), Caresy Monorepo Deployment, Notes

### Community 142 - "page.tsx"
Cohesion: 0.24
Nodes (14): QuickHelp(), CHIPS, FaqCategory, FAQS, Support(), supWa(), AuthModal(), digits() (+6 more)

### Community 143 - "hospitals.ts"
Cohesion: 0.18
Nodes (10): HospitalAutocomplete(), Coords, AREA_PINCODE, areas, pct, served, sql, Hospital (+2 more)

### Community 144 - "ADR-NNNN: <short decision, present tense>"
Cohesion: 0.33
Nodes (5): ADR-NNNN: <short decision, present tense>, Alternatives rejected, Consequences, Context, Decision

### Community 145 - "ADR-0002: npm workspaces monorepo, three Next apps, no build orchestrator"
Cohesion: 0.40
Nodes (5): ADR-0002: npm workspaces monorepo, three Next apps, no build orchestrator, Alternatives rejected, Consequences, Context, Decision

### Community 146 - "ADR-0006: Transport is facilitated and recorded, never billed"
Cohesion: 0.40
Nodes (5): ADR-0006: Transport is facilitated and recorded, never billed, Alternatives rejected, Consequences, Context, Decision

### Community 147 - "Current state"
Cohesion: 0.29
Nodes (7): Before the first customer — in order, Current state, In flight, Known broken / blocked, Live in production (2026-08-02), Next up (rough order), Stale docs

### Community 148 - "Security"
Cohesion: 0.33
Nodes (6): If a key leaks, Known enforcement points, Open gaps (do not assume these are handled), Rules, Security, Storage buckets

### Community 149 - "ADR-0001: Supabase (Postgres + RLS) is the backend; no custom API tier"
Cohesion: 0.33
Nodes (5): ADR-0001: Supabase (Postgres + RLS) is the backend; no custom API tier, Alternatives rejected, Consequences, Context, Decision

### Community 150 - "ADR-0003: Scheduling and push dispatch run in Postgres (pg_cron + pg_net)"
Cohesion: 0.22
Nodes (7): BadgeProps, BadgeSize, BadgeTone, SIZES, TONES, CompanionCard(), CompanionCardProps

### Community 151 - "ADR-0004: The Android app is a Capacitor shell pointing at the live site"
Cohesion: 0.40
Nodes (5): ADR-0004: The Android app is a Capacitor shell pointing at the live site, Alternatives rejected, Consequences, Context, Decision

### Community 152 - "ADR-0005: Cash/UPI collected at completion; no payment gateway"
Cohesion: 0.33
Nodes (5): ADR-0005: Cash/UPI collected at completion; no payment gateway, Alternatives rejected, Consequences, Context, Decision

### Community 153 - "ADR-0007: Guest tracking uses a separate `share_token`, not `reference_code`"
Cohesion: 0.40
Nodes (5): ADR-0007: Guest tracking uses a separate `share_token`, not `reference_code`, Alternatives rejected, Consequences, Context, Decision

### Community 154 - "ADR-0008: `assert`-based self-checks instead of a test framework"
Cohesion: 0.40
Nodes (5): ADR-0008: `assert`-based self-checks instead of a test framework, Alternatives rejected, Consequences, Context, Decision

### Community 155 - "Caresy"
Cohesion: 0.40
Nodes (5): Caresy, Deploy, Develop, Docs, Live tracking

### Community 157 - "page.tsx"
Cohesion: 0.21
Nodes (11): DrivingPanel(), ACTIVE_STATUSES, fmtEta(), LiveBoard(), osmEmbed(), STATUS_LABEL, TripCard(), TripRow (+3 more)

### Community 158 - "page.tsx"
Cohesion: 0.17
Nodes (10): ADR-0010 — Lottie for the login mascot animation, Alternatives rejected, Consequences, Context, Decision, ADR-0011 — Mascot as a design-system primitive, requested by pose, Alternatives rejected, Consequences (+2 more)

### Community 159 - "IconButton.tsx"
Cohesion: 0.13
Nodes (14): APP_TABS, ButtonProps, ButtonShape, ButtonSize, ButtonVariant, SIZES, VARIANTS, canHover() (+6 more)

### Community 160 - "LocationBadge.tsx"
Cohesion: 0.33
Nodes (9): BadgeState, LocationBadge(), QUICK_PICKS, readStored(), reverseGeocode(), StoredLocation, writeStored(), checkPincodeServed() (+1 more)

### Community 162 - "slots.check.ts"
Cohesion: 0.38
Nodes (4): availableSlots(), ordered, previous, TIME_SLOTS

### Community 163 - "Header.tsx"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 164 - "companions.ts"
Cohesion: 0.27
Nodes (7): Trust(), VERIFICATION_STEPS, Companion, COMPANIONS, findCompanionByName(), matchCompanionByDepartment(), useLiveMetrics()

### Community 167 - "ADR-0009 — Native mobile with Expo, not a WebView shell"
Cohesion: 0.40
Nodes (5): ADR-0009 — Native mobile with Expo, not a WebView shell, Alternatives rejected, Consequences, Context, Decision

## Knowledge Gaps
- **752 isolated node(s):** `SECURITY_HEADERS`, `nextConfig`, `name`, `version`, `private` (+747 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **62 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `createClient` to `Card`, `LocationBadge.tsx`, `page.tsx`, `companions.ts`, `page.tsx`, `LocationBadge.tsx`, `page.tsx`, `layout.tsx`, `page.tsx`, `Card`, `Badge.tsx`, `page.tsx`, `hospitals.ts`, `layout.tsx`, `page.tsx`, `postcss.config.mjs`, `page.tsx`, `page.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `cookieOptionsFor()` connect `layout.tsx` to `createClient`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `AuthProvider()` connect `layout.tsx` to `fcm.ts`, `createClient`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `SECURITY_HEADERS`, `nextConfig`, `name` to the rest of the system?**
  _752 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Card` be split into smaller, more focused modules?**
  _Cohesion score 0.12615384615384614 - nodes in this community are weakly interconnected._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `script.js` be split into smaller, more focused modules?**
  _Cohesion score 0.052244897959183675 - nodes in this community are weakly interconnected._