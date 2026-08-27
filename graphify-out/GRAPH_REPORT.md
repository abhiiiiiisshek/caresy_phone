# Graph Report - caresy_phone  (2026-08-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1626 nodes · 2407 edges · 182 communities (105 shown, 77 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 118,011 input · 2,873 output

## Graph Freshness
- Built from commit: `da999407`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin Overview & Settings
- Shared Dev Dependencies
- Booking Lifecycle SQL
- Admin App Dependencies
- Bookings Table Schema
- Monorepo Root Config
- Companion App Dependencies
- Expo App Config
- Booking Page Components
- Admin TS Config
- Admin & Companions Schema
- PWA Install Prompt
- Companion TS Config
- Home Screen Design Spec
- Database Schema Docs
- Mobile Crypto Storage Deps
- Mobile Plan Constraints
- Website TS Config
- UI Button & Input Kit
- ADR Index
- Next.js Version Warning
- Active Booking Banner
- Auth Package Exports
- Mobile App Package Config
- Booking Billing Panel
- UI State Components
- Graphify Workflow Rules
- Accessibility Checklist
- App Header Component Spec
- Bottom Nav Bar Spec
- Hero Intent Selector
- Micro-Animations Spec
- Responsive Design Spec
- Spacing & Typography Spec
- Home Screen Wireframe
- Audit Logs Table
- Booking Type Enum
- Entity Relationship Diagram
- Query Indexes
- Booking Audit Trigger
- Timestamp Trigger
- Project README
- Admin Analytics Page
- Junior Onboarding Doc
- Legal & Meeting Point Pages
- Trips & Live Tracking Docs
- Auth Callback Routes
- Admin Notifications Page
- Admin Companions Review
- Database Overview Docs
- ESLint Config
- UI Package Config
- Native App Checklist
- Admin Payments Ledger
- Utils Package Exports
- Website Dev Dependencies
- Trips Migration Schema
- Login Page & Motion Spot
- CLAUDE.md Instructions
- Companions Carousel
- Design Theme Philosophy
- Services Section
- Trust & Safety Badges
- Booking Status Enum
- Service Type Enum
- Marketing Content Pages
- ADR Drop Mascot
- Android Update Checker
- Android Instrumented Tests
- Admin Ops Board
- Admin Next Config
- Admin PostCSS Config
- Website Home Page
- Companion Next Config
- Companion PostCSS Config
- App Root Layouts
- Website Next Config
- Website PostCSS Config
- Expire Bookings Route
- Companion Portal Dashboard
- Mobile Secure Storage
- Metro Bundler Config
- Mobile TS Config
- Website Dependencies
- Mobile Package Dependencies
- ADR Mascot Design System
- iOS App Delegate
- Reveal Animation Component
- Phone Signin & Profiles
- Push Notification Sender
- Deployment Guide
- Care & Documents Page
- Contact & Metrics Schema
- ADR Template
- Trip ETA Edge Function
- Onboarding Reading Guide
- Auth Domain Setup Docs
- Security Rules Docs
- Live Tracking Page
- ADR NPM Workspaces
- Expo Mobile Agent Docs
- ADR Postgres Scheduling
- Types Package Dependency
- Android Main Activity
- Utils Package Dependency
- ADR Capacitor Shell
- Expo Core Dependency
- Expo Auth Session
- Expo Constants
- Expo Crypto
- Expo Haptics
- Expo Linking
- Expo Router
- About Page Layout
- For Hospitals Layout
- How It Works Layout
- Privacy Page Layout
- Services Page Layout
- Support Page Layout
- Terms Page Layout
- Testimonials Page Layout
- Trust Page Layout
- Capacitor Config
- Expo Splash Screen
- Expo Web Browser
- React Dependency
- React Native Dependency
- Async Storage Dependency
- React Native Screens
- Supabase JS Client
- Phosphor Icons
- React Dependency
- Supabase SSR Client
- Supabase JS Client
- ADR Guest Tracking Token
- ADR Assert Self-Checks
- ADR Expo Native Mobile
- Types Package Config
- Support & Auth Modal
- Hospital Autocomplete
- Gradle Wrapper Script
- Service Area Enforcement SQL
- Backend & Transport ADRs
- Booking Trip Link SQL
- Booking Reference Code SQL
- Deploy & Troubleshooting Docs
- Trust & Badge Components
- Trip ETA Migration
- ADR Gatewayless Payments
- Push Tokens Migration
- Lottie Animation Player
- Agent Coding Standards Docs
- Admin Live Trips Board
- ADR Lottie Mascot
- Card & IconButton Components
- Location Badge & Service Area
- Booking Flow UI
- Website Package Config
- Profile & Account Settings
- Phone Verification Route
- Utils Package Dependency
- React DOM Dependency
- Locations Table
- Patients Table

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 56 edges
2. `useAuth()` - 38 edges
3. `Button()` - 20 edges
4. `Reveal()` - 20 edges
5. `formatINR()` - 18 edges
6. `Booking()` - 17 edges
7. `isValidIndianMobile()` - 16 edges
8. `Input()` - 16 edges
9. `compilerOptions` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `OverviewBody()` --calls--> `createClient()`  [EXTRACTED]
  apps/admin/src/app/page.tsx → packages/auth/src/supabase/client.ts
