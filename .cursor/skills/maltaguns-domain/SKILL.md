---
name: maltaguns-domain
description: MaltaGuns marketplace domain knowledge for Didit KYC identity verification, seller eligibility, admin impersonation, Supabase auth patterns, and project conventions. Use when working on profile verification, seller status, marketplace listings, admin tools, webhooks, or MaltaGuns-specific business rules.
---

# MaltaGuns Domain

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind 3, Radix/shadcn UI
- Supabase Auth + Postgres via `@supabase/ssr` and `@supabase/supabase-js`
- Didit for identity verification (full-page redirect, not iframe SDK)
- Vercel deployment with cron in `vercel.json`
- Builds use `--webpack` (custom webpack config in `next.config.js`)

## Project Conventions

- Do not add tests unless explicitly requested (`.cursor/rules/no-tests.mdc`)
- Do not add code comments unless explicitly requested (`.cursor/rules/no-comments.mdc`)
- Supabase client split: `lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `public.ts`
- Admin routes under `app/admin/`; profile under `app/profile/`

## Identity Verification (Didit)

Key files:

- `lib/didit.ts` — API client, webhook signature verification, session statuses, profile update builder
- `lib/sync-identity-verification.ts` — sync profile from Didit session/decision
- `lib/identity-status.ts` — status sets, admin override helpers
- `components/profile/IdentityVerification.tsx` — user-facing verification UI
- `app/api/verification/session/route.ts` — create/resume Didit session
- `app/api/verification/status/route.ts` — poll/sync status
- `app/api/webhooks/didit/route.ts` — webhook handler with signature verification and deduplication
- `app/verification/complete/page.tsx` — post-verification redirect landing

### Session statuses

`Not Started`, `In Progress`, `Awaiting User`, `In Review`, `Approved`, `Declined`, `Resubmitted`, `Abandoned`, `Expired`, `Kyc Expired`

Pending (block re-verify): `In Review`, `In Progress`, `Awaiting User`

Terminal (stop sync): `Approved`, `Declined`, `Expired`, `Kyc Expired`, `Abandoned`

### Flow

1. User starts verification → session created via Didit API, stored on profile (`didit_session_id`, `didit_session_url`)
2. User completes on Didit hosted page → redirected to `/verification/complete`
3. Webhook at `/api/webhooks/didit` updates profile; dedupe via event ID
4. Client/admin can also sync via `syncProfileIdentityFromDidit()` when session is non-terminal and not yet verified

### Admin identity override

Admins can verify identity without Didit via `buildAdminIdentityOverride()` in `lib/identity-status.ts`. Override profiles carry `ADMIN_IDENTITY_OVERRIDE_NOTE` in `identity_review_notes`. Detect overrides with `isAdminIdentityOverride()`.

### Webhook security

Always verify signatures in `verifyDiditWebhookSignature()`. Reject malformed JSON (400), invalid signature (401). Use `supabaseAdmin` for webhook writes. `vendor_data` must be a valid profile user UUID (`isProfileUserId()`).

## Seller Eligibility

Seller status lives in `components/profile/SellerStatus.tsx` and profile types. Selling requires:

- Identity verification (`identity_verified` + Didit `Approved` status, or admin override)
- License upload/verification for firearms sellers

Do not bypass these checks when adding listing creation flows. Marketplace create pages are under `app/marketplace/create/`.

## Admin Impersonation

- Cookie: `mg_impersonation` (8h max age) — see `lib/impersonation.ts`
- Routes: `app/api/admin/impersonate/`, `components/admin/ImpersonationBanner.tsx`
- Stores admin refresh token to restore session on stop
- Never expose impersonation state to client-side storage; use server cookies only

## Marketplace Listings

- Public listings: `listings` table, images in Supabase `listings` bucket
- Image helpers: `lib/listing-images.ts`
- Featured listings: `featured_listings` join table
- Search: `app/marketplace/search/page.tsx`, `lib/marketplace-search.ts`
- Listing expiry and feature credits managed via admin and profile APIs

## Supabase Patterns

- Use existing `supabaseAdmin` for server-side privileged ops (webhooks, cron, admin)
- Use SSR server client for authenticated user requests
- Never use `user_metadata` for authorization; use `app_metadata` or profile table fields
- Enable RLS on exposed tables; admin routes use service role carefully

## SEO

- `lib/seo.ts`, `lib/seo-jsonld.ts`, `app/sitemap.ts`, `app/robots.ts`
- Admin SEO settings: `app/admin/seo/page.tsx`

## When Changing Identity or Seller Flows

1. Read `lib/didit.ts` and `lib/identity-status.ts` before editing status logic
2. Keep webhook handler idempotent (dedupe table, `shouldApplyWebhookForSession`)
3. Update both webhook path and client sync path if status mapping changes
4. Test admin override separately from Didit-approved path
5. Preserve redirect to profile after auto-approved verifications
