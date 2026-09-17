# Graph Report - caresy  (2026-09-17)

## Corpus Check
- 364 files · ~588,175 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2782 nodes · 3936 edges · 306 communities (191 shown, 115 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2bc0bca1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- payments/page.tsx
- devDependencies
- script.js
- dependencies
- booking.html - Book Assistance (planned visit) page
- package.json
- dependencies
- server.js
- expo
- compilerOptions
- vanilla-backup/package.json
- patch-about-faq.js
- compilerOptions
- patch-index.js
- patch-quickhelp.js
- patch-services.js
- patch-trust.js
- compilerOptions
- update-html.js
- contact.html - Contact Us page
- Warning: Non-standard Next.js version with breaking changes
- Dynamic Active Booking Banner (renders when bookings.status is ASSIGNED/IN_PROGRESS)
- auth/package.json
- expo
- my-bookings/page.tsx
- ui/src/index.ts
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
- cookieOptionsFor
- 10_ADMIN_AND_COMPANIONS.sql
- [id].tsx
- Database
- eslint.config.mjs
- ui/package.json
- Caresy Live Tracking — Developer Onboarding
- admin_save_booking_edit.check.ts
- exports
- createClient
- AGENTS.md
- Caresy Mobile — Device QA Flow (tunnel)
- CLAUDE.md project instructions (imports AGENTS.md)
- Verified Companions Carousel (name, rating, languages, badge)
- Design Philosophy & Theme (Deep Ink Teal, Marigold, Vermilion, Sage)
- Services Section (Hospital Companion, Medicine Pickup, Diagnostic Test, Safe Return)
- Trust & Safety Badges (Police Verified, Partner Hospitals, 24/7 Ops)
- booking_status_enum (DRAFT, PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- service_type_enum (HOSPITAL_COMPANION, MEDICINE_PICKUP, DIAGNOSTIC_TEST, ...)
- trust/page.tsx
- types/package.json
- mobile-app/app/index.tsx
- quick-help.tsx
- admin/next.config.ts
- admin/postcss.config.mjs
- website/src/app/page.tsx
- companion/next.config.ts
- companion/postcss.config.mjs
- ADR-0005: Cash/UPI collected at completion; no payment gateway
- website/next.config.ts
- website/postcss.config.mjs
- expire-bookings/route.ts
- analytics/page.tsx
- ADR-0003: Scheduling and push dispatch run in Postgres (pg_cron + pg_net)
- Caresy Live Tracking — Handoff, Next Steps & Vision
- Phases
- dependencies
- dependencies
- Session log — read this first, newest entry on top
- AppDelegate
- scripts
- mobile-app/components/ui.tsx
- send-push/route.ts
- InstallPrompt.tsx
- care/page.tsx
- Caresy — coding standards
- Supabase Edge Functions
- trip-eta/index.ts
- Caresy — engineer onboarding
- NEXT_SESSION.md — SINGLE SOURCE OF TRUTH FOR PROGRESS
- .application
- tracking.tsx
- Trips & Real-Time Companion Location Tracking
- Auth & Domain Configuration
- ExampleInstrumentedTest.java
- android.app.Activity
- MainActivity
- Audit Fixes — 2026-08-16
- Architecture
- AnimatedHeadline.tsx
- gradlew
- EAS + SIWA READINESS — CARESY-6
- booking.tsx
- AuthContext.tsx
- booking/page.tsx
- Next Steps for the Next Agent
- about/layout.tsx
- for-hospitals/layout.tsx
- how-it-works/layout.tsx
- privacy/layout.tsx
- services/layout.tsx
- support/layout.tsx
- terms/layout.tsx
- testimonials/layout.tsx
- trust/layout.tsx
- capacitor.config.ts
- TELEGRAM NOTIFICATIONS REPORT — CARESY-3
- bookings
- EXACTLY ONCE REPORT — CARESY-4 (claim-before-send)
- SCHEDULER REPORT — CARESY-5 (hands-off drain)
- SUPABASE_SCHEMA.sql
- my-bookings.tsx
- Booking lifecycle fixes — implementation brief
- mobile-app/tsconfig.json
- public.trips
- Caresy Monorepo Deployment
- lib/msg91.ts
- 50_NOTIFICATION_ATTENTION.sql
- ADR-NNNN: <short decision, present tense>
- ADR-0002: npm workspaces monorepo, three Next apps, no build orchestrator
- 26_BILLING.sql
- Current state
- Security
- ADR/README.md
- smoke.mjs
- ADR-0004: The Android app is a Capacitor shell pointing at the live site
- Order of operations
- ADR-0007: Guest tracking uses a separate `share_token`, not `reference_code`
- Google Play release — closed testing runbook
- Caresy
- Today's Changes (for Claude to verify)
- peerDependencies
- ADR-0010 — Lottie for the login mascot animation
- quick-help/page.tsx
- dependencies
- 45_ADMIN_SMART_NOTIFY.sql
- Caresy Native App — completion checklist
- website/package.json
- companions/page.tsx
- ios
- useAuth
- ADR-0009 — Native mobile with Expo, not a WebView shell
- admin-app/tsconfig.json
- patients
- PUSH PIPELINE REPORT — CARESY-1 (Phase-4 blocker)
- @lottiefiles/dotlottie-react
- react-dom
- find_user_by_phone
- mobile-app/package.json
- login/page.tsx
- ErrorBoundary
- Companion Portal — Full Lifecycle Audit (CARESY-7)
- Caresy — Easy Words Recap (what's done, what's next)
- 28_CONTACT_AND_METRICS.sql
- android
- ADR-0012: Drop the mascot; Phosphor duotone icons + Motion One spots
- ADR-0013: OTA updates via expo-updates, gated by fingerprint
- 38_BOOKING_STATE_MACHINE.sql
- Handoff — 2026-08-16 (updated 13:40 -> approved)
- infoPlist
- src/client.ts
- metro.config.js
- ADR-0011 — Mascot as a design-system primitive, requested by pose
- fix-next-global-error.js
- public.claim_notifications
- public.enqueue_trip_status_notification
- prompt.md
- 11_SERVICE_AREAS.sql
- 18_BOOKING_TRIP_LINK.sql
- public.stamp_companion_on_booking
- BOOKING_REFERENCE_CODE.sql
- tsconfig.json
- global-error.tsx
- isValidIndianMobile
- public.get_trip_destination
- public.push_tokens
- public.reassign_booking
- dependencies
- mobile-app/AGENTS.md
- public.notifications
- permissions
- expo-apple-authentication
- ops/page.tsx
- expo-constants
- website/src/app/layout.tsx
- slots.ts
- admin-app/package.json
- expo-haptics
- 34_SECURITY_HARDENING.sql
- expo-linear-gradient
- expo-linking
- seed-app-review-demo.ts
- expo-notifications
- blockedPermissions
- expo-splash-screen
- expo-status-bar
- companion/src/app/layout.tsx
- expo-updates
- Booking
- 27_TRANSPORT.sql
- react-dom
- react-native
- react-native-get-random-values
- react-native-safe-area-context
- make-icons.py
- react-native-url-polyfill
- 30_LAUNCH_FIXES.sql
- retry.check.ts
- start-expo.sh
- devDependencies
- @phosphor-icons/react
- react
- @supabase/ssr
- @supabase/supabase-js
- Caresy Admin
- extra
- public.claim_notifications
- maps.web.ts
- public.admin_save_booking_edit
- Caresy Admin (`in.co.caresy.admin`) — a second listing, a second set of notes
- @react-native-async-storage/async-storage
- @react-native-community/datetimepicker
- react-native-maps
- Header.tsx
- public.notifications
- public.notifications
- ADR-0006: Transport is facilitated and recorded, never billed
- ADR-0014: A separate admin iOS app, not admin screens inside the customer app
- public.admin_push_user_ids
- admin-app/metro.config.js
- admin/src/app/layout.tsx
- Troubleshooting & deployment playbook
- admin-app/AGENTS.md
- expo-env.d.ts
- @caresy/native
- public.get_trip_eta_target
- 49_NOTIFICATION_DIGEST.sql
- aes-js
- @caresy/utils
- expo
- expo-constants
- expo-crypto
- expo-device
- expo-haptics
- expo-notifications
- expo-secure-store
- expo-splash-screen
- expo-status-bar
- expo-updates
- react-dom
- @react-native-async-storage/async-storage
- react-native-get-random-values
- react-native-safe-area-context
- react-native-screens
- react-native-web
- @supabase/supabase-js
- @caresy/native
- expo
- expo-auth-session
- expo-crypto
- expo-image-picker
- expo-secure-store
- expo-symbols
- @caresy/utils
- expo-router
- @caresy/types

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 60 edges
2. `useAuth()` - 38 edges
3. `Button()` - 22 edges
4. `Session log — read this first, newest entry on top` - 22 edges
5. `isValidIndianMobile()` - 21 edges
6. `formatINR()` - 20 edges
7. `Reveal()` - 19 edges
8. `toE164()` - 18 edges
9. `expo` - 17 edges
10. `color` - 17 edges

## Surprising Connections (you probably didn't know these)
- `OverviewBody()` --calls--> `createClient()`  [EXTRACTED]
  apps/admin/src/app/page.tsx → packages/auth/src/supabase/client.ts
- `UsersList()` --calls--> `createClient()`  [EXTRACTED]
  apps/admin/src/app/users/page.tsx → packages/auth/src/supabase/client.ts
- `Passport()` --calls--> `createClient()`  [EXTRACTED]
  apps/website/src/app/care/page.tsx → packages/auth/src/supabase/client.ts
- `RootLayout()` --references--> `notifications`  [EXTRACTED]
  apps/admin-app/app/_layout.tsx → supabase/migrations/13_LIFECYCLE.sql
- `BookingDetail()` --calls--> `formatINR()`  [EXTRACTED]
  apps/admin-app/app/booking/[id].tsx → packages/utils/src/pricing.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pages sharing identical footer nav template (about/services/trust/faq/quick-help/booking/my-bookings/privacy/terms links)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_my_bookings_page, vanilla_backup_privacy_page, vanilla_backup_quick_help_page, vanilla_backup_terms_page, vanilla_backup_trust_page [EXTRACTED 1.00]
- **Pages sharing identical floating WhatsApp widget (+919717500225, same inline SVG)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_quick_help_page, vanilla_backup_trust_page [EXTRACTED 1.00]

## Communities (306 total, 115 thin omitted)

### Community 0 - "payments/page.tsx"
Cohesion: 0.08
Nodes (30): copyFor(), FILTERS, NotifBody(), NotifRow, NotifStatus, STATUS_COPY, STATUS_TONE, ACTIVE_TRIP (+22 more)

### Community 1 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+9 more)

### Community 2 - "script.js"
Cohesion: 0.05
Nodes (46): API_BASE, bookingForm, bookingId, bookingStatus, CARESY_STATS, checkAndVerifyOTP(), companionDatabase, dateInput (+38 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, @caresy/auth, @caresy/types, @caresy/ui, @caresy/utils, lucide-react, next, react (+34 more)

### Community 4 - "booking.html - Book Assistance (planned visit) page"
Cohesion: 0.07
Nodes (31): bookings table (central transaction table), locations table (hospitals, labs, home addresses), patients table (patient separate from paying customer), about.html - About Us page, checkAuth() function, companions[] hardcoded roster (Priya Sharma, Anil Kumar, Sarah Mathews), loadAllBookings() function (fetch /api/admin/bookings), admin-ops.html - Live Operations Desk (dispatcher board) (+23 more)

### Community 5 - "package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, postinstall, smoke, version (+3 more)

### Community 6 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, @caresy/auth, @caresy/types, @caresy/ui, @caresy/utils, lucide-react, next, react (+34 more)

### Community 7 - "server.js"
Cohesion: 0.12
Nodes (13): activeOtps, adminSessions, app, cors, DB_DIR, DB_FILE, express, fs (+5 more)

### Community 8 - "expo"
Cohesion: 0.04
Nodes (46): blockedPermissions, package, permissions, usesNonExemptEncryption, projectId, typedRoutes, expo, android (+38 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 10 - "vanilla-backup/package.json"
Cohesion: 0.15
Nodes (12): cors, express, dependencies, cors, express, description, main, name (+4 more)

### Community 11 - "patch-about-faq.js"
Cohesion: 0.29
Nodes (6): aboutContent, aboutFile, faqContent, faqFile, fs, path

### Community 12 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

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

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+21 more)

### Community 18 - "update-html.js"
Cohesion: 0.50
Nodes (3): files, fs, path

### Community 19 - "contact.html - Contact Us page"
Cohesion: 0.67
Nodes (3): Drop-us-a-message contact form (client-side alert only), contact.html - Contact Us page, for-hospitals.html - For Hospitals partner page

### Community 22 - "auth/package.json"
Cohesion: 0.08
Nodes (25): dependencies, @caresy/ui, @caresy/utils, lucide-react, @supabase/ssr, @supabase/supabase-js, exports, ./modal (+17 more)

### Community 23 - "expo"
Cohesion: 0.13
Nodes (14): typedRoutes, expo, backgroundColor, experiments, icon, name, newArchEnabled, orientation (+6 more)

### Community 24 - "my-bookings/page.tsx"
Cohesion: 0.06
Nodes (50): CollectPanel(), RunningTotal(), LiveMeter(), DURATIONS, BillPanel(), BookingRecord, BookingRow(), CHANGEABLE (+42 more)

### Community 25 - "ui/src/index.ts"
Cohesion: 0.06
Nodes (46): APP_TABS, Footer(), Badge(), BadgeProps, BadgeSize, BadgeTone, SIZES, TONES (+38 more)

### Community 43 - "Caresy — Developer Handoff"
Cohesion: 0.06
Nodes (32): 10. Quick status snapshot, 1. Product overview & vision, 2. Tech stack, 3. Repository map (key files), 4. Database — schema & migrations, 5. What has been built (chronological), 6. What's PENDING and HOW to do it, 7. Setup / running locally (+24 more)

### Community 44 - "Customer Home Screen Design Specification"
Cohesion: 0.11
Nodes (18): 1. Design Philosophy & Theme, 2. Wireframe & Visual Layout, 3. Component Hierarchy & Specifications, 4. Spacing & Typography (Material 3 Scale), 5. Micro-Animations & Interactions, 6. Accessibility & WCAG AA Checklist, 7. Responsive Design (Desktop Adaptation), A. Sticky App Bar (Header) (+10 more)

### Community 45 - "Caresy Booking Engine Schema"
Cohesion: 0.12
Nodes (15): 1. Enums & Custom Types, 2. Core Tables, 3. Indexes, 4. Database Triggers & Functions, 5. Entity Relationship Diagram (ERD), 6. Migration Notes & Deployment Strategy, 7. TODOs (Pending Product Clarifications), A. Auto-Update Timestamp (+7 more)

### Community 46 - "cookieOptionsFor"
Cohesion: 0.12
Nodes (15): GET, config, proxy(), GET, config, proxy(), dynamic, GET (+7 more)

### Community 47 - "10_ADMIN_AND_COMPANIONS.sql"
Cohesion: 0.11
Nodes (16): guard_companion_privileged_fields, admin_users, companion_documents, companions, is_admin(), lc_admin_email(), set_timestamp_companions, auth.users (+8 more)

### Community 48 - "[id].tsx"
Cohesion: 0.06
Nodes (61): BookingDetail(), styles, Board(), Dispatch(), styles, RootLayout(), ACCENT, BookingCard() (+53 more)

### Community 49 - "Database"
Cohesion: 0.29
Nodes (7): Booking status, Core tables, Database, Functions that enforce rules, Gotchas, Ledger, Rules

### Community 51 - "ui/package.json"
Cohesion: 0.14
Nodes (13): dependencies, motion, @phosphor-icons/react, exports, ./theme.css, motion, @phosphor-icons/react, react (+5 more)

### Community 52 - "Caresy Live Tracking — Developer Onboarding"
Cohesion: 0.18
Nodes (11): 1. What we built, 2. Get it on your machine (import to your CLI), 2a. Backend setup (`caresy_phone` + Supabase), 2b. Mobile app setup (`caresy-app`), 2c. Test the full loop, 3. Keep in mind — DO, 4. Keep in mind — DON'T, 5. How to proceed (next steps, prioritized) (+3 more)

### Community 53 - "admin_save_booking_edit.check.ts"
Cohesion: 0.29
Nodes (9): adminOverrideStatus(), adminSaveBookingEdit(), Booking, bookings, companions, guardDriveAssignment(), isValidTransition(), oldTwoRpc() (+1 more)

### Community 54 - "exports"
Cohesion: 0.14
Nodes (13): dependencies, @supabase/supabase-js, exports, ./bookingStatus, ./careGuides, ./eta, ./phone, ./pricing (+5 more)

### Community 55 - "createClient"
Cohesion: 0.08
Nodes (30): ApprovedDashboard(), CompanionPortal(), directionsUrl(), DOC_TYPES, fmtWhen(), JobCard(), LANGUAGE_OPTIONS, loadJobs() (+22 more)

### Community 56 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): After changing code, Finding code, This is NOT the Next.js you know, Where to look

### Community 57 - "Caresy Mobile — Device QA Flow (tunnel)"
Cohesion: 0.06
Nodes (30): Android permissions (Play Console will list these), Caresy — Privacy Answers (App Store + Play), Data collected (iOS App Privacy), iOS privacy manifest, Notes for reviewer, Play Data Safety (answers), Tracking, 0. Pre-flight (+22 more)

### Community 65 - "trust/page.tsx"
Cohesion: 0.11
Nodes (17): CHECKLIST, FOUNDERS, BENEFITS, STEPS, PRICE_POINTS, Services, Testimonials, Trust() (+9 more)

### Community 66 - "types/package.json"
Cohesion: 0.40
Nodes (4): exports, name, private, version

### Community 68 - "mobile-app/app/index.tsx"
Cohesion: 0.08
Nodes (30): AccountDelete(), plugins, a, BeautifulAuth(), handleEmailAuth(), FallbackGlyph, Home(), isTrackable() (+22 more)

### Community 69 - "quick-help.tsx"
Cohesion: 0.13
Nodes (20): s, FamilyMember, FamilyScreen(), s, Profile, s, s, SERVICES (+12 more)

### Community 72 - "website/src/app/page.tsx"
Cohesion: 0.07
Nodes (35): CareGuideDetail(), GuidesPage(), metadata, ACTIVE_STATUS_LABEL, ActiveBookingInfo, BOOKING_HEADERS, fmtWhen(), greeting() (+27 more)

### Community 75 - "ADR-0005: Cash/UPI collected at completion; no payment gateway"
Cohesion: 0.40
Nodes (5): ADR-0005: Cash/UPI collected at completion; no payment gateway, Alternatives rejected, Consequences, Context, Decision

### Community 79 - "analytics/page.tsx"
Cohesion: 0.21
Nodes (12): AnalyticsBody(), FareRow, hourLabel(), MUTED_STATUSES, rupees(), Stats, STATUS_ORDER, bookingRevenueRupees() (+4 more)

### Community 80 - "ADR-0003: Scheduling and push dispatch run in Postgres (pg_cron + pg_net)"
Cohesion: 0.40
Nodes (5): ADR-0003: Scheduling and push dispatch run in Postgres (pg_cron + pg_net), Alternatives rejected, Consequences, Context, Decision

### Community 81 - "Caresy Live Tracking — Handoff, Next Steps & Vision"
Cohesion: 0.20
Nodes (10): Architecture at a glance, Caresy Live Tracking — Handoff, Next Steps & Vision, Key files, Known dead ends (2026-09-04), Next steps (prioritized), Test the loop end to end, The idea in one paragraph, Turn-it-on checklist (manual, one-time) (+2 more)

### Community 82 - "Phases"
Cohesion: 0.12
Nodes (17): 1. `@caresy/auth` cannot be shared with React Native, 2. `@caresy/utils` is not platform-independent today, 3. `packages/validation` does not exist and should not yet, Constraints and gotchas, Deployment, Mobile plan — Expo native app, Next action, Phase 0 — Unblock sharing (no mobile code yet) ✅ done 2026-08-07 (+9 more)

### Community 83 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @caresy/auth, @caresy/types, @caresy/ui, lucide-react, motion, next, @vercel/speed-insights (+7 more)

### Community 84 - "dependencies"
Cohesion: 0.06
Nodes (30): dependencies, @capacitor/android, @capacitor/app, @capacitor/core, @capacitor/haptics, @capacitor/ios, @capacitor/network, @capacitor/push-notifications (+22 more)

### Community 85 - "Session log — read this first, newest entry on top"
Cohesion: 0.05
Nodes (38): 0. Isolation — do this first, before reading any code, 1. Ground rules — these outlive this task, apply them to every future one, 2026-08-13 — Agent 2 (Muse) — branch `feature/mobile-quick-help` (worktree: `Desktop/Caresy phone/caresy_m3_worktree`), 2026-08-13 — primary session — branch `feature/structured-data`, 2026-08-14 (evening) — primary session — branch `feature/mobile-quick-help` (worktree: `Desktop/Caresy phone/caresy_m3_worktree`), 2026-08-14 — Muse review — branch `feature/mobile-quick-help` (worktree: `caresy_m3_worktree`) — Phase 3 read, 2026-08-14 — primary + Muse — branch `feature/mobile-quick-help` — forward from Phase 3, 2026-08-14 — primary session — branch `feature/mobile-quick-help` (worktree: `Desktop/Caresy phone/caresy_m3_worktree`) (+30 more)

### Community 86 - "AppDelegate"
Cohesion: 0.13
Nodes (13): AppDelegate, Any, Bool, NSUserActivity, UIApplication, UIUserActivityRestoring, UIWindow, URL (+5 more)

### Community 87 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, android, build, ios, start, start:direct, start:lan, start:tunnel (+3 more)

### Community 88 - "mobile-app/components/ui.tsx"
Cohesion: 0.09
Nodes (34): AUD, CATS, GUIDE_META, s, s, CATS, FAQS, s (+26 more)

### Community 89 - "send-push/route.ts"
Cohesion: 0.06
Nodes (59): asciiOnly(), AttentionDecision, backoffMinutes(), dynamic, escalateStuckBookings(), fanoutTelegram(), flushDueDigestBuckets(), GET() (+51 more)

### Community 90 - "InstallPrompt.tsx"
Cohesion: 0.16
Nodes (11): BIPEvent, ic, InstallPrompt(), isStandalone(), BrowserBarArt(), ConfirmCardArt(), Item, LeafSprig() (+3 more)

### Community 91 - "care/page.tsx"
Cohesion: 0.13
Nodes (12): CareEvent, CareInner(), DOC_TYPES, Documents(), fmt(), KIND_STYLE, Member, Passport() (+4 more)

### Community 92 - "Caresy — coding standards"
Cohesion: 0.25
Nodes (8): Architecture rules, Caresy — coding standards, Naming, Post-change workflow (run before saying "done"), Prompt budget, Stack (do not substitute), Testing, TypeScript

### Community 93 - "Supabase Edge Functions"
Cohesion: 0.40
Nodes (4): Deploy, Local dev, Secrets, Supabase Edge Functions

### Community 94 - "trip-eta/index.ts"
Cohesion: 0.24
Nodes (7): corsHeaders(), isAllowed(), STATIC_ALLOWED, EtaRequest, EtaResponse, LatLng, NOTE: OpenRouteService gives free-flow durations (no live traffic), which is

### Community 95 - "Caresy — engineer onboarding"
Cohesion: 0.13
Nodes (15): 10. Conventions, 11. Traps that catch newcomers, 12. Known gaps, 13. Reading order, 1. The product, 2. Stack, 3. Layout, 4. The one idea you must absorb (+7 more)

### Community 96 - "NEXT_SESSION.md — SINGLE SOURCE OF TRUTH FOR PROGRESS"
Cohesion: 0.08
Nodes (24): 2026-09-02 — new app icon, build 5 FINISHED both platforms, not yet submitted, Also landed this session, Blocked on you — do these first, Deliberately not done — do not treat as oversights, Do not retry without reading this — the React dedupe, Environment cautions, iOS — the critical path, in order (priority as of 2026-08-30), Mobile release — real state (+16 more)

### Community 97 - ".application"
Cohesion: 0.12
Nodes (17): Expo, ExpoAppDelegate, ExpoReactNativeFactoryDelegate, AppDelegate, ReactNativeDelegate, Any, Bool, NSUserActivity (+9 more)

### Community 98 - "tracking.tsx"
Cohesion: 0.24
Nodes (9): ETA_STATUSES, LocationPing, s, TrackedBooking, Tracking(), EmptyState(), ETA_MAX_SECONDS, etaSentence() (+1 more)

### Community 99 - "Trips & Real-Time Companion Location Tracking"
Cohesion: 0.29
Nodes (7): Client integration (see blueprint (c)), ETA (Edge Function `trip-eta`), Required dashboard step (cannot be done in SQL), Transport model (why two channels), Trip creation & lifecycle (migration 18), Trips & Real-Time Companion Location Tracking, What the migration creates

### Community 100 - "Auth & Domain Configuration"
Cohesion: 0.33
Nodes (5): Auth & Domain Configuration, Google Cloud console (OAuth client), How the flow works (already built), Supabase dashboard config, Verify

### Community 101 - "ExampleInstrumentedTest.java"
Cohesion: 0.33
Nodes (5): androidx.test.ext.junit.runners.AndroidJUnit4, ExampleInstrumentedTest, ExampleUnitTest, org.junit.runner.RunWith, org.junit.Test

### Community 102 - "android.app.Activity"
Cohesion: 0.28
Nodes (3): android.app.Activity, UpdateChecker, UpdateChecker

### Community 103 - "MainActivity"
Cohesion: 0.50
Nodes (3): MainActivity, com.getcapacitor.BridgeActivity, Override

### Community 104 - "Audit Fixes — 2026-08-16"
Cohesion: 0.10
Nodes (19): 1. Account Deletion (was reporting false success), 2. RLS Security Gaps (unpinned search_path, missing column guard), 3. Crash Safety (no error boundary), 4. Care Guide Dead Audience Filter, 5. Support FAQ Accordion Index Bug, 6. Tracking Honesty (website still showing fake "on the way"), Audit Fixes — 2026-08-16, Audit Report (+11 more)

### Community 105 - "Architecture"
Cohesion: 0.25
Nodes (7): Architecture, Environments, Module ownership, Request flow (booking → money), Server-side surface, Shape, Smoke tests after any change

### Community 106 - "AnimatedHeadline.tsx"
Cohesion: 0.14
Nodes (17): AnimatedHeadline(), BOOKING_HEADERS, EMOJI, GestureKey, getLocale(), Header, headerPool(), HEADERS_AFTERNOON (+9 more)

### Community 107 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 108 - "EAS + SIWA READINESS — CARESY-6"
Cohesion: 0.11
Nodes (17): A) EAS BUILD CONFIG — what was done, `apps/mobile-app/app.json` — audit & fix, `apps/mobile-app/eas.json` (after), B) SIWA FLOW — audit & completion, C) Human prerequisites — numbered checklist, D) Exact commands to run (human), E) What was completed in code vs blocked on creds, EAS + SIWA READINESS — CARESY-6 (+9 more)