- `UsersList()` --calls--> `createClient()`  [EXTRACTED]
  apps/admin/src/app/users/page.tsx → packages/auth/src/supabase/client.ts
- `AdminTopbar()` --calls--> `useAuth()`  [EXTRACTED]
  apps/admin/src/components/AdminShell.tsx → packages/auth/src/AuthContext.tsx
- `Passport()` --calls--> `createClient()`  [EXTRACTED]
  apps/website/src/app/care/page.tsx → packages/auth/src/supabase/client.ts
- `CompanionRow` --references--> `ApprovalStatus`  [EXTRACTED]
  apps/admin/src/app/companions/page.tsx → packages/types/src/index.ts

## Import Cycles
- None detected.

## Communities (182 total, 77 thin omitted)

### Community 0 - "Admin Overview & Settings"
Cohesion: 0.13
Nodes (16): ACTIVE_TRIP, CARDS, Counts, OverviewBody(), AreaRow, AreasBody(), SettingRow, SettingsBody() (+8 more)

### Community 1 - "Shared Dev Dependencies"
Cohesion: 0.12
Nodes (17): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+9 more)

### Community 2 - "Booking Lifecycle SQL"
Cohesion: 0.05
Nodes (36): base, enqueue_care_event_notification, guard_booking_payment_columns, guard_customer_booking_columns, slab, app_settings, enqueue_booking_notification(), get_setting_int() (+28 more)

### Community 3 - "Admin App Dependencies"
Cohesion: 0.05
Nodes (42): dependencies, @caresy/auth, @caresy/types, @caresy/ui, @caresy/utils, lucide-react, next, react (+34 more)

### Community 5 - "Monorepo Root Config"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, version, workspaces, apps/* (+1 more)

### Community 6 - "Companion App Dependencies"
Cohesion: 0.05
Nodes (42): dependencies, @caresy/auth, @caresy/types, @caresy/ui, @caresy/utils, lucide-react, next, react (+34 more)

### Community 7 - "Expo App Config"
Cohesion: 0.08
Nodes (24): backgroundColor, foregroundImage, adaptiveIcon, googleServicesFile, package, predictiveBackGestureEnabled, usesNonExemptEncryption, typedRoutes (+16 more)

### Community 8 - "Booking Page Components"
Cohesion: 0.14
Nodes (12): Booking(), CARE_NEEDS, fmtSlot(), label, LANGUAGES, SavedPatient, SERVICES, TRANSPORT_MODES (+4 more)

### Community 9 - "Admin TS Config"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 10 - "Admin & Companions Schema"
Cohesion: 0.07
Nodes (23): enqueue_new_booking_notification, guard_companion_privileged_fields, guard_drive_assignment, admin_users, companion_documents, companions, is_admin(), lc_admin_email() (+15 more)

### Community 11 - "PWA Install Prompt"
Cohesion: 0.16
Nodes (11): BIPEvent, ic, InstallPrompt(), isStandalone(), BrowserBarArt(), ConfirmCardArt(), Item, LeafSprig() (+3 more)

### Community 12 - "Companion TS Config"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 13 - "Home Screen Design Spec"
Cohesion: 0.11
Nodes (18): 1. Design Philosophy & Theme, 2. Wireframe & Visual Layout, 3. Component Hierarchy & Specifications, 4. Spacing & Typography (Material 3 Scale), 5. Micro-Animations & Interactions, 6. Accessibility & WCAG AA Checklist, 7. Responsive Design (Desktop Adaptation), A. Sticky App Bar (Header) (+10 more)

