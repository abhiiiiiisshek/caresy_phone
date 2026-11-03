# Current state

_Updated: 2026-11-03. First real customers expected 2026-08-02._

Short-lived working memory: what is in flight, what is known-broken, what is
next. Not architecture — a thing that settles here for good belongs in
`docs/ARCHITECTURE.md` or a `docs/ADR/` entry. Prune ruthlessly; anything stale
here is worse than nothing.

Read this first after a `/clear`.

## Android app — sign-in dead end and seven more, fixed (2026-11-03)

A Play-Store install could not get past Google sign-in: the OAuth redirect
`caresy://auth/callback` deep-links back into the app, expo-router resolved it
as a route, and there was no `app/auth/callback.tsx` — so every sign-in landed
on expo-router's "Unmatched Route" screen. The session was usually set; the
user just never saw the app. The new route consumes the tokens itself as well
as existing, because a cold start has no `openAuthSessionAsync` promise left to
receive them.

A read of the whole `apps/mobile-app` source then turned up seven more, all
fixed in the same pass:

- **Attachments were never uploading.** `booking.tsx` sent a React Native
  `Blob` to Supabase Storage, which storage-js documents as not working on RN
  ("upload file using `ArrayBuffer`… instead"); the failure was swallowed by a
  bare `catch {}` while the screen still read "✓ Selected". Now
  `expo-file-system`'s `File.arrayBuffer()`, a zero-byte guard, and an alert
  that names the ref code when it fails. The booking still succeeds regardless.
- **Removed family members came back.** `booking.tsx`'s patient picker did not
  filter `deleted_at`, which `family.tsx` sets on Remove.
- **The "Relation" field did nothing** — no such column existed (migration 53
  adds it; `patient_members.relation` is a different thing).
- **Every address was filed as "Noida"**, hardcoded, though the pincode check
  had already resolved the real city.
- **Timezone.** Slots were written with `new Date("…T10:00")` — device-local —
  so a family member booking from abroad moved the visit by their UTC offset,
  and the home card formatted in device time while My Bookings forced IST. Now
  one checked helper, `lib/bookingTime.ts` (`istSlotToDate` + self-check
  asserting the instant is identical under five timezones), and IST everywhere
  it is displayed. **`availableSlots` in `packages/utils` is still
  device-local** — shared with the website, so out of scope here; a booking
  from a non-IST phone gets a slightly wrong *available-slot window* even
  though the time it writes is now right.
- **Support FAQ contradicted the app**, claiming reschedule was "coming soon"
  (it ships, with a 60-min lead) and that account deletion was support-only
  (it is in Profile → Danger zone). The second is a data-deletion claim on a
  live Play listing.
- Android date picker advanced to the time picker even when dismissed; dead
  `reduceMotion` const removed from five screens.

Verified: `tsc --noEmit` clean, `expo export --platform android` builds,
`bookingTime.check.ts` passes. Migration 53 applied before the OTA, since the
Family screen now selects `patients.relation` and would 400 without it.

Shipped as an `eas update` to the production branch — JS-only, fingerprint
unchanged, so it reaches installed Play builds without a new AAB or review.

## App Store seller name — entity migration submitted (2026-10-23)

The App Store shows **Abhishek Sharma** under the Caresy app, because the
Apple Developer membership is an *individual* one and Apple locks the seller
name to the holder's legal name. There is no App Store Connect setting for
this.

Submitted to Apple on 2026-10-23: individual → organization migration for
CARESY COMPANION SERVICES (OPC) PRIVATE LIMITED (D-U-N-S 312183790, CIN
U86100UW2026OPC257621). Answered **No** to the DBA/trade-name question
deliberately — India has no DBA registry and the "Caresy" trademark is not
filed, so claiming one would stall the request. The seller name will therefore
become the full legal name, not bare "Caresy".

Apple's turnaround is 2–4 weeks and they e-mail for documents: the Certificate
of Incorporation is staged at `~/Downloads/apple-entity-migration/`. **Do not
send the Udyam certificate** — its address says Bishrakh/Patwari where MCA and
D&B both say Dadri, and the mismatch invites a rejection.

⚠️ Migration resets the IDFV for every existing user on their next update, so
analytics will read them as new installs. Apple says this cannot be undone.

Website side (done, this commit): the footer named **"Caresy Care Services
Pvt. Ltd."** at an address in Bisrakh Jalalpur. No such entity is registered —
both were placeholders written before incorporation, and a company name on the
site that disagrees with the D-U-N-S record is a standard verification
rejection. The footer also returned `null` on the four app tabs, `/` among
them, so the domain root Apple actually loads carried no company identity at
all.