### Community 109 - "booking.tsx"
Cohesion: 0.13
Nodes (15): CARE_NEEDS, DURATIONS, LANGUAGES, s, SavedPatient, SERVICES, STEP_TITLES, TRANSPORT_MODES (+7 more)

### Community 110 - "AuthContext.tsx"
Cohesion: 0.28
Nodes (14): AuthContext, AuthContextType, AuthProvider(), Profile, getMsg91AccessToken(), initExposed(), loadWidget(), msg91Configured() (+6 more)

### Community 111 - "booking/page.tsx"
Cohesion: 0.13
Nodes (15): Booking(), CARE_NEEDS, fmtSlot(), label, LANGUAGES, SavedPatient, SERVICES, TRANSPORT_MODES (+7 more)

### Community 112 - "Next Steps for the Next Agent"
Cohesion: 0.13
Nodes (14): 1. Apply Migrations to Production Supabase, 2. Test Account Deletion (Manual), 3. Deploy Website Changes, 4. Test Mobile App UI Fixes (Manual), 5. Build Mobile App for TestFlight, Android Setup, Do This Before TestFlight Build, Do This First (Blocking) (+6 more)

### Community 127 - "TELEGRAM NOTIFICATIONS REPORT — CARESY-3"
Cohesion: 0.13
Nodes (14): 1) Event-surface audit — single chokepoint `notifications`, 2) Telegram channel — new lib, 3) Wired fan-out — cron delivery path, 4) Env vars required, 5) What needs the human bot token to verify live, 6) Idempotency reasoning, 7) Files changed, 8) Verification (+6 more)