### Community 14 - "Database Schema Docs"
Cohesion: 0.12
Nodes (15): 1. Enums & Custom Types, 2. Core Tables, 3. Indexes, 4. Database Triggers & Functions, 5. Entity Relationship Diagram (ERD), 6. Migration Notes & Deployment Strategy, 7. TODOs (Pending Product Clarifications), A. Auto-Update Timestamp (+7 more)

### Community 15 - "Mobile Crypto Storage Deps"
Cohesion: 0.15
Nodes (13): aes-js, dependencies, aes-js, expo-secure-store, expo-status-bar, react-native-get-random-values, react-native-safe-area-context, react-native-url-polyfill (+5 more)

### Community 16 - "Mobile Plan Constraints"
Cohesion: 0.12
Nodes (17): 1. `@caresy/auth` cannot be shared with React Native, 2. `@caresy/utils` is not platform-independent today, 3. `packages/validation` does not exist and should not yet, Constraints and gotchas, Deployment, Mobile plan — Expo native app, Next action, Phase 0 — Unblock sharing (no mobile code yet) ✅ done 2026-08-07 (+9 more)

### Community 17 - "Website TS Config"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+21 more)

### Community 18 - "UI Button & Input Kit"
Cohesion: 0.20
Nodes (11): ButtonProps, ButtonShape, ButtonSize, ButtonVariant, SIZES, VARIANTS, InputProps, StatCard() (+3 more)

### Community 22 - "Auth Package Exports"
Cohesion: 0.08
Nodes (25): dependencies, @caresy/ui, @caresy/utils, lucide-react, @supabase/ssr, @supabase/supabase-js, exports, ./modal (+17 more)

### Community 23 - "Mobile App Package Config"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, android, ios, start, web (+1 more)

### Community 24 - "Booking Billing Panel"
Cohesion: 0.05
Nodes (55): CollectPanel(), RunningTotal(), LiveMeter(), DURATIONS, BillPanel(), BookingRecord, BookingRow(), CHANGEABLE (+47 more)

### Community 25 - "UI State Components"
Cohesion: 0.20
Nodes (12): SpotVariant, EmptyState(), EmptyStateProps, ErrorState(), ErrorStateProps, LoadingState(), LoadingStateProps, StateLayout() (+4 more)

### Community 42 - "Admin Analytics Page"
Cohesion: 0.24
Nodes (10): AnalyticsBody(), FareRow, hourLabel(), MUTED_STATUSES, rupees(), Stats, STATUS_ORDER, bookingRevenueRupees() (+2 more)

### Community 43 - "Junior Onboarding Doc"
Cohesion: 0.22
Nodes (8): 1. What is Caresy? (the big picture), 2. Why are we building this?, 3. Current goal (MVP — Noida / Greater Noida only), 4. What went wrong before (lessons), 5. Your role as intern + first tasks, 6. Glossary, 7. Rules to not break things, Junior / intern onboarding — plain English

### Community 44 - "Legal & Meeting Point Pages"
Cohesion: 0.22
Nodes (6): PRIVACY_SECTIONS, TERMS_SECTIONS, Coords, MeetingPoint(), Input(), Reveal()

### Community 45 - "Trips & Live Tracking Docs"
Cohesion: 0.15
Nodes (11): Client integration (see blueprint (c)), ETA (Edge Function `trip-eta`), Required dashboard step (cannot be done in SQL), Transport model (why two channels), Trip creation & lifecycle (migration 18), Trips & Real-Time Companion Location Tracking, What the migration creates, Deploy (+3 more)

### Community 46 - "Auth Callback Routes"
Cohesion: 0.12
Nodes (15): GET, config, proxy(), GET, config, proxy(), dynamic, GET (+7 more)

### Community 47 - "Admin Notifications Page"
Cohesion: 0.25
Nodes (7): copyFor(), FILTERS, NotifBody(), NotifRow, NotifStatus, STATUS_COPY, STATUS_TONE

### Community 48 - "Admin Companions Review"
Cohesion: 0.21
Nodes (9): CompanionRow, CompanionsBody(), DocRow, FILTERS, ReviewSheet(), STATUS_TONE, statusLabel(), CompanionRow (+1 more)

### Community 49 - "Database Overview Docs"
Cohesion: 0.29
Nodes (7): Booking status, Core tables, Database, Functions that enforce rules, Gotchas, Ledger, Rules

