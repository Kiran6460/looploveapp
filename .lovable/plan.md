# Verification & Safety Upgrade

Email OTP verification already exists for signup (prior turn). This plan focuses on the new pieces: live selfie verification, status system, gated access, and admin review. Duplicate-account prevention, report/block, and suspended-profile filtering are already in place from earlier work.

## 1. Database (single migration)

Extend `profiles`:
- `verification_status` text — `'unverified' | 'pending' | 'verified' | 'rejected'`, default `'unverified'`
- `verification_selfie_url` text — path in `avatars` bucket
- `verification_submitted_at` timestamptz
- `verification_reviewed_at` timestamptz
- `verification_rejection_reason` text
- `liveness_score` numeric — 0–1 confidence from on-device checks

New table `verification_reviews` (admin audit log): `id, profile_id, reviewer_id, action ('approve'|'reject'), reason, created_at`. RLS: only admins read/insert.

New `user_roles` table + `app_role` enum (`admin`, `user`) + `has_role(uid, role)` security-definer function — following the user-roles best practice. Used to gate admin routes.

RLS updates:
- `swipes insert`: add `WITH CHECK ... AND (SELECT verification_status FROM profiles WHERE id = auth.uid()) = 'verified'`
- `messages insert`: same gate on sender
- `profiles update`: prevent users from self-updating `verification_status` (only service_role / admin)

## 2. Live selfie verification (client)

New route `/verify` (under `_authenticated` semantics — gated in router):
- Uses `getUserMedia({ video: { facingMode: 'user' } })` with front camera.
- Loads `@vladmandic/face-api` (lighter, browser-friendly fork of face-api.js) with tiny face detector + landmarks + expression models, served from `/public/models/`.
- Three sequential challenges with progress UI:
  1. **Blink** — detect Eye Aspect Ratio drop below threshold then recover.
  2. **Turn head** — detect yaw change >15° (left or right) from landmark geometry.
  3. **Smile** — expression model confidence `happy > 0.7`.
- Each challenge must complete within 20s; failures allow retry.
- On success, capture a single frame (JPEG, ~640px), upload to `avatars/verification/{userId}-{ts}.jpg`, then call server fn `submitVerification({ photoPath, livenessScore })`.
- Anti-spoof guardrails (client, defense-in-depth):
  - Must be a live `MediaStream` (no file upload path exposed).
  - Require all 3 challenges in randomized order each session.
  - Detect static feed: require >N frames with landmark micro-motion variance above threshold.
  - Single face only; reject if multiple faces detected.

## 3. Server functions (`src/lib/verification.functions.ts`)

- `submitVerification` (auth): validates input, sets `verification_status='pending'`, stores selfie path + liveness score + timestamp.
- `getMyVerification` (auth): returns current user's status for UI.
- Admin-only (checks `has_role(uid,'admin')` via `supabaseAdmin`):
  - `listPendingVerifications`
  - `reviewVerification({ profileId, action, reason? })` — updates status, writes `verification_reviews` row, sets reviewed timestamp.

## 4. Gating

- `_authenticated` layout (or `index`, `matches`, `chat.$matchId`) `beforeLoad`: fetch profile; if `verification_status !== 'verified'`, redirect to `/verify`.
- `/verify` shows current status: pending → "Under review" screen with selfie preview; rejected → reason + "Try again" button that resets status to unverified.

## 5. Verified badge

- `BlueVerifiedBadge` component (Lucide `BadgeCheck` in primary color).
- Render on swipe card, match list, chat header, and own profile when `verification_status='verified'`.

## 6. Admin panel

New routes under `/admin/*`, gated by `has_role(uid,'admin')`:
- `/admin/verifications` — queue of pending submissions: selfie thumbnail, profile name/age, liveness score, Approve / Reject (with reason) buttons.
- Empty state when queue is clear.
- Bootstrapping: document how to grant admin role via SQL (`INSERT INTO user_roles (user_id, role) VALUES ('<uid>', 'admin')`); no self-service.

## 7. UI polish (Tinder/Bumble-style)

- Full-screen camera with rounded oval mask overlay.
- Instruction card at top, animated icon for current challenge.
- Progress dots (1/3, 2/3, 3/3) with success checkmarks.
- Haptic-style scale animations via Framer Motion on challenge success.
- Mobile-first: 100dvh, safe-area insets, large tap targets.

## Files to add/change

- `supabase/migrations/<ts>_verification.sql` (new)
- `src/lib/verification.functions.ts` (new)
- `src/lib/admin.functions.ts` (new) — admin role check helper + queue fns
- `src/routes/verify.tsx` (new) — camera + liveness flow
- `src/routes/admin.verifications.tsx` (new)
- `src/components/VerifiedBadge.tsx` (new)
- `src/components/SwipeDeck.tsx` — show badge
- `src/routes/matches.tsx`, `src/routes/chat.$matchId.tsx` — show badge
- `src/routes/index.tsx` — beforeLoad gate
- `src/routes/settings.tsx` — show verification status, "Verify now" CTA
- `public/models/*` — face-api tiny model weights (~2MB, downloaded once)
- `package.json` — add `@vladmandic/face-api`

## Technical notes

- Liveness is **on-device**; we trust client only to the extent that we store the score and a still photo, then **require human admin review** before granting verified status. This is the same pattern Tinder/Bumble use (auto-screen + human review).
- Models are loaded lazily only on `/verify` to keep main bundle small.
- All selfie uploads stored privately in `avatars/verification/` with RLS: only owner reads own, admins read all.
- HTTPS required for `getUserMedia` — preview/published URLs already serve over HTTPS.
- No payment, no push notifications, no new external services required.

Ready to implement on approval.