### Community 128 - "bookings"
Cohesion: 0.16
Nodes (12): guard_customer_booking_columns, public.cancel_booking(), public.reschedule_booking(), trg_guard_customer_booking, public.complete_booking(), public.reschedule_booking(), pg_proc, public.open_job_pickups() (+4 more)

### Community 130 - "EXACTLY ONCE REPORT — CARESY-4 (claim-before-send)"
Cohesion: 0.17
Nodes (11): 1) Status column type — assumption flagged, 2) Migration — `supabase/migrations/36_NOTIFICATIONS_CLAIM.sql` (90 lines), 3) Cron — `apps/website/src/app/api/cron/send-push/route.ts`, 4) Why concurrent ticks are now disjoint, 5) Stale-reclaim + failure semantics, 6) Files changed, 7) What needs prod (migration 36 apply), 8) Verification (+3 more)

### Community 131 - "SCHEDULER REPORT — CARESY-5 (hands-off drain)"
Cohesion: 0.17
Nodes (11): 1) Cron entry — file & location, 2) Auth change — `apps/website/src/app/api/cron/send-push/route.ts:138-148`, 3) GET vs POST — resolution, 4) Smoke-test, 5) What needs human / deploy, 6) Verification, 7) Files changed, 8) Risks (+3 more)

