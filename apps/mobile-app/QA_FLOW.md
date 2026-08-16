# Caresy Mobile — Device QA Flow (tunnel)

Run with `npx expo start --tunnel` from `apps/mobile-app`. Check each on **Android + iOS** via Expo Go. Mark ✅/❌.

## 0. Pre-flight
1. `npx expo start --tunnel --clear` — QR loads
2. Expo Go updated, same tunnel session
3. `.env.local` Supabase URL/key present, Supabase reachable
4. `npm run typecheck -w @caresy/mobile-app` exits 0

## 1. Auth
5. Cold start signed-out — branded welcome renders (no crash)
6. Sign in with Google — redirect returns to app, session persists after kill/reopen
7. Sign out from Profile — returns to welcome, protected screens redirect

## 2. Home (`app/index.tsx`)
8. Signed-out: hero CTA visible
9. Signed-in: greeting, next-visit peek, quick actions render
10. Safe-area / notch / keyboard — no overlap

## 3. Booking (`app/booking.tsx`) — 4-step form
11. Step 1-4 progress bar advances, back works
12. Inline validation — chips, errors, haptics on error/success
13. Pincode — format check `isValidPincode` (6 digits)
14. Hospital field — free-text submit creates booking (autocomplete deferred)
15. Submit — writes `patients → locations → bookings` in Supabase (verify in dashboard)
16. Success state → My Bookings shows new booking

## 4. My Bookings (`app/my-bookings.tsx`)
17. Upcoming / Past tabs switch, pull-to-refresh
18. Live meter renders for active booking
19. Cancel — `cancel_booking` RPC updates status, StatusPill color correct
20. Track button — navigates with token

## 5. Tracking (`app/tracking.tsx`)
21. Headline + companion card render
22. Polls `get_shared_tracking` every ~10s — status updates
23. "Open in Maps" deep-link works (fallback to address when lat/lng null)
24. Native Share works

## 6. Quick Help (urgent wizard)
25. 3-step wizard + progress, chips render
26. `checkPincodeServed` result shown correctly
27. WhatsApp CTA opens with prefill

## 7. Profile (`app/profile.tsx`)
28. Account info, activity links, Help & Support render
29. "Edit" routes to WhatsApp (same as web)
30. Sign out works from here

## 8. Care / Guides (`app/care/*`)
31. List (`app/care/index.tsx`) — plain cards load from `@caresy/utils/careGuides`
32. Detail (`app/care/[slug].tsx`) — content renders, back nav works

## 9. Cross-cutting native UX
33. Haptics fire (Button, Chip, errors)
34. Keyboard — `FormScreen` avoids overlap on all forms
35. Safe-area on all screens (iOS notch, Android nav bar)
36. Offline — airplane mode shows ErrorState, retry works
37. Accessibility — VoiceOver/TalkBack labels via design system components
38. No console redbox on any screen

## 10. Sign-off
39. Repeat 5-38 on second platform (if you started on Android, do iOS)
40. Log deferred/store blockers found → file issues for: served-area enforcement, hospital autocomplete, map picker, reschedule, embedded map, notifications, doc upload, account deletion, Sign in with Apple
