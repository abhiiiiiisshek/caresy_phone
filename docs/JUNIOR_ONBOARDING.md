# Junior / intern onboarding — plain English

For interns or juniors with little prior context. Engineers should read
[`ENGINEER_ONBOARDING.md`](ENGINEER_ONBOARDING.md) instead — it's the accurate,
maintained map of the repo. This file only carries the things that doc doesn't:
the why in plain words, a glossary, past mistakes, and a first-week task list.

---

## 1. What is Caresy? (the big picture)

**One sentence:** Caresy provides trusted **hospital companions** for families
who cannot be physically present.

**Real example:** Your parents live in Noida. You work in Bangalore. Your
father needs to go to Max Hospital for a checkup. You book a Caresy companion —
a trained person who picks him up, stays with him at the hospital, handles
queues, talks to the doctor, and brings him home safely. You get live updates
on your phone.

This repo (`caresy_phone`) is a **monorepo**, not one app: the customer
website, the companion app, the admin dashboard, and the shared backend all
live here. See "Layout" in `ENGINEER_ONBOARDING.md` §3 for exactly where.

## 2. Why are we building this?

- Many elderly people live alone or families are far away.
- Hospitals are confusing: long queues, paperwork, multiple counters.
- Families worry: "Who will stay with my parents at the hospital?"

Caresy sends a human companion — not just a cab, someone who **stays, waits,
and cares**. It has to work in under 2 minutes, often booked in an emergency,
on cheap phones and slow internet, and it has to earn trust instantly.

## 3. Current goal (MVP — Noida / Greater Noida only)

1. A beautiful, fast, trustworthy website that works on any phone.
2. Bookings must never get lost — if someone pays, there must be a record.
3. Works with slow internet without breaking.

Right now an **admin human** assigns companions manually — there is no
auto-dispatch algorithm yet. That's intentional for the MVP.

## 4. What went wrong before (lessons)

Real incidents, already fixed — read so you don't repeat the pattern:

- **Design tokens must be centralized.** Four screens once used Tailwind's
  generic `slate-*`/`teal-*` colors instead of brand tokens and looked like a
  different app. Fixed once, in `globals.css`, instead of four files.
- **Don't ship `dark:` classes without a real dark theme.** Phones in system
  dark mode turned those same four screens black while the rest of the site
  stayed cream. `@custom-variant dark` now scopes `dark:` to an explicit
  `force-dark` class that nothing uses, so the site can't accidentally go dark.
- **Don't fake real-time numbers with `Math.random()`.** "Companions online"
  used to re-randomize per page; a visitor with three tabs saw three different
  numbers. Made static instead.
- **If a page is stuck loading, check env vars before you touch the code.**
  `my-bookings` looked broken in production but the code was correct — Vercel
  was just missing `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`.
- **Always test at mobile width (360–768px).** A leftover CSS rule once hid
  the hamburger menu on phones — most users are on phones.

## 5. Your role as intern + first tasks

**Week 1:** Read `ENGINEER_ONBOARDING.md`, run the app (§8 there), click every
page on phone + desktop, note what you observe.
**Week 2:** Fix small UI bugs, optimize one image to WebP.
**Week 3+:** Build a small feature with senior guidance.

How to work:
1. Never push directly to `main` — branch as `fix/yourname-shortdesc`.
2. One change = one commit.
3. `npm run build -w @caresy/<app>` before any PR — red errors block the PR.
4. Screenshots before/after, attached to the PR.
5. Stuck more than 30 min — ask, with what you tried.

First 5 tasks, in order:
- [ ] Run locally, visit every route in `apps/website`, list 5 observations.
- [ ] Convert one image in `apps/website/public/assets/` from PNG to WebP.
- [ ] Check the `my-bookings` empty state — what does a 0-booking user see?
- [ ] Test the header mobile menu at 360px width.
- [ ] Read `docs/DATABASE.md`, sketch the core tables on paper, show a senior.

## 6. Glossary

| Word | Means |
|---|---|
| **Companion** | Trained person who stays with the patient at hospital — not a driver |
| **Patient** | Person receiving care (may not be the one who booked) |
| **Customer** | Person who pays and books |
| **RLS** | Row Level Security — DB rule enforced by Postgres, not the frontend |
| **MVP** | Minimum Viable Product — Noida-only, manual assignment |
| **Monorepo** | One git repo, multiple apps (`apps/website`, `apps/companion`, `apps/admin`) sharing `packages/*` |

## 7. Rules to not break things

1. Never commit `.env.local` — it has Supabase keys.
2. Never edit `globals.css`'s `@theme` block without asking — it affects every page.
3. Never delete a file under `supabase/migrations/` — add a new one instead.
4. Never trust the frontend alone for security — check RLS policies.
5. Never use `Math.random()` for anything a user sees as "live" data.
6. Always test at mobile width.
7. Always run the build before a PR.

---

*Originally written 2026-08-16. Trimmed and monorepo-corrected 2026-08-19 — the
file structure, DB schema, and run steps here were pre-monorepo and had
drifted from the real repo; `ENGINEER_ONBOARDING.md` is now the single place
those live, so this file won't drift again the same way.*