### Community 135 - "SUPABASE_SCHEMA.sql"
Cohesion: 0.21
Nodes (8): audit_bookings_changes, audit_bookings_changes, audit_logs, set_timestamp_bookings, set_timestamp_locations, set_timestamp_patients, trigger_set_timestamp, trigger_audit_bookings()

### Community 136 - "my-bookings.tsx"
Cohesion: 0.14
Nodes (22): BookingCard(), BookingRecord, isReschedulable(), isTrackable(), MyBookings(), patientName(), s, serviceLabel() (+14 more)

### Community 137 - "Booking lifecycle fixes — implementation brief"
Cohesion: 0.18
Nodes (10): Booking lifecycle fixes — implementation brief, Deferred — needs a product decision, do not implement without checking in first, Order of work, Phase 0 (URGENT — fix before anything else) — `accept()` is currently broken for every companion, Phase 1 (Critical) — DB-level state machine, Phase 2 (Critical) — Reassignment as a first-class RPC, Phase 3 (High) — Close the two concurrency races, Phase 4 (High) — Payment and suspension guards (app-code only, no migration needed for the first two) (+2 more)

### Community 138 - "mobile-app/tsconfig.json"
Cohesion: 0.15
Nodes (12): compilerOptions, strict, exclude, extends, include, **/*.check.ts, expo-env.d.ts, expo/tsconfig.base (+4 more)

### Community 139 - "public.trips"
Cohesion: 0.29
Nodes (6): auth, public.trip_locations, public.trips, auth.users, public, public.bookings

### Community 141 - "Caresy Monorepo Deployment"
Cohesion: 0.29
Nodes (7): 1. Update the existing Vercel project (website), 2. Create the two new Vercel projects, 3. Supabase Auth redirect URLs, 4. DNS (at your registrar for caresy.co.in), 5. Order of operations (zero downtime), Caresy Monorepo Deployment, Notes

### Community 142 - "lib/msg91.ts"
Cohesion: 0.53
Nodes (3): dynamic, POST(), phoneFromVerifyResult()

### Community 143 - "50_NOTIFICATION_ATTENTION.sql"
Cohesion: 0.33
Nodes (3): public.notification_attention, public.stuck_pending_bookings(), public.bookings

### Community 144 - "ADR-NNNN: <short decision, present tense>"
Cohesion: 0.33
Nodes (5): ADR-NNNN: <short decision, present tense>, Alternatives rejected, Consequences, Context, Decision

### Community 145 - "ADR-0002: npm workspaces monorepo, three Next apps, no build orchestrator"
Cohesion: 0.40
Nodes (5): ADR-0002: npm workspaces monorepo, three Next apps, no build orchestrator, Alternatives rejected, Consequences, Context, Decision

### Community 146 - "26_BILLING.sql"
Cohesion: 0.20
Nodes (8): base, guard_booking_payment_columns, slab, public.complete_booking(), public.price_for_minutes(), public.record_payment(), trg_guard_booking_payment, used

### Community 147 - "Current state"
Cohesion: 0.17
Nodes (12): Admin iOS app — code complete, not yet buildable on EAS (2026-09-16), Android release readiness — audit done, rebuild pending (2026-08-31), Before the first customer — in order, Current state, In flight, Known broken / blocked, Live in production (2026-08-02), Live tracking, remaining gap (2026-09-04) (+4 more)

### Community 148 - "Security"
Cohesion: 0.15
Nodes (12): ADR-0008: `assert`-based self-checks instead of a test framework, Alternatives rejected, Consequences, Context, Decision, If a key leaks, `is_admin()` must never return NULL (2026-08-29), Known enforcement points (+4 more)

### Community 149 - "ADR/README.md"
Cohesion: 0.16
Nodes (6): ADR-0001: Supabase (Postgres + RLS) is the backend; no custom API tier, Alternatives rejected, Consequences, Context, Decision, Architecture Decision Records

### Community 150 - "smoke.mjs"
Cohesion: 0.20
Nodes (5): failed, headers, results, root, { url, key }

### Community 151 - "ADR-0004: The Android app is a Capacitor shell pointing at the live site"
Cohesion: 0.40
Nodes (5): ADR-0004: The Android app is a Capacitor shell pointing at the live site, Alternatives rejected, Consequences, Context, Decision

### Community 152 - "Order of operations"
Cohesion: 0.14
Nodes (13): 1. Confirm a paid Apple Developer Program membership, 2. Create the app record in App Store Connect, 3. Create an App Store Connect API key, 4. Build for the store, 5. Push to TestFlight, 6. Submit for App Store review, Apple App Store release — runbook, Guideline risks, and where this app stands (+5 more)

### Community 153 - "ADR-0007: Guest tracking uses a separate `share_token`, not `reference_code`"
Cohesion: 0.40
Nodes (5): ADR-0007: Guest tracking uses a separate `share_token`, not `reference_code`, Alternatives rejected, Consequences, Context, Decision

### Community 154 - "Google Play release — closed testing runbook"
Cohesion: 0.14
Nodes (13): 1. Build a production AAB — **DONE 2026-08-29, superseded — rebuild**, 2. Create the app in Play Console, 3. Upload to a **Closed testing** track, 4. Add the testers and get them opted in, Google Play release — closed testing runbook, Keystore — already done, do not regenerate, Later: automated submission, Log (+5 more)

### Community 155 - "Caresy"
Cohesion: 0.40
Nodes (5): Caresy, Deploy, Develop, Docs, Live tracking

### Community 156 - "Today's Changes (for Claude to verify)"
Cohesion: 0.22
Nodes (8): Commands for Claude, Decisions made, Files added, Files modified, For Claude — Analyze Today's Work (2026-08-15), How to judge, Today's Changes (for Claude to verify), What to improve next (Claude should prioritize)

### Community 157 - "peerDependencies"
Cohesion: 0.08
Nodes (23): exports, ./client, ./sessionCrypto, aes-js, expo-crypto, expo-secure-store, react-native, @react-native-async-storage/async-storage (+15 more)

### Community 158 - "ADR-0010 — Lottie for the login mascot animation"
Cohesion: 0.40
Nodes (5): ADR-0010 — Lottie for the login mascot animation, Alternatives rejected, Consequences, Context, Decision

### Community 159 - "quick-help/page.tsx"
Cohesion: 0.19
Nodes (10): HospitalAutocomplete(), Coords, MeetingPoint(), AREA_PINCODE, areas, pct, served, sql (+2 more)

### Community 160 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, aes-js, @caresy/types, expo, expo-linking, react, react-native, react-native-url-polyfill (+7 more)

### Community 161 - "45_ADMIN_SMART_NOTIFY.sql"
Cohesion: 0.22
Nodes (10): public.enqueue_booking_notification, public.enqueue_companion_pending_notification, public.enqueue_booking_notification(), public.enqueue_companion_pending_notification(), public.enqueue_new_booking_notification(), enqueue_new_booking_notification, public.notifications, trg_enqueue_booking_notification (+2 more)

### Community 162 - "Caresy Native App — completion checklist"
Cohesion: 0.22
Nodes (8): Caresy Native App — completion checklist, Deferred functionality (must restore before submission), Design system, iOS submit credentials, Known open risk — `aps-environment` entitlement, Not yet verified on device, Screens, Store-submission blockers (do NOT submit until done)

### Community 163 - "website/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 164 - "companions/page.tsx"
Cohesion: 0.11
Nodes (19): CompanionRow, CompanionsBody(), DocRow, DrivingPanel(), FILTERS, ReviewSheet(), STATUS_TONE, statusLabel() (+11 more)

### Community 165 - "ios"
Cohesion: 0.22
Nodes (9): usesNonExemptEncryption, ios, bundleIdentifier, config, privacyManifests, supportsTablet, usesAppleSignIn, NSPrivacyCollectedDataTypes (+1 more)

### Community 166 - "useAuth"
Cohesion: 0.25
Nodes (6): AdminTopbar(), DeleteAccount(), Profile(), supWa(), useAuth(), Reveal()

### Community 167 - "ADR-0009 — Native mobile with Expo, not a WebView shell"
Cohesion: 0.40
Nodes (5): ADR-0009 — Native mobile with Expo, not a WebView shell, Alternatives rejected, Consequences, Context, Decision

### Community 168 - "admin-app/tsconfig.json"
Cohesion: 0.15
Nodes (12): compilerOptions, strict, exclude, extends, include, **/*.check.ts, expo-env.d.ts, expo/tsconfig.base (+4 more)

