# ADR-0007: Guest tracking uses a separate `share_token`, not `reference_code`

- **Status:** Accepted
- **Date:** 2026-07-26
- **Code:** `supabase/migrations/22_PUBLIC_TRACKING.sql`, `apps/website/src/app/tracking`

## Context

Family members get a live-tracking link over WhatsApp. Requiring them to sign in
— and to *be* the booking owner — made the share button useless: the daughter who
booked is not the son who wants to watch the trip.

## Decision

Every booking carries an unguessable `share_token` (122 random bits) that appears
only in the tracking URL. One narrow SECURITY DEFINER reader exchanges the token
for exactly the live-trip fields, nothing else. No account required.

## Alternatives rejected

- **Reuse `reference_code`** — 6 characters from a 32-char alphabet (~1e9), and
  it is spoken aloud on support calls and pasted into chats. It identifies a
  booking; it must not also authorise reading its live location.
- **Force sign-in** — kills the share feature for everyone but the booker.
- **A signed JWT link** — key rotation and expiry handling for a link whose
  useful life is one trip; a random token in a row is simpler to revoke.

## Consequences

- Anyone holding the link can watch the trip. That is the feature; keep the
  reader's column list minimal and never widen it to PII.
- Tokens are per-booking, so revocation means rotating that one row.
