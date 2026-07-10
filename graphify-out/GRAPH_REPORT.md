# Graph Report - caresy_phone  (2026-07-10)

## Corpus Check
- 109 files · ~540,478 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 699 nodes · 930 edges · 79 communities (42 shown, 37 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7aec3713`
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
- page.tsx
- package.json
- Card.tsx
- page.tsx
- page.tsx
- next.config.ts
- postcss.config.mjs
- next.config.ts
- postcss.config.mjs
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 41 edges
2. `useAuth()` - 37 edges
3. `Button()` - 18 edges
4. `compilerOptions` - 16 edges
5. `compilerOptions` - 16 edges
6. `compilerOptions` - 16 edges
7. `Input()` - 15 edges
8. `booking.html - Book Assistance (planned visit) page` - 12 edges
9. `Badge()` - 11 edges
10. `Caresy — Developer Handoff` - 11 edges

## Surprising Connections (you probably didn't know these)
- `CompanionRow` --references--> `ApprovalStatus`  [EXTRACTED]
  apps/admin/src/app/companions/page.tsx → packages/types/src/index.ts
- `proxy()` --calls--> `updateSession()`  [EXTRACTED]
  apps/admin/src/proxy.ts → packages/auth/src/supabase/middleware.ts
- `CompanionRow` --references--> `ApprovalStatus`  [EXTRACTED]
  apps/companion/src/app/page.tsx → packages/types/src/index.ts
- `proxy()` --calls--> `updateSession()`  [EXTRACTED]
  apps/companion/src/proxy.ts → packages/auth/src/supabase/middleware.ts
- `Support()` --calls--> `createClient()`  [EXTRACTED]
  apps/website/src/app/support/page.tsx → packages/auth/src/supabase/client.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pages sharing identical footer nav template (about/services/trust/faq/quick-help/booking/my-bookings/privacy/terms links)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_my_bookings_page, vanilla_backup_privacy_page, vanilla_backup_quick_help_page, vanilla_backup_terms_page, vanilla_backup_trust_page [EXTRACTED 1.00]
- **Pages sharing identical floating WhatsApp widget (+919717500225, same inline SVG)** — vanilla_backup_booking_page, vanilla_backup_faq_page, vanilla_backup_quick_help_page, vanilla_backup_trust_page [EXTRACTED 1.00]

## Communities (79 total, 37 thin omitted)

### Community 0 - "Card"
Cohesion: 0.05
Nodes (71): AdminAnalytics(), Stats, STATUS_ORDER, AdminCompanions(), CompanionRow, DocRow, FILTERS, ReviewSheet() (+63 more)

### Community 1 - "createClient"
Cohesion: 0.07
Nodes (29): dependencies, @caresy/auth, @caresy/types, @caresy/ui, @caresy/utils, lucide-react, next, react (+21 more)

### Community 2 - "script.js"
Cohesion: 0.05
Nodes (46): API_BASE, bookingForm, bookingId, bookingStatus, CARESY_STATS, checkAndVerifyOTP(), companionDatabase, dateInput (+38 more)

### Community 3 - "page.tsx"
Cohesion: 0.07
Nodes (26): dependencies, @caresy/auth, @caresy/types, @caresy/ui, @caresy/utils, lucide-react, next, react (+18 more)

### Community 4 - "booking.html - Book Assistance (planned visit) page"
Cohesion: 0.07
Nodes (31): bookings table (central transaction table), locations table (hospitals, labs, home addresses), patients table (patient separate from paying customer), about.html - About Us page, checkAuth() function, companions[] hardcoded roster (Priya Sharma, Anil Kumar, Sarah Mathews), loadAllBookings() function (fetch /api/admin/bookings), admin-ops.html - Live Operations Desk (dispatcher board) (+23 more)

### Community 5 - "devDependencies"
Cohesion: 0.25
Nodes (7): name, private, scripts, build, dev, version, workspaces

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dependencies, @caresy/auth, @caresy/types, @caresy/ui, lucide-react, next, react, react-dom (+17 more)

### Community 7 - "server.js"
Cohesion: 0.12
Nodes (13): activeOtps, adminSessions, app, cors, DB_DIR, DB_FILE, express, fs (+5 more)

### Community 8 - "LocationBadge.tsx"
Cohesion: 0.10
Nodes (14): metadata, poppins, viewport, metadata, poppins, viewport, metadata, poppins (+6 more)

### Community 9 - "page.tsx"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "package.json"
Cohesion: 0.18
Nodes (10): dependencies, cors, express, description, main, name, scripts, dev (+2 more)

### Community 11 - "patch-about-faq.js"
Cohesion: 0.29
Nodes (6): aboutContent, aboutFile, faqContent, faqFile, fs, path

### Community 12 - "proxy.ts"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

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
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 18 - "update-html.js"
Cohesion: 0.50
Nodes (3): files, fs, path

### Community 19 - "contact.html - Contact Us page"
Cohesion: 0.67
Nodes (3): Drop-us-a-message contact form (client-side alert only), contact.html - Contact Us page, for-hospitals.html - For Hospitals partner page

### Community 22 - "eslint.config.mjs"
Cohesion: 0.11
Nodes (17): dependencies, @caresy/ui, lucide-react, @supabase/ssr, @supabase/supabase-js, exports, ./modal, ./supabase/callback (+9 more)

### Community 23 - "next.config.ts"
Cohesion: 0.21
Nodes (11): BookingCard(), BookingRecord, CompanionDetails, DetailSheet(), formatDate(), getStatusInfo(), isPastStatus(), mailLink() (+3 more)

### Community 24 - "postcss.config.mjs"
Cohesion: 0.15
Nodes (6): CHECKLIST, FOUNDERS, BENEFITS, STEPS, TESTIMONIALS, Card()

### Community 25 - "route.ts"
Cohesion: 0.24
Nodes (9): ButtonProps, ButtonShape, ButtonSize, ButtonVariant, SIZES, VARIANTS, InputProps, StepItem() (+1 more)

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
Cohesion: 0.29
Nodes (7): config, proxy(), config, proxy(), config, proxy(), updateSession()

### Community 47 - "index.ts"
Cohesion: 0.24
Nodes (6): ActiveBookingInfo, APP_SERVICES, TRUST_ITEMS, Companion, COMPANIONS, findCompanionByName()

### Community 48 - "Badge.tsx"
Cohesion: 0.22
Nodes (7): BadgeProps, BadgeSize, BadgeTone, SIZES, TONES, CompanionCard(), CompanionCardProps

### Community 49 - "IconButton.tsx"
Cohesion: 0.31
Nodes (5): GET, GET, GET, authCallback(), createClient()

### Community 50 - "page.tsx"
Cohesion: 0.25
Nodes (5): APP_TABS, IconButton(), IconButtonProps, IconButtonVariant, VARIANTS

### Community 51 - "page.tsx"
Cohesion: 0.25
Nodes (7): exports, ./theme.css, name, peerDependencies, react, private, version

### Community 52 - "README.md"
Cohesion: 0.17
Nodes (10): 1. Update the existing Vercel project (website), 2. Create the two new Vercel projects, 3. Supabase Auth redirect URLs, 4. DNS (at your registrar for caresy.co.in), 5. Order of operations (zero downtime), Caresy Monorepo Deployment, Notes, Caresy (+2 more)

### Community 53 - "Card.tsx"
Cohesion: 0.33
Nodes (4): CATEGORIES, FAQS, Support(), supWa()

### Community 54 - "page.tsx"
Cohesion: 0.29
Nodes (6): dependencies, @caresy/auth, exports, name, private, version

### Community 55 - "page.tsx"
Cohesion: 0.33
Nodes (4): Trust(), VERIFICATION_STEPS, StatCard(), StatCardProps

### Community 65 - "page.tsx"
Cohesion: 0.40
Nodes (3): SERVICES, ServiceCard(), ServiceCardProps

### Community 66 - "package.json"
Cohesion: 0.40
Nodes (4): exports, name, private, version

### Community 67 - "Card.tsx"
Cohesion: 0.50
Nodes (3): CardProps, CardVariant, VARIANTS

## Knowledge Gaps
- **412 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+407 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Card` to `LocationBadge.tsx`, `Card.tsx`, `index.ts`, `next.config.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Card` to `LocationBadge.tsx`, `index.ts`, `next.config.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `Button()` connect `Card` to `LocationBadge.tsx`, `route.ts`, `Card.tsx`, `next.config.ts`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _413 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Card` be split into smaller, more focused modules?**
  _Cohesion score 0.05217757205975174 - nodes in this community are weakly interconnected._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `script.js` be split into smaller, more focused modules?**
  _Cohesion score 0.052244897959183675 - nodes in this community are weakly interconnected._