### Community 169 - "patients"
Cohesion: 0.33
Nodes (7): enqueue_care_event_notification, care_event_notify, patient_members, public.can_access_patient(), public.join_patient_circle(), auth.users, patients

### Community 170 - "PUSH PIPELINE REPORT — CARESY-1 (Phase-4 blocker)"
Cohesion: 0.22
Nodes (8): 1) Re-enable push_tokens upsert (Expo Go guard), 2) Cron delivery logic — `api/cron/send-push/route.ts`, 3) Bottom-sheet picker (replace Chips), Boundaries respected, Exact QUEUED → SENT flow traced (line numbers at commit), Next steps for agent / human, PUSH PIPELINE REPORT — CARESY-1 (Phase-4 blocker), Verification summary

### Community 173 - "find_user_by_phone"
Cohesion: 0.22
Nodes (6): find_user_by_phone(), auth.users, profiles, set_timestamp_profiles, auth.users, trigger_set_timestamp

### Community 174 - "mobile-app/package.json"
Cohesion: 0.14
Nodes (13): devDependencies, eas-cli, @types/aes-js, @types/react, typescript, @types/aes-js, @types/react, typescript (+5 more)

### Community 175 - "login/page.tsx"
Cohesion: 0.33
Nodes (4): btn(), ic, Login(), Step