New `apps/website/src/lib/company.ts` (+ self-check) is the single source for
the registered identity. `Footer.tsx` now renders the legal strip on every
page while the marketing footer still stops at the bottom nav on app tabs;
`layout.tsx` JSON-LD gained `legalName` and a full postal address; the phantom
name and address are gone from `privacy/` and `terms/`.

Verified: `tsc --noEmit` clean, `company.check.ts` passes, `build` succeeds,
and the built `index.html` contains the legal name, CIN and 203207 with no
trace of the old values. Lint is unchanged at 42 errors / 4 warnings, all
pre-existing and in files this pass did not touch.

Next: deploy, then once the migration lands ask Apple to update the seller
name if it has not followed automatically (it often does not). Getting the
display name shortened to bare "Caresy" is a separate job needing a Class 44
trademark — ~₹4,500 govt fee with the Udyam rebate, ~8–18 months. Not blocking.
Android's Play Console developer name is self-serve and still unchanged.

## Customer app — loading experience rebuilt (2026-09-27)

`apps/mobile-app`. Every blank screen and bare spinner replaced. ADR-0015 has
the why (RN `Animated`, zero new deps).

New: `lib/motion.ts` (motion hooks) + `lib/motionMath.ts` (+ self-check),
`lib/network.ts` (connectivity derived from a global-fetch wrapper),
`components/Skeleton.tsx`, `components/SplashGate.tsx`,
`components/SmartImage.tsx`, `components/States.tsx`, `components/Refresh.tsx`.
Changed: `components/ui.tsx` (Button morph, Card/Chip press springs, sheet
spring, state views), `app/_layout.tsx`, and the four screens that gated on
`LoadingState`.

Verified: `tsc --noEmit` clean; lint 121 errors, down from a 129 baseline (all
remaining are pre-existing, in files this pass did not touch); `expo export
--platform ios` succeeds.

**Fixed 2026-10-23 (was: Android export broken).** `expo export --platform
android` failed on `Unable to resolve module @expo/ui/jetpack-compose` from
`expo-router/build/.../toolbar/`. Root cause was resolution, not a missing
package: `@expo/ui` is a hard dependency of `expo-router` 57.0.21 and npm had
installed it *nested* at `node_modules/expo-router/node_modules/@expo/ui`, but
`metro.config.js` sets `disableHierarchicalLookup = true`, so Metro only
searches the two explicit `nodeModulesPaths` and never walks into a nested
copy. iOS was unaffected because the import exists only in `.android.js` files.

Fix: declare `"@expo/ui": "~57.0.18"` in `apps/mobile-app/package.json` so npm
hoists it to the workspace root, which *is* a searched path — the same
already-established pattern as `expo-symbols` and `expo-glass-effect`, both
also expo-router dependencies declared explicitly for this reason.
`apps/admin-app` had the identical latent bug (same metro config, same nesting)
and got the same line. Verified: android export exits 0 (3.9MB bundle), `tsc
--noEmit` clean in both apps, and the sourcemap gate shows `@expo/ui` 81
sources, `expo-notifications` 57, `react-native-maps` 35, `expo-device` 3.

Also done: the Capacitor shell (`apps/mobile`) got the same splash handoff —
`launchShowDuration` is now a 3s ceiling, and `NativeSplash.tsx` in the website
paints a matching overlay then calls `SplashScreen.hide()`. Website `tsc`,
lint and `build` all pass. Not yet seen on a device (per CLAUDE.md, verify on a
Vercel preview rather than a local dev server).

**Simulator run (mobile-app, iOS):** bundle compiles clean (1519 modules) and
the React splash renders. Two pre-existing blockers had to be cleared first:
a stale `ios/Podfile.lock` (ExpoFont/ExpoLocation drift — deleted, clean
`pod install`; `ios/` is gitignored) and the `expo-router/_ctx-shared` Metro
crash, fixed with `typedRoutes: false` in `app.json`, the same fix admin-app
took. Note for next time: Metro `--localhost` binds IPv6 `[::1]` only and the
app requests IPv4 `127.0.0.1` — start it with
`REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 npx expo start --lan`.

**Splash branding fixed (2026-09-27).** `apps/mobile-app/assets/splash-icon.png`
was never a placeholder — it is the green Caresy C, byte-identical to
`android-icon-foreground.png`. What showed a placeholder was the *prebuilt*
native splash: `apps/mobile-app/ios/.../SplashScreenLogo.imageset` (generated
Aug 27) and, worse, the Capacitor shell, which was shipping the **Capacitor
logo** as its splash across 11 Android densities and 3 iOS variants. All 14
regenerated from the real mark on `#f8faf5`.

