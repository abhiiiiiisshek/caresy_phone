# Caresy Admin

The dispatch desk on a phone. Why it is a separate app and not a tab in the
customer app: `docs/ADR/0014-separate-admin-ios-app.md`.

## Run it

```
cp .env.example .env.local        # same Supabase URL + anon key as the other apps
npm install                       # from the repo root
npm run start -w @caresy/admin-app
```

Push notifications need a real development build, not Expo Go — registration
no-ops there on purpose.

## What it does

| Screen | File | Writes |
|---|---|---|
| Dispatch board | `app/index.tsx` | nothing — reads `bookings` |
| Booking detail | `app/booking/[id].tsx` | `admin_save_booking_edit` RPC only |
| Sign in | `components/SignIn.tsx` | Supabase email + password |

Sign-in is email + password because ops accounts come from the `admin_users`
allowlist (migration 10), not from self-serve signup. `is_admin()` decides what
the UI shows; RLS and the RPC guards decide what the database allows. The app
holds the anon key and nothing else.

## Icons

`assets/icon-source.png` is the artwork as the designer delivered it: a rounded
card on a black field. iOS wants the opposite — a full-bleed opaque square with
no alpha and no rounding, because it applies the mask itself — so the shipped
assets are derived, not the source:

```
python3 ../../scripts/flatten-app-icon.py assets/icon-source.png \
    --icon-out assets/icon.png --splash-out assets/splash-icon.png
```

`icon.png` fills the corners by extending the artwork's own edge pixels, so the
background gradient carries out to the edge instead of meeting a flat patch.
`splash-icon.png` keeps the rounded card and drops the black field to
transparency, so it sits on the dark splash background.

`scripts/make-icons.py` is the other icon path and is unrelated: it *derives* a
mark from `apps/website/public/icon-512.png` for apps that have no finished
artwork. This app has finished artwork, so it does not use it.

## Checks

```
npx tsc --noEmit
node --experimental-strip-types lib/dispatch.check.ts
```

`lib/dispatch.ts` holds every rule the board sorts, groups and colours by, so
the self-check covers bucketing, urgency escalation and ordering rather than any
screen.

## Staying current

The board polls every 30s while foregrounded, refetches when the app returns to
the foreground, and refetches when a push lands. Alerts themselves come from
`notifications` rows with `recipient_role = 'ADMIN'`, fanned out to this device
by `api/cron/send-push` via migration 51.