### Community 176 - "ErrorBoundary"
Cohesion: 0.29
Nodes (3): updates, url, ErrorBoundary

### Community 177 - "Companion Portal — Full Lifecycle Audit (CARESY-7)"
Cohesion: 0.29
Nodes (6): CARESY-8 — build fix, Companion Portal — Full Lifecycle Audit (CARESY-7), RLS / error / empty handling, Steps 1–9 coverage, Verification, What was missing before this patch

### Community 178 - "Caresy — Easy Words Recap (what's done, what's next)"
Cohesion: 0.29
Nodes (6): Caresy — Easy Words Recap (what's done, what's next), Checks we did, Files we changed (for your reference), What to do next — in order (easy steps), What was wrong at start, What we fixed — in easy words

### Community 179 - "28_CONTACT_AND_METRICS.sql"
Cohesion: 0.29
Nodes (5): contact_messages, ops_metrics, set_timestamp_ops_metrics, auth.users, trigger_set_timestamp

### Community 180 - "android"
Cohesion: 0.25
Nodes (8): backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, googleServicesFile, package, predictiveBackGestureEnabled, android

### Community 181 - "ADR-0012: Drop the mascot; Phosphor duotone icons + Motion One spots"
Cohesion: 0.33
Nodes (5): ADR-0012: Drop the mascot; Phosphor duotone icons + Motion One spots, Alternatives rejected, Consequences, Context, Decision