Sizing is now one number everywhere — the mark stands ~136pt tall: Capacitor
images are generated at 35% of the short edge, Expo's native splash is
`imageWidth: 220` at `contain`, and `SplashGate`'s logo box was corrected from
168 to 220 to match it (at 168 the logo visibly jumped at the handoff). The
source asset is 1024² with the mark occupying only a 534×635 bbox, so sizing
off the canvas understates it by ~40% — crop to the alpha bbox first.
`NativeSplash` now uses `public/splash-mark.png` (transparent, cropped);
`icon-512.png` has no alpha and was painting a white square on the cream.

**Not built, by decision:** Switch, Checkbox, FAB, Tabs, Accordion and search-bar
micro-interactions — the app renders none of these today. `usePressScale` in
`lib/motion.ts` is the primitive to compose them from when a screen needs one.

## Admin iOS app — build 4 uploaded to App Store Connect (2026-09-17)

`apps/admin-app`, the dispatch desk on a phone. ADR-0014 has the why; what is
in flight:

- Screens: a five-tab shell (`app/(tabs)`) behind one auth gate —
  **Desk** (board bucketed Needs action / Upcoming / Active / Done),
  **Live** (trips in the field, maps hand-off, stale-ping warnings),
  **Alerts** (the notifications outbox: send on WhatsApp, mark sent/failed),
  **Team** (companion approval queue) and **More**. Pushed off More:
  **Payments** (ledger + waive) and **Analytics**. Pushed off Desk and Team:
  booking detail, which assigns a companion and overrides status through the
  same `admin_save_booking_edit` RPC the admin website uses, and companion
  review with KYC documents and driving clearance. Web/mobile parity is
  effectively closed; service areas, users and timeouts stay on the website.
- **Alignment fix (2026-09-19).** `Touchable` put the caller's style on an
  inner `Animated.View`, so every layout style passed to a pressable —
  `flex: 1` on a stat tile, a tab item or a pair of buttons, `full` on a
  primary button — was swallowed and those rows came out ragged. The style now
  lands on the pressable itself. `StatBox` no longer auto-shrinks its figure
  (three amounts in a row each settled on a different size), tab badges are
  inline instead of absolutely placed off a hand-tuned offset, and the `‹ back`
  row is one `BackLink` primitive rather than three hand-rolled copies.
- **UI rebuilt light (2026-09-19).** The dark command-deck is gone: soft neutral
  ground, white lifted cards, ink pills for the one primary action, and colour
  spent only on state. Hues come from the Caresy Admin icon (amber on
  near-black). Tokens in `apps/admin-app/lib/theme.ts`, primitives in
  `components/ui.tsx` (`Card`, `Chip`, `Btn`, `StatTile`, `Avatar`, `Chevron`,
  `Row`, `SectionTitle`) — there is no icon font in this app, so glyphs are
  drawn from Views. The Overview tiles *are* the bucket filter, so no count on
  screen is unopenable. `app.json` flipped to `userInterfaceStyle: light`.
- **Customer contact on the phone (2026-09-19).** `BOOKING_SELECT` now carries
  `service_metadata` + `estimated_duration_minutes`, and `contactOf()` reads
  either website form's shape (`/booking` writes `customerPhone`,
  `/quick-help` writes `phone`). The board's Call button dials the customer who
  booked; the patient's next-of-kin is a labelled fallback, never a silent one.
- **INSTANT is critical from minute zero** (`urgency()`): an instant request
  expires in 30 minutes, so it now outranks a scheduled request that has been
  ageing for longer. Covered in `lib/dispatch.check.ts`.
- **Alert health is on screen.** `useAuth().pushState` reports whether this
  device is actually in `push_tokens`; the board shows an *Alerts on/off* chip
  and, when off, a card that re-requests permission or opens Settings. A desk
  phone that quietly stopped receiving pushes used to look like a quiet night.
- `packages/native` is new: the Supabase client and its encrypted session
  storage moved out of `apps/mobile-app/lib/supabase.ts` so both Expo apps share
  one copy. `apps/mobile-app/lib/supabase.ts` and `lib/sessionCrypto.ts` are now
  re-exports; nothing else in the customer app changed, and it still bundles.
- Push: migration **51** lets `api/cron/send-push` resolve admin user ids and
  fan ADMIN-role rows out to `push_tokens`, and adds a per-tick sweep for
  scheduled visits still unstaffed inside their lead window
  (`UNSTAFFED_LEAD_MINUTES`, default 90).
- `lib/expoPush.ts` fixes a live bug while it is there: both native apps mint
  **Expo** push tokens, and the FCM v1 path was rejecting them as
  INVALID_ARGUMENT and then *deleting* them as dead. Transport is now chosen per
  token by shape.

