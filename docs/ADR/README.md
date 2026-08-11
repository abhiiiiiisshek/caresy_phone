# Architecture Decision Records

Why the code looks the way it does. The code shows *what*; these show *what else
was considered and why it lost*, so nobody — human or agent — "helpfully" undoes
a deliberate choice.

Write one when a choice would look wrong or arbitrary to a competent newcomer.
Not for every library bump. Copy `0000-template.md`, take the next number, never
edit a decided ADR — supersede it with a new one and link both.

Several ADRs here are short on purpose: the full reasoning already lives in the
header comment of the migration that implements them. The ADR is the index.

| # | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-supabase-as-backend.md) | Supabase (Postgres + RLS) instead of a custom API tier | Accepted | 2026-07-10 |
| [0002](0002-npm-workspaces-monorepo.md) | npm workspaces monorepo, three Next apps, no build orchestrator | Accepted | 2026-07-04 |
| [0003](0003-postgres-schedulers-not-vercel-cron.md) | pg_cron + pg_net in Postgres, not Vercel Cron | Accepted | 2026-07-27 |
| [0004](0004-capacitor-remote-url-shell.md) | Capacitor shell pointing at the live site | Superseded by 0009 | 2026-07-26 |
| [0005](0005-gatewayless-payments.md) | Cash/UPI collected at completion; no payment gateway | Accepted | 2026-07-28 |
| [0006](0006-transport-is-facilitated-not-billed.md) | Transport fares recorded, never billed | Accepted | 2026-07-29 |
| [0007](0007-share-token-for-guest-tracking.md) | Separate `share_token` for guest tracking links | Accepted | 2026-07-26 |
| [0008](0008-assert-selfchecks-no-test-framework.md) | `assert`-based self-checks instead of a test framework | Accepted | 2026-07-29 |
| [0009](0009-expo-native-mobile.md) | Native mobile with Expo / React Native, not a WebView shell | Accepted | 2026-08-07 |
| [0010](0010-lottie-login-mascot.md) | Lottie-animated mascot on login | Superseded by 0012 | 2026-08-10 |
| [0011](0011-mascot-design-system.md) | One owned mascot character, requested by pose | Superseded by 0012 | 2026-08-10 |
| [0012](0012-drop-mascot-phosphor-motion.md) | Drop mascot; Phosphor duotone icons + Motion One spots | Accepted | 2026-08-11 |