### Community 182 - "ADR-0013: OTA updates via expo-updates, gated by fingerprint"
Cohesion: 0.33
Nodes (5): ADR-0013: OTA updates via expo-updates, gated by fingerprint, Alternatives rejected, Consequences, Context, Decision

### Community 184 - "Handoff — 2026-08-16 (updated 13:40 -> approved)"
Cohesion: 0.33
Nodes (5): Handoff — 2026-08-16 (updated 13:40 -> approved), Next agent — do this, Phase evaluation, Verification, What was done this session (in order)

### Community 185 - "infoPlist"
Cohesion: 0.25
Nodes (8): ITSAppUsesNonExemptEncryption, NSCameraUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription, NSLocationWhenInUseUsageDescription, NSPhotoLibraryUsageDescription, NSPrivacyAccessedAPICategoryFileTimestamp, NSUserNotificationUsageDescription, infoPlist

### Community 186 - "src/client.ts"
Cohesion: 0.18
Nodes (9): createNativeClient(), LargeSecureStore, NativeClientOptions, blob, keyA, keyB, session, decryptSession() (+1 more)

### Community 187 - "metro.config.js"
Cohesion: 0.40
Nodes (4): config, { getDefaultConfig }, path, workspaceRoot

### Community 188 - "ADR-0011 — Mascot as a design-system primitive, requested by pose"
Cohesion: 0.40
Nodes (5): ADR-0011 — Mascot as a design-system primitive, requested by pose, Alternatives rejected, Consequences, Context, Decision

### Community 189 - "fix-next-global-error.js"
Cohesion: 0.40
Nodes (4): fs, path, t, target

### Community 190 - "public.claim_notifications"
Cohesion: 0.50
Nodes (3): public.claim_notifications(), information_schema.columns, pg_proc

### Community 191 - "public.enqueue_trip_status_notification"
Cohesion: 0.50
Nodes (3): pg_trigger, public.enqueue_trip_status_notification(), pg_proc

### Community 192 - "prompt.md"
Cohesion: 0.50
Nodes (3): 1. Add the import, 2. Wrap the confirm-form body in Stagger, After the edit

### Community 195 - "public.stamp_companion_on_booking"
Cohesion: 0.50
Nodes (3): public.stamp_companion_on_booking(), pg_proc, PUBLIC

### Community 197 - "tsconfig.json"
Cohesion: 0.50
Nodes (3): compilerOptions, extends, expo/tsconfig.base

### Community 199 - "isValidIndianMobile"
Cohesion: 0.24
Nodes (14): QuickHelp(), CHIPS, FaqCategory, FAQS, Support(), supWa(), AuthModal(), digits() (+6 more)

### Community 203 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, @caresy/utils, expo-dev-client, expo-device, expo-location, expo-router, expo-web-browser, react (+13 more)

