# Caresy — Fix List for Developer

Follow this top to bottom, in order. Each item says: which file, what to find, what to change to, and how to check it worked. Do not skip the "Check" step.

## 0. Setup (do this first, every session)

1. Open a terminal in the project folder.
2. Run: `npm install`
3. Run: `npm run dev`
4. Open `http://localhost:3000` in the browser and leave it open. Refresh after every change below to see it.
5. Before deploying anything, run `npm run build`. If it shows red errors, stop and fix them before pushing — do not deploy a broken build.

---

## 1. 🔴 Colors: two files, fixes almost everything at once

**Problem:** `src/app/booking/page.tsx`, `src/app/quick-help/page.tsx`, `src/app/my-bookings/page.tsx`, and `src/components/AuthModal.tsx` use Tailwind's generic default colors (`slate-*`, `teal-50` through `teal-900`) instead of the brand colors. This makes those 4 screens look like a different, generic app compared to the rest of the site (Home, Services, About, Trust, FAQ etc., which already use the brand colors correctly).

**Do NOT hand-edit those 4 files.** Instead, open `src/app/globals.css`, find this block near the very end of the file:

```css
@theme {
  --color-ink-teal: #16302B;
  ...
  --color-sage-deep: #B9CBB4;
```

Paste this **directly above the closing `}` of that `@theme` block** (keep the `--animate-*` lines that are already there below it untouched):

```css
  /* Make Tailwind's built-in slate/teal color scales match the brand
     instead of their generic defaults. This fixes booking, quick-help,
     my-bookings, and the login modal without editing those files. */
  --color-slate-50: var(--color-paper);
  --color-slate-100: var(--color-sage);
  --color-slate-200: var(--color-sage-deep);
  --color-slate-300: var(--color-sage-deep);
  --color-slate-400: var(--color-muted-teal-gray);
  --color-slate-500: var(--color-muted-teal-gray);
  --color-slate-600: var(--color-muted-teal-gray);
  --color-slate-700: var(--color-charcoal);
  --color-slate-800: var(--color-ink-teal);
  --color-slate-900: var(--color-ink-teal);
  --color-slate-950: var(--color-ink-teal);

  --color-teal-50: var(--color-sage);
  --color-teal-100: var(--color-sage);
  --color-teal-200: var(--color-sage-deep);
  --color-teal-300: var(--color-teal);
  --color-teal-400: var(--color-teal);
  --color-teal-500: var(--color-teal);
  --color-teal-600: var(--color-teal);
  --color-teal-700: var(--color-teal-deep);
  --color-teal-800: var(--color-teal-deep);
  --color-teal-900: var(--color-ink-teal);
  --color-teal-950: var(--color-ink-teal);
```

**Check:** reload the Booking page, Quick Help page, My Bookings page, and open the Login modal. Backgrounds should now look cream/paper, buttons and highlights should look teal/terracotta — not generic gray/blue-green.

---

## 2. 🔴 Turn off automatic dark mode

**Problem:** those same 4 files also use `dark:` classes (e.g. `dark:bg-slate-950`). If a visitor's phone is set to dark mode, these pages will flip to a dark theme while the rest of the site stays on the cream theme — the site will look broken/inconsistent for a large share of visitors.

**Fix:** in `src/app/globals.css`, go to the very first line of the file. It currently says:

```css
@import "tailwindcss";
```

Change it to these two lines:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.force-dark, .force-dark *));
```

This tells Tailwind that `dark:` classes only apply inside an element with a `force-dark` class — since nothing in the project has that class, every `dark:` class in the project becomes permanently inactive, and the site always shows the one brand theme, regardless of the visitor's phone settings.

**Check:** on your phone or browser, switch system dark mode on, reload Booking/Quick Help/My Bookings/Login — they should look identical to system light mode (cream background, not black/gray).

---

## 3. 🟠 Stop the "companions online" number from changing per page

**Problem:** `src/app/trust/page.tsx` and `src/app/quick-help/page.tsx` each independently randomize the "companions online" and "callback minutes" numbers every 15 seconds. `src/app/booking/page.tsx` shows a fixed number that never changes. Result: a visitor can see three different numbers on three pages in the same visit, which looks fake.

**Fix, in `src/app/trust/page.tsx`:** find this block:

```js
  useEffect(() => {
    const interval = setInterval(() => {
      setCallbackMin(4 + Math.floor(Math.random() * 5));
      setDeskCompanions(5 + Math.floor(Math.random() * 7));
    }, 15000);
    return () => clearInterval(interval);
  }, []);
```

Delete the whole block (all 7 lines). Leave the two lines above it that say `useState(8)` and `useState(6)` — do not touch those.

**Do the exact same thing in `src/app/quick-help/page.tsx`** — find the identical block and delete it the same way.

Leave `src/app/booking/page.tsx` as it is (it's already static at 8 / 6, which is now what all three pages will show).

**Check:** open Trust, Quick Help, and Booking pages one after another — all three should show "8" companions and "6" minute callback, and it should never change on its own.

---

## 4. 🟠 "My Bookings" stuck on a permanent loading spinner

This is very likely not a code bug — the code in `src/app/my-bookings/page.tsx` already handles loading/empty/error states correctly. It's almost certainly a missing environment variable on the live deployment.

**Fix:** go to the Vercel project settings → Environment Variables, and confirm both of these are set for the Production environment (values are in `.env.local`, do not commit that file):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

After adding/fixing them, redeploy. If My Bookings is still stuck after that, open the browser console (F12) on the live site, reload the page, and send me the red error text — that will say exactly what's failing.

---

## 5. 🟡 Verify the mobile menu actually opens on a real phone

This was previously broken (a leftover CSS rule was permanently hiding the menu on phones) and has already been fixed in `globals.css`. After you deploy, just double check on an actual phone (or Chrome DevTools device mode at width ≤768px):

- Tap the hamburger icon (top-left of the header). A left-side menu should slide in with Home, Services, Trust & Safety, About Us, For Hospitals, FAQs, Contact Us, and (if logged out) "Need help today" / "Book for later" buttons plus "Log In / Sign Up".
- If it does not open, tell me — do not attempt to debug the CSS yourself, come back to me with a screenshot.

---

## 6. 🟢 Nice-to-have, do only after 1–5 are done and checked

- **Images:** the photos in `/public/assets/` are `.png`. Converting them to `.webp` makes the site load faster, especially on phones. Use any online PNG→WebP converter, replace the files, keep the same filenames (just change the extension) and update the `src="..."` paths in the page files that reference them.
- **Admin Operations page** (`src/app/admin-ops/page.tsx`): this is internal-only (not shown to customers), so it's lowest priority, but if you have spare time, check it for the same `slate-*` styling — it should already be mostly fixed by Step 1 above since that step is global.

---

## If anything here doesn't match what you see

Stop, take a screenshot, and send it to me with the step number. Don't guess or improvise a different fix — some of these files (booking, quick-help) are actively being changed, so what you see may already differ slightly from what's described above.