### Community 51 - "UI Package Config"
Cohesion: 0.14
Nodes (13): dependencies, motion, @phosphor-icons/react, exports, ./theme.css, motion, @phosphor-icons/react, react (+5 more)

### Community 52 - "Native App Checklist"
Cohesion: 0.29
Nodes (6): Caresy Native App — completion checklist, Deferred functionality (must restore before submission), Design system, Not yet verified on device, Screens, Store-submission blockers (do NOT submit until done)

### Community 53 - "Admin Payments Ledger"
Cohesion: 0.25
Nodes (7): FilterKey, FILTERS, PaymentRow, PaymentsLedger(), PaymentStatus, startOfToday(), STATUS_TONE

### Community 54 - "Utils Package Exports"
Cohesion: 0.17
Nodes (11): dependencies, @supabase/supabase-js, exports, ./bookingStatus, ./phone, ./pricing, ./slots, @supabase/supabase-js (+3 more)

### Community 55 - "Website Dev Dependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/aes-js, @types/react, typescript, @types/react, typescript, @types/aes-js

### Community 56 - "Trips Migration Schema"
Cohesion: 0.29
Nodes (6): auth, public, public.bookings, public.trip_locations, public.trips, auth.users

### Community 57 - "Login Page & Motion Spot"
Cohesion: 0.18
Nodes (8): btn(), ic, Login(), Step, Loop, LOOPS, MotionSpot(), SPOT

### Community 65 - "Marketing Content Pages"
Cohesion: 0.16
Nodes (10): CHECKLIST, FOUNDERS, BENEFITS, STEPS, PRICE_POINTS, Services, Testimonials, Card() (+2 more)

### Community 66 - "ADR Drop Mascot"
Cohesion: 0.33
Nodes (5): ADR-0012: Drop the mascot; Phosphor duotone icons + Motion One spots, Alternatives rejected, Consequences, Context, Decision

### Community 67 - "Android Update Checker"
Cohesion: 0.28
Nodes (3): android.app.Activity, UpdateChecker, UpdateChecker

### Community 68 - "Android Instrumented Tests"
Cohesion: 0.33
Nodes (5): androidx.test.ext.junit.runners.AndroidJUnit4, ExampleInstrumentedTest, ExampleUnitTest, org.junit.runner.RunWith, org.junit.Test

### Community 69 - "Admin Ops Board"
Cohesion: 0.20
Nodes (8): ApprovedCompanion, BookingRecord, COLUMNS, initials(), OpsBoard(), OpsMetrics, STATUS_OPTIONS, TRANSPORT_LABEL

### Community 72 - "Website Home Page"
Cohesion: 0.07
Nodes (34): GuidesPage(), metadata, ACTIVE_STATUS_LABEL, ActiveBookingInfo, BOOKING_HEADERS, fmtWhen(), greeting(), Header (+26 more)

### Community 75 - "App Root Layouts"
Cohesion: 0.06
Nodes (42): metadata, poppins, viewport, metadata, poppins, viewport, PortalHeader(), epilogue (+34 more)

### Community 79 - "Companion Portal Dashboard"
Cohesion: 0.12
Nodes (17): ApprovedDashboard(), CompanionPortal(), directionsUrl(), DOC_TYPES, fmtWhen(), JobCard(), JobRow, LANGUAGE_OPTIONS (+9 more)

### Community 81 - "Metro Bundler Config"
Cohesion: 0.40
Nodes (4): config, { getDefaultConfig }, path, workspaceRoot

### Community 82 - "Mobile TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, extends, expo/tsconfig.base

### Community 83 - "Website Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @caresy/auth, @caresy/types, @caresy/ui, lucide-react, motion, next, @vercel/speed-insights (+7 more)

### Community 84 - "Mobile Package Dependencies"
Cohesion: 0.06
Nodes (30): dependencies, @capacitor/android, @capacitor/app, @capacitor/core, @capacitor/haptics, @capacitor/ios, @capacitor/network, @capacitor/push-notifications (+22 more)

### Community 85 - "ADR Mascot Design System"
Cohesion: 0.40
Nodes (5): ADR-0011 — Mascot as a design-system primitive, requested by pose, Alternatives rejected, Consequences, Context, Decision

### Community 86 - "iOS App Delegate"
Cohesion: 0.13
Nodes (13): Any, AppDelegate, Bool, Capacitor, NSUserActivity, UIApplication, UIApplicationDelegate, UIKit (+5 more)