### Community 206 - "permissions"
Cohesion: 0.29
Nodes (7): permissions, android.permission.ACCESS_COARSE_LOCATION, android.permission.ACCESS_FINE_LOCATION, android.permission.INTERNET, android.permission.POST_NOTIFICATIONS, android.permission.READ_EXTERNAL_STORAGE, android.permission.VIBRATE

### Community 208 - "ops/page.tsx"
Cohesion: 0.11
Nodes (12): ApprovedCompanion, BookingRecord, COLUMNS, initials(), OpsBoard(), OpsMetrics, STATUS_OPTIONS, TRANSPORT_LABEL (+4 more)

### Community 210 - "website/src/app/layout.tsx"
Cohesion: 0.12
Nodes (14): epilogue, JSON_LD, metadata, poppins, viewport, CookieBanner(), MobileBottomNav(), CapacitorGlobal (+6 more)

### Community 211 - "slots.ts"
Cohesion: 0.38
Nodes (4): ordered, previous, MIN_LEAD_MINUTES, TIME_SLOTS

### Community 212 - "admin-app/package.json"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, ios, start, typecheck (+1 more)

### Community 214 - "34_SECURITY_HARDENING.sql"
Cohesion: 0.22
Nodes (6): guard_trip_status_columns, is_admin(), public.advance_trip_status(), auth.users, public.trips, trg_guard_trip_status

### Community 217 - "seed-app-review-demo.ts"
Cohesion: 0.29
Nodes (4): checkOnly, main(), supabase, { url, serviceKey, email: DEMO_EMAIL, password: DEMO_PASSWORD }

### Community 219 - "blockedPermissions"
Cohesion: 0.40
Nodes (5): blockedPermissions, android.permission.SYSTEM_ALERT_WINDOW, android.permission.WRITE_EXTERNAL_STORAGE, android.permission.ACCESS_BACKGROUND_LOCATION, android.permission.READ_MEDIA_VIDEO

### Community 222 - "companion/src/app/layout.tsx"
Cohesion: 0.29
Nodes (5): dynamic, metadata, poppins, viewport, PortalHeader()

### Community 224 - "Booking"
Cohesion: 0.16
Nodes (17): Booking(), durationLabel(), fmtSlot(), nextDays(), QuickHelp(), BadgeState, LocationBadge(), QUICK_PICKS (+9 more)

### Community 225 - "27_TRANSPORT.sql"
Cohesion: 0.29
Nodes (6): guard_drive_assignment, booking_transport, public.companion_may_drive(), public.transport_fare_reference, auth.users, trg_guard_drive_assignment

### Community 230 - "make-icons.py"
Cohesion: 0.39
Nodes (7): logo_mask(), main(), placed(), Alpha-only cut-out of the logo, trimmed to its bounding box. The source is…, Scale the mask to `fraction` of the canvas and centre it., rgb(), tinted()

### Community 232 - "30_LAUNCH_FIXES.sql"
Cohesion: 0.25
Nodes (3): public.drive_ready_companions, enqueue_new_booking_notification, trg_enqueue_new_booking_notification

### Community 233 - "retry.check.ts"
Cohesion: 0.50
Nodes (3): backoffMinutes(), fixedNow, nextRetryAt()

### Community 235 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/aes-js, @types/react, typescript, @types/aes-js, @types/react, typescript

### Community 243 - "Caresy Admin"
Cohesion: 0.33
Nodes (5): Caresy Admin, Checks, Run it, Staying current, What it does

### Community 251 - "extra"
Cohesion: 0.50
Nodes (4): projectId, extra, eas, router

### Community 252 - "public.claim_notifications"
Cohesion: 0.50
Nodes (3): public.claim_notifications(), information_schema.columns, pg_proc

### Community 255 - "Caresy Admin (`in.co.caresy.admin`) — a second listing, a second set of notes"
Cohesion: 0.29
Nodes (6): App Review notes — paste into App Store Connect, Before you submit, Caresy Admin (`in.co.caresy.admin`) — a second listing, a second set of notes, Paste into App Store Connect > App Review > Notes, The part that is a real decision, not a checkbox, Which account, and seeding it

### Community 261 - "Header.tsx"
Cohesion: 0.47
Nodes (5): APP_TABS, Header(), STANDALONE, titleFor(), TITLES

### Community 264 - "ADR-0006: Transport is facilitated and recorded, never billed"
Cohesion: 0.33
Nodes (5): ADR-0006: Transport is facilitated and recorded, never billed, Alternatives rejected, Consequences, Context, Decision

### Community 265 - "ADR-0014: A separate admin iOS app, not admin screens inside the customer app"
Cohesion: 0.33
Nodes (5): ADR-0014: A separate admin iOS app, not admin screens inside the customer app, Alternatives rejected, Consequences, Context, Decision

### Community 266 - "public.admin_push_user_ids"
Cohesion: 0.33
Nodes (5): public.admin_push_user_ids(), public.enqueue_upcoming_unstaffed_bookings(), auth.users, public.bookings, public.notifications

### Community 267 - "admin-app/metro.config.js"
Cohesion: 0.40
Nodes (4): config, { getDefaultConfig }, path, workspaceRoot

### Community 268 - "admin/src/app/layout.tsx"
Cohesion: 0.40
Nodes (3): metadata, poppins, viewport

### Community 269 - "Troubleshooting & deployment playbook"
Cohesion: 0.67
Nodes (3): Deploy, Symptom index, Troubleshooting & deployment playbook

### Community 278 - "expo"
Cohesion: 0.33
Nodes (5): projectId, expo, extra, owner, eas

## Knowledge Gaps
- **1314 isolated node(s):** `projectId`, `owner`, `name`, `slug`, `scheme` (+1309 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **115 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `notifications` connect `[id].tsx` to `bookings`, `mobile-app/app/index.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `bookings` connect `bookings` to `27_TRANSPORT.sql`, `public.stamp_companion_on_booking`, `SUPABASE_SCHEMA.sql`, `patients`, `[id].tsx`, `26_BILLING.sql`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `AuthProvider()` connect `mobile-app/app/index.tsx` to `mobile-app/components/ui.tsx`, `[id].tsx`, `quick-help.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `projectId`, `owner`, `name` to the rest of the system?**
  _1314 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `payments/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08194905869324474 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `script.js` be split into smaller, more focused modules?**
  _Cohesion score 0.052244897959183675 - nodes in this community are weakly interconnected._