**Done (2026-09-17):** migration 51 applied; Apple App ID `in.co.caresy.admin`
created with the Push Notifications capability; App Store Connect record
created; `apps/admin-app/.env.local` written. `eas.json` now carries
`submit.production.ios.ascAppId` (**6812859884**). It was left out on purpose —
EAS can resolve the app from the bundle identifier — but that resolution only
happens interactively: `eas submit --non-interactive` fails outright with
"Set ascAppId in the submit profile (eas.json) or re-run this command in
interactive mode." A scripted submit needs it written down.

**Shipped state:** EAS project `@caresys-team/caresy-admin`
(`bb0ade64-5691-4202-9a87-486db1f4420a`), ASC App ID **6812859884**, bundle
`in.co.caresy.admin`. Build `2c5550a6` (commit `5e48626`, build number 5) is
the current one: it carries the five-tab shell, payments, analytics, companion
review and the pressable-layout fix, and was submitted to App Store Connect on
2026-09-21 — processing, then TestFlight. Build `fbaa8c37` (commit `eeb0e1c`,
number 4) is the board-and-detail-only build that was on TestFlight before it;
`ec3f7503` (commit `912e214`, number 3) is the pre-fix one that died in the
Swift compile — leave both, they are only history.

iOS credentials are now on the Expo servers and reusable: distribution
certificate + provisioning profile (both expiring 2027-09-17) and — the part
this app actually needs — an **Apple push key**, without which the Expo push
fan-out in migration 51 would have had nothing to deliver through on iOS.

**Remaining:**

1. ~~EAS project~~ — **done 2026-09-17.** `@caresys-team/caresy-admin`,
   projectId `bb0ade64-5691-4202-9a87-486db1f4420a`, `updates.url` written by
   `eas update:configure`. Note for anyone reading the history: the first
   `eas init` ran from the repo root and wrote a stray `/app.json` pointing at
   `7a1b5ed6…`, which is `@caresys-team/caresy` — the **customer** app's
   project, already holding its builds. Linking there would have put both apps'
   EAS Update channels in one namespace. Run `eas init` from `apps/admin-app`.

2. **An admin review account.** The app is email + password only, so the
   consumer review account will not work — it is not on the `admin_users`
   allowlist and would land Apple on the "Not an ops account" screen.
   `docs/APP_REVIEW_NOTES.md` has the section, including the PII trade a live
   admin account makes and the procedure for closing it after approval.
3. **Icons are the old brand mark.** `scripts/make-icons.py` derives all six
   assets from `apps/website/public/icon-512.png`, which `docs/NEXT_SESSION.md`
   says is still the pre-lockup logo. Replace that file, then re-run for both
   apps.

### The Xcode compile failure, and why it happened (2026-09-17)

The first EAS iOS build got past credentials and died in the Swift compile:

```
cannot find 'ContentOriginRegistry' in scope
value of type 'ExpoSwiftUI.ShadowNodeProxy' has no member 'setContentOrigin'
value of type 'ExpoSwiftUI.ShadowNodeProxy' has no member 'clearContentOrigin'
```

All three came from one file — `@expo/ui/ios/ExpoUIModule.swift` and
`RNHostView.swift` — and one split:

| package | was | provides / needs |
| --- | --- | --- |
| `expo-modules-core` | 57.0.12, **one hoisted copy** | defines the symbols — but only from **57.0.14** onward |
| `@expo/ui` (under admin-app's `expo-router`) | 57.0.18 | **calls** them |
| `@expo/ui` (under mobile-app's `expo-router`) | 57.0.12 | does not call them — which is why only the admin build broke |

`@expo/ui` declares its peer as `expo: "*"`, so npm had nothing to refuse. The
admin app was installed later than the customer app, so its `~57.0.15` ranges
resolved to newer patches against an `expo-modules-core` that `expo@57.0.15`
was still pinning to `~57.0.12`.

Fixed by moving the whole SDK 57 patch set forward with `expo install --fix` in
**both** Expo apps — both, because `expo-modules-core` hoists to a single copy
at the workspace root, so the two apps cannot sit on different patch levels.
Now `expo@57.0.23`, `expo-modules-core@57.0.18`, `@expo/ui@57.0.18`, and all 36
native Expo modules resolve to exactly one version each.

Two things fell out of that upgrade and are also fixed here:

- `expo-router@57.0.21` pulls `expo-glass-effect`, which npm nested under
  `expo-router/node_modules`. `metro.config.js` sets
  `disableHierarchicalLookup = true` on purpose, so Metro only looks in the app
  and workspace root and could not see it — `Unable to resolve module
  expo-glass-effect`. It is now a direct dependency of both apps, which is
  where a native module belongs anyway.
- `expo install --fix` added the `@react-native-community/datetimepicker`
  config plugin to `apps/mobile-app/app.json`. That is correct for SDK 57, and
  worth knowing because it changes the customer app's fingerprint
  `runtimeVersion` — its next OTA will not reach builds made before it.

`expo-doctor` on the admin app is now 16/18. The two that remain are deliberate:
the `metro.config.js` overrides are the workspace-resolution fix its own
comments describe, and the duplicate `react`/`react-dom` (19.2.3 in the app,
19.2.4 at the root) is a hoisting artifact of the web apps pinning 19.2.4 —
JS-only, not a native module, and the SDK asks for 19.2.3, so bumping it would
trade one warning for another.

Deliberately **not** done: no live-trip map, no payments, no analytics, no
companion approvals — the website still owns those and nobody asked to carry
them in a pocket. The board polls every 30s rather than using Supabase Realtime,
which would need `bookings` added to the `supabase_realtime` publication.

## Android release readiness — audit done, rebuild pending (2026-08-31)

Branch `fix/android-release-readiness`, three commits, **not pushed**. Full
detail in `docs/PLAY_STORE_RELEASE.md`; the short version:

- The versionCode 4 AAB **must not ship**. Uploading it burns 14 days of
  closed-test clock on a build with a placeholder icon and dead push.
- `eval("require")` had hidden `expo-device`, `expo-notifications` and
  `react-native-maps` from Metro, so they were absent from the production
  bundle. Push registration and the tracking map were silently dead on every
  store build. Now static imports, verified against a bundle sourcemap.
- App icon, splash and notification icon were Expo's placeholder on **both**
  platforms — so the TestFlight build carries it too. `scripts/make-icons.py`
  regenerates all six from the website's brand mark.
- `expo-image-picker` was pulling `RECORD_AUDIO` into the manifest.
  `app.json` now pins `android.permissions` / `blockedPermissions`.
- `LargeSecureStore.getItem` crashed on launch after an Android backup-restore.
  Pure half extracted to `packages/native/src/sessionCrypto.ts` with a self-check.

**Open, and only you can do them:** rotate the App Review demo password
(`DEMO_APP_REVIEW_PASSWORD`, see `docs/APP_REVIEW_NOTES.md` — the old one was
public on GitHub), rotate the GitHub PAT pasted in plaintext 2026-08-27, and
finish App Store Connect (`ascAppId`, API key, privacy questionnaire).

Deliberately **not** done: R8/ProGuard is still off. Turning on minification days
before a release risks a crashing build from a missing keep-rule, and the JS
bundle dominates size anyway. Do it after the clock starts, verified with a
preview build. No crash reporting either — that needs an ADR and a new dependency.

## Where the code lives (read before cloning — 2026-08-27)

**`origin/main` is authoritative.** Clone it fresh; do not copy a folder off
anyone's machine. Seven working copies existed on the original dev machine and
several were badly stale — one was 20 migrations behind. All work found in them
has been merged to `main` or pushed to a branch; nothing is left stranded.

Branches on GitHub, and what to do with each:

| Branch | State |
| --- | --- |
| `main` | Authoritative. All four apps typecheck; website/companion/admin all build. |
| `wip/docs-consolidation` | **Not merged.** Folds `CURRENT.md`/`DEVELOPER_HANDOFF.md`/`DEV_ONBOARDING.md`/`LIVE_TRACKING_HANDOFF.md` into `ENGINEER_ONBOARDING.md` + a new `JUNIOR_ONBOARDING.md`, gitignores `graphify-out`, deletes `vanilla-backup/`. Based behind `main` — rebase before reviewing. |
| `feature/structured-data` | **Stale**, 45 commits behind. Its useful commits were already ported to `feature/companion-portal`. Delete once confirmed. |
| `feature/mobile-reschedule` | Fully merged, 0 ahead. Safe to delete. |

Migrations 37–40 are merged **and applied** (verified 2026-08-27 by probing
`stamp_companion_on_booking`, `is_valid_booking_transition`,
`admin_override_booking_status`, `reassign_booking`, `complete_booking`,
`reschedule_booking` — all present). Companion `accept()`, broken since
CARESY-7, is fixed. Background in `docs/BOOKING_LIFECYCLE_FIXES.md`.

Verify a clone with `npx tsc --noEmit` per app, `npm run build`, and
`npm run smoke` (backend checks: service-area validation, expiry sweep, RLS
wall — needs Supabase URL + anon key in env or `apps/website/.env.local`).
Note the anon key is now Supabase's newer `sb_publishable_…` format; legacy JWT
anon keys are rejected by this project.

## Needs a manual run (2026-09-08)

**`supabase/migrations/50_NOTIFICATION_ATTENTION.sql`** — run in the Supabase
SQL editor. Additive only (new columns on `notifications`, new
`notification_attention` table, three new SECURITY DEFINER RPCs); nothing in
36/44/49 changes.

Fixes the actual cause of the "still pending every 2-5 min" Telegram flood:
44's FAILED-row backoff retry (for FCM/ops) was also re-triggering Telegram on
every reclaim, even after Telegram had already delivered — no per-channel
memory existed. `notifications.telegram_sent_at` now remembers that, and
`resolve_notification_attention()` gates every CRITICAL/IMPORTANT send behind
a per-entity (booking/patient) cooldown — only a real status change, a
crossed escalation tier, or elapsed cooldown sends; a repeat is suppressed.
INFORMATIONAL/BUFFERED routing (49) is untouched.

Also adds: time-based escalation for bookings stuck PENDING (reuses
`bookings.expires_at`, tiers at 50%/80% elapsed — no new threshold), and
Ack/Snooze/Escalate/Resolve buttons on every attention-gated Telegram
message, handled by the new `apps/website/api/telegram/webhook` route.

**Second manual step, after deploying the route:** register the webhook with
Telegram —
`POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<site>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>`
— and set `TELEGRAM_WEBHOOK_SECRET` in Vercel (any random string; Telegram
echoes it back as a header, that's the auth check). Without this step the
buttons render but pressing one just spins — Telegram has nowhere to post
the callback.

Not yet done: no admin UI reads `notification_attention` directly (only
Telegram sees ack/snooze/escalate state today) — add a view under
`/admin/notifications` if the Telegram-only workflow stops being enough.

---

**`supabase/migrations/46_PICKUP_PRECISION.sql`** — run this **before** the
mobile build that stores a pickup pin on every booking.

46 scopes `"Companions read job locations"` to the companion who holds the job
and hands the open feed `open_job_pickups()` (hospital, pincode, city) instead
of the whole `locations` row. The feed only ever drew those three fields; the
meeting point and its coordinates belong to whoever accepted the work.

Deploy order: run 46, deploy the companion portal (its open feed calls the new
RPC), then ship the app build. Neither half breaks on its own — out of order,
open jobs render without their hospital label until both are in place, because
the old portal's join is denied and the new portal's RPC does not exist yet.

---

**`supabase/migrations/47_TRACKING_TRIP_STATE.sql`** — run before deploying the
tracking clients.

`get_shared_tracking` now also returns `trip_id` and `trip_status`. Both were
missing and both mattered:

- **The live channel was never live.** `LocationShare.tsx` broadcast on
  `trip:<share_token>` and the tracking screens listened on the same topic, but
  the RLS on `realtime.messages` (migration 16) resolves a topic by casting its
  second segment to a `trips.id`. A share token is a different uuid, so it
  matched no trip and both the send and the subscribe were denied in silence.
  The 10s poll was doing all the work. Both ends now use `trip:<trip_id>`.
- **The stepper was guessing.** It read the booking row, whose one `IN_PROGRESS`
  covers pickup, the drive and arrival, and inferred "they must have left" from
  the presence of coordinates. `trips.status` says which stage it actually is,
  and `advance_trip_status()` is its only writer.

⚠️ **Dashboard → Realtime → Settings → disable "Allow public access."** The
channel policies in migration 16 are only enforced with it off. Left on, the
private channel is not private. If the setting is wrong the subscribe fails and
the screen falls back to the poll, so this shows up as "not live", not as an
error.

The poll stays as the floor under Broadcast and is the only path a guest
link-holder has (the channel policies are `TO authenticated`). It backs off from
10s to 30s once pings are arriving.

## Live tracking, remaining gap (2026-09-04)

Sharing now starts by itself when a companion taps **Start job**, holds a Screen
Wake Lock while the tab is visible, and shows the companion a red *"Not sharing
— the family can't see where you are"* line whenever a live job is not
transmitting.

**That is an interim, and the limit is structural.** The companion portal is a
browser tab. Nothing in it survives the phone locking or the companion switching
apps — the OS suspends the tab and pings stop. The customer's screen then shows
the last position with an ageing timestamp, which is honest but not live. Real
background location needs a companion role inside `apps/mobile-app`, plus Apple
5.1.5 justification and Google's background-location declaration and demo video.
See `docs/LIVE_TRACKING_HANDOFF.md` next-step 6.

**ETA now works, for the question families actually ask.**
`48_TRIP_ETA_TARGET.sql` adds `get_trip_eta_target()`, which returns the pickup
pin while the trip is `assigned` / `en_route_pickup` and the hospital after
that. The hospital branch still returns nothing, because nothing writes
`bookings.destination_location_id` — that is unchanged and documented. The
pre-pickup ETA is the one worth having, and the pickup pin exists on every
booking now.

Needs the Edge Function deployed and keyed, or the tracking screen just shows no
ETA (never a stale one):

```
supabase functions deploy trip-eta
supabase secrets set OPENROUTESERVICE_API_KEY=...   # free key from openrouteservice.org
```

## Before the first customer — in order



1. **Run `supabase/migrations/30_LAUNCH_FIXES.sql`, then `31_CUSTOMER_ACTIONS.sql`**
   in the SQL editor, in that order. Nothing below them works without them. Both
   end in assertions, so they fail loudly rather than half-applying.
2. **Set the env vars** in the table below. Without `NEXT_PUBLIC_UPI_VPA`
   the whole operation is cash-only; without `OPS_WEBHOOK_URL` nobody is paged
   when a booking arrives.
3. **Schedule the expiry sweep** — `pg_cron` every 5 minutes, per the note at
   the end of `13_LIFECYCLE.sql`. Without it nothing ever expires; with it and
   *without* migration 30, same-day bookings were killed on arrival.
4. **Approve at least one companion** at `/admin/companions`, and clear them for
   driving there if you intend to offer `CUSTOMER_VEHICLE` at all.
5. **Walk the money loop on two phones**: book → accept → Start → Complete &
   bill → collect → confirm the row at `/admin/payments`. Still never run end to
   end by a human.

## In flight

- **Illustration is Phosphor duotone + Motion One, not a mascot.** ADR-0012
  (2026-08-11) supersedes ADR-0010/0011 and deleted `packages/ui/src/mascot/`;
  illustrated slots are `MotionSpot`, the 12 care-guide categories are
  `apps/website/src/lib/guideIcons.tsx`. Issue #18 (the ✓/✗ text prefixes in the
  website's `booking`/`quick-help` service-area copy) is **closed** — replaced
  with `CheckCircle2`/`XCircle` in `cc7839e`, which also widened
  `@caresy/ui` `Input`'s `hint` to `ReactNode`. The mobile app still uses a 📍
  glyph in the same copy; it is now hidden from TalkBack behind an explicit
  `accessibilityLabel` rather than read aloud as "round pushpin".

- **Migration 31 gives the customer their own two verbs.** Reschedule and Cancel
  in `my-bookings` were buttons that closed the sheet; every plan change arrived
  as a WhatsApp message. They now call `cancel_booking()` / `reschedule_booking()`,
  which check ownership, the status window (nothing after Start) and the 60-minute
  lead window server-side, tell the companion and ops, and reset `expires_at` so a
  moved visit is not swept to `EXPIRED`. The same migration closes the hole that
  made the RPCs advisory: the customer's own session could PATCH `status` straight
  to `COMPLETED` or unassign the companion, because the UPDATE policy checked who
  owned the row and never what changed in it.
- **Ops rows in the notification queue reached the wrong person.** The push cron
  resolved *every* row without a `recipient_user_id` to the booking's customer,
  so "a HOSPITAL_COMPANION request needs a companion assigned" was pushed to the
  customer and ops was never told. ADMIN-role rows now POST to `OPS_WEBHOOK_URL`
  (Slack/Discord/Zapier/n8n/WhatsApp gateway — any JSON endpoint); with it unset
  they stay `QUEUED` so the `/admin/ops` badge still counts them.
- **`ACCEPTED` renders on the home screen too**, not just in `my-bookings` — the
  live booking card was listed for `ASSIGNED` only, so the self-accept path left
  the home screen blank.
- **`/quick-help` reuses the patient** it already has for that customer instead of
  minting a row per urgent request. Old duplicates still need the merge script.
- **`/admin/analytics` renders `transport_fare_reference`** — what rides to each
  drop point have actually cost, by hour. Every fare the companions logged was
  invisible outside the SQL editor.
- **Migration 30 closes the day-one gaps found by walking the live loop.** The
  four a customer would have hit: a same-day booking got `expires_at` in the
  past and was swept to `EXPIRED` before anyone saw it; a companion accepting
  from their own phone left the customer with no name, no photo and no number
  (only the admin board wrote `service_metadata.companion` — the database
  stamps it now, whoever assigns); `can_drive` was writable by the companion it
  gated; and creating a booking notified nobody at all.
- **Both sides can now reach each other.** The companion's job card shows the
  customer and emergency numbers as `tel:` links — they were in the row all
  along and simply never rendered. `my-bookings` shows the companion's number
  once the job is theirs.
- **`ACCEPTED` renders for customers.** `my-bookings` understood only
  `ASSIGNED`, so the self-accept path — the normal one — showed a raw status
  string and never offered the Track button.
- **The booking form refuses the past.** Slots inside a 60-minute lead window
  are not offered, and the slot is re-checked at submit. Logic and its
  self-check live in `packages/utils/src/slots.ts`.
- **Booking lifecycle state machine shipped (migrations 37-40).** `bookings.status` is now DB-enforced (`is_valid_booking_transition` + `trg_enforce_booking_transition`); status overrides require `admin_override_booking_status` with reason audit; companion reassignment is a first-class `reassign_booking` RPC (clock reset if IN_PROGRESS, dual notifications); `complete_booking`/`reschedule_booking` races closed with FOR UPDATE; companion Accept preflight overload unblocks every Accept; admin waive is stale-safe and companion suspend warns on live jobs; companion portal now polls every 60s when live, shows 20-row Updates panel, and handles 0-row races. Migrations 37-40 confirmed applied by hand in the Supabase SQL editor.
  Reviewed line-by-line against source (not just the diff) after first-pass implementation: found and fixed one real crash — `apps/companion/src/app/page.tsx`'s new poll `useEffect` referenced `fetchNotifications` before its own `const` declaration (temporal-dead-zone `ReferenceError` on every render of the companion dashboard). Fixed by reordering; `npx tsc --noEmit` clean on both `@caresy/admin` and `@caresy/companion` after the fix. Lint errors present in both apps (4 admin, 3 companion, all `no-explicit-any`/`react-hooks/set-state-in-effect`) traced individually to files/lines this work never touched — pre-existing, not regressions. `npm run build` for either app was **not** run as part of this review — do that before calling this fully shipped, since this repo's own `CLAUDE.md` calls it the real gate (catches server/client boundary issues `tsc` alone won't).
  Polish items are now closed (2026-08-29, merged in d1de649): the combined admin
  save is one transactional RPC (`42_ADMIN_SAVE_INTENT.sql` — explicit
  `p_change_status`/`p_change_companion` flags, `FOR UPDATE`; migration 41 was a
  first attempt whose NULL-means-two-things defect it supersedes); both native
  `confirm()` sites use the app's two-step pattern; `reassign_booking` has a
  `can_drive` pre-check before the RPC. Admin gates all green on `main`: tsc,
  lint 0 errors, `next build` 14/14 routes, self-check exit 0. Companion app's
  3 lint errors and its `npm run build` remain open (issues #20, #12).
- **`is_admin()` failed open for anonymous callers — fixed 2026-08-29.** COALESCE
  sat inside the scalar subquery, so a session with no `auth.uid()` returned NULL
  rather than FALSE, and plpgsql does not take `IF NOT NULL THEN`. Three admin
  RPCs were callable over PostgREST with only the publishable anon key. RLS still
  hid booking IDs so exploitation needed a UUID leaked from elsewhere. Fixed in
  `43_FIX_IS_ADMIN_NULL.sql` (applied); re-probed after — all three now 401.
  Rule recorded in `docs/SECURITY.md`.
- **Billing pipeline (migration 26) is shipped but still never exercised end to
  end by a human.** See step 5 above.
- **Admin coverage is nearly complete.** `/payments` (owed / collected / waive)
  exists; `/companions` now has driving-licence verification; `/ops` shows the
  transport mode and warns before a driving assignment the database will refuse;
  `/analytics` now renders the fare reference.
- **Play Store**: personal-account registration needs 12 testers × 14 continuous
  days before production. Keystore + tester list not started.

## Known broken / blocked

| Thing | Effect | Fix |
|---|---|---|
| `NEXT_PUBLIC_UPI_VPA` unset | UPI buttons hidden, cash-only | set in Vercel env (website + companion) |
| `SUPABASE_SERVICE_ROLE_KEY` unset | push delivery dead; `notifications` queue grows unread | set on website server env |
| A `FAILED` notification is never retried | one bad run strands the row; requeue by hand with `update notifications set status='QUEUED', error=null where …` | add a retry counter if it happens twice |
| Duplicate patient rows | old ones from before `/quick-help` reused patients | run `32_MERGE_DUPLICATE_PATIENTS.sql`; it skips any duplicate that owns documents, so re-run the query at its foot afterwards |
| `patient-docs` bucket | must be created by hand in the dashboard | migration 25 only adds policies |

## Live in production (2026-08-02)

Both cron routes run on cron-job.org every 1 min (push drain) and 5 min (expiry
sweep), authenticated with `CRON_SECRET`. `OPS_WEBHOOK_URL` points at an
**ntfy.sh** topic — no workspace account, the topic string is the only secret, and
the phone app is the pager. A new booking, a cancellation and a reschedule all
buzz the ops phone within a minute. Two traps, both hit once already: the URL
must have no `www.` and no trailing slash (either gives a 308 that cron-job.org
counts as failure), and a Vercel env var does nothing until the next redeploy.

## Next up (rough order)

1. Play Store keystore + testers.
2. Walk cancel and reschedule on two phones — both are shipped and neither has
   been run by a human.

## Stale docs

`docs/DEVELOPER_HANDOFF.md` (2026-07-09) predates the monorepo — its repository
map and pending-work sections describe the old single-app `src/` tree. Useful as
history; do not follow its layout. `docs/ARCHITECTURE.md` supersedes it.