### Community 87 - "Reveal Animation Component"
Cohesion: 0.60
Nodes (4): BaseProps, EASE, RevealProps, StaggerProps

### Community 88 - "Phone Signin & Profiles"
Cohesion: 0.22
Nodes (6): find_user_by_phone(), auth.users, profiles, set_timestamp_profiles, auth.users, trigger_set_timestamp

### Community 89 - "Push Notification Sender"
Cohesion: 0.16
Nodes (17): asciiOnly(), dynamic, GET(), pageOps(), QueuedRow, accessToken(), b64url(), importPrivateKey() (+9 more)

### Community 90 - "Deployment Guide"
Cohesion: 0.25
Nodes (7): 1. Update the existing Vercel project (website), 2. Create the two new Vercel projects, 3. Supabase Auth redirect URLs, 4. DNS (at your registrar for caresy.co.in), 5. Order of operations (zero downtime), Caresy Monorepo Deployment, Notes

### Community 91 - "Care & Documents Page"
Cohesion: 0.13
Nodes (12): CareEvent, CareInner(), DOC_TYPES, Documents(), fmt(), KIND_STYLE, Member, Passport() (+4 more)

### Community 92 - "Contact & Metrics Schema"
Cohesion: 0.29
Nodes (5): contact_messages, ops_metrics, set_timestamp_ops_metrics, auth.users, trigger_set_timestamp

### Community 93 - "ADR Template"
Cohesion: 0.33
Nodes (5): ADR-NNNN: <short decision, present tense>, Alternatives rejected, Consequences, Context, Decision

### Community 94 - "Trip ETA Edge Function"
Cohesion: 0.24
Nodes (7): corsHeaders(), isAllowed(), STATIC_ALLOWED, EtaRequest, EtaResponse, LatLng, NOTE: OpenRouteService gives free-flow durations (no live traffic), which is

### Community 95 - "Onboarding Reading Guide"
Cohesion: 0.13
Nodes (15): 10. Conventions, 11. Traps that catch newcomers, 12. Known gaps, 13. Reading order, 1. The product, 2. Stack, 3. Layout, 4. The one idea you must absorb (+7 more)

### Community 96 - "Auth Domain Setup Docs"
Cohesion: 0.33
Nodes (5): Auth & Domain Configuration, Google Cloud console (OAuth client), How the flow works (already built), Supabase dashboard config, Verify

### Community 97 - "Security Rules Docs"
Cohesion: 0.33
Nodes (6): If a key leaks, Known enforcement points, Open gaps (do not assume these are handled), Rules, Security, Storage buckets

### Community 98 - "Live Tracking Page"
Cohesion: 0.43
Nodes (5): headline(), osmEmbed(), stepsFor(), TrackedBooking, TrackingInner()

### Community 99 - "ADR NPM Workspaces"
Cohesion: 0.40
Nodes (5): ADR-0002: npm workspaces monorepo, three Next apps, no build orchestrator, Alternatives rejected, Consequences, Context, Decision

### Community 101 - "ADR Postgres Scheduling"
Cohesion: 0.40
Nodes (5): ADR-0003: Scheduling and push dispatch run in Postgres (pg_cron + pg_net), Alternatives rejected, Consequences, Context, Decision

### Community 103 - "Android Main Activity"
Cohesion: 0.50
Nodes (3): MainActivity, com.getcapacitor.BridgeActivity, Override

### Community 105 - "ADR Capacitor Shell"
Cohesion: 0.40
Nodes (5): ADR-0004: The Android app is a Capacitor shell pointing at the live site, Alternatives rejected, Consequences, Context, Decision

### Community 137 - "ADR Guest Tracking Token"
Cohesion: 0.40
Nodes (5): ADR-0007: Guest tracking uses a separate `share_token`, not `reference_code`, Alternatives rejected, Consequences, Context, Decision

### Community 138 - "ADR Assert Self-Checks"
Cohesion: 0.40
Nodes (5): ADR-0008: `assert`-based self-checks instead of a test framework, Alternatives rejected, Consequences, Context, Decision

### Community 139 - "ADR Expo Native Mobile"
Cohesion: 0.40
Nodes (5): ADR-0009 — Native mobile with Expo, not a WebView shell, Alternatives rejected, Consequences, Context, Decision

### Community 141 - "Types Package Config"
Cohesion: 0.40
Nodes (4): exports, name, private, version

### Community 142 - "Support & Auth Modal"
Cohesion: 0.24
Nodes (14): QuickHelp(), CHIPS, FaqCategory, FAQS, Support(), supWa(), AuthModal(), digits() (+6 more)

### Community 143 - "Hospital Autocomplete"
Cohesion: 0.26
Nodes (9): HospitalAutocomplete(), AREA_PINCODE, areas, pct, served, sql, Hospital, HOSPITALS (+1 more)

### Community 144 - "Gradle Wrapper Script"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 146 - "Backend & Transport ADRs"
Cohesion: 0.15
Nodes (10): ADR-0001: Supabase (Postgres + RLS) is the backend; no custom API tier, Alternatives rejected, Consequences, Context, Decision, ADR-0006: Transport is facilitated and recorded, never billed, Alternatives rejected, Consequences (+2 more)

### Community 149 - "Deploy & Troubleshooting Docs"
Cohesion: 0.67
Nodes (3): Deploy, Symptom index, Troubleshooting & deployment playbook

### Community 150 - "Trust & Badge Components"
Cohesion: 0.17
Nodes (11): Trust(), VERIFICATION_STEPS, useLiveMetrics(), Badge(), BadgeProps, BadgeSize, BadgeTone, SIZES (+3 more)

### Community 152 - "ADR Gatewayless Payments"
Cohesion: 0.33
Nodes (5): ADR-0005: Cash/UPI collected at completion; no payment gateway, Alternatives rejected, Consequences, Context, Decision

### Community 155 - "Agent Coding Standards Docs"
Cohesion: 0.05
Nodes (38): After changing code, Finding code, This is NOT the Next.js you know, Where to look, Architecture rules, Caresy — coding standards, Naming, Post-change workflow (run before saying "done") (+30 more)

### Community 157 - "Admin Live Trips Board"
Cohesion: 0.23
Nodes (10): DrivingPanel(), ACTIVE_STATUSES, fmtEta(), LiveBoard(), osmEmbed(), STATUS_LABEL, TripCard(), TripRow (+2 more)

### Community 158 - "ADR Lottie Mascot"
Cohesion: 0.40
Nodes (5): ADR-0010 — Lottie for the login mascot animation, Alternatives rejected, Consequences, Context, Decision

### Community 159 - "Card & IconButton Components"
Cohesion: 0.20
Nodes (10): canHover(), CardProps, CardVariant, VARIANTS, IconButton(), IconButtonProps, IconButtonVariant, VARIANTS (+2 more)

### Community 160 - "Location Badge & Service Area"
Cohesion: 0.21
Nodes (13): BadgeState, LocationBadge(), QUICK_PICKS, readStored(), reverseGeocode(), StoredLocation, writeStored(), ADR-0009 (+5 more)

### Community 162 - "Booking Flow UI"
Cohesion: 0.06
Nodes (73): Booking(), CARE_NEEDS, durationLabel(), DURATIONS, fmtSlot(), LANGUAGES, nextDays(), s (+65 more)

### Community 163 - "Website Package Config"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 165 - "Profile & Account Settings"
Cohesion: 0.29
Nodes (5): DeleteAccount(), Profile(), supWa(), useAuth(), Button()

### Community 166 - "Phone Verification Route"
Cohesion: 0.53
Nodes (3): dynamic, POST(), phoneFromVerifyResult()

## Knowledge Gaps
- **690 isolated node(s):** `Counts`, `AreaRow`, `SettingRow`, `UserRow`, `BIPEvent` (+685 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **77 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Companion Portal Dashboard` to `Admin Overview & Settings`, `Location Badge & Service Area`, `Live Tracking Page`, `Admin Ops Board`, `Booking Page Components`, `Website Home Page`, `Admin Analytics Page`, `App Root Layouts`, `Legal & Meeting Point Pages`, `Support & Auth Modal`, `Admin Notifications Page`, `Admin Companions Review`, `Auth Callback Routes`, `Admin Payments Ledger`, `Trust & Badge Components`, `Booking Billing Panel`, `Care & Documents Page`, `Admin Live Trips Board`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `expo` connect `Expo App Config` to `Booking Flow UI`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `Counts`, `AreaRow`, `SettingRow` to the rest of the system?**
  _690 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Overview & Settings` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `Shared Dev Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Booking Lifecycle SQL` be split into smaller, more focused modules?**
  _Cohesion score 0.05442176870748299 - nodes in this community are weakly interconnected._
- **Should `Admin App Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._