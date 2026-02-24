# AT Thrill App

Premium ecommerce webapp for **Arewa Tasty Thrill** built with Next.js App Router + TypeScript.

## Stack
- Next.js (App Router) + TypeScript
- TailwindCSS + shadcn-style UI primitives
- Postgres + Kysely + SQL migrations
- Auth adapter layer (`supabase` or `nextauth`)
- Zustand + React Hook Form + Zod
- Payments adapter layer (Paystack primary; Stripe/PayPal/Flutterwave available)
- Supabase CLI for local Postgres/auth/storage

## Features
- Guest-first purchase flow (no login required)
- Optional sign-in for order tracking, saved addresses, and reorder support
- Product catalog, cart, checkout, payment redirect
- Secure webhook handling with signature verification + idempotency
- Order lookup by `order_code + email/phone`
- Guest order claim flow after sign-in with verified email
- Admin dashboard with server-side role authz (`superadmin`/`admin`/`staff`) plus optional `ADMIN_EMAILS` fallback
- Role-based backoffice access (`superadmin`, `admin`, `staff`) with invite-only onboarding
- Products/categories/orders/zones/events/CMS admin modules
- SEO metadata, sitemap, robots, responsive image-heavy premium UI
- Light mode default with premium opt-in dark mode toggle

## Theme System
- Light mode remains the default visual theme.
- Dark mode is opt-in via the top navigation toggle and persists in `localStorage` (`theme=light|dark`).
- If no stored preference exists, system color preference is used for first-time visits only.
- No first-paint theme flash: root layout runs an inline pre-hydration script to set `<html class="dark">` early.
- Theme tokens live in `src/app/globals.css`:
  - Light tokens in `:root` (unchanged).
  - Dark tokens in `.dark`.
- Core theme runtime is implemented in:
  - `src/components/theme/theme-provider.tsx`
  - `src/components/theme/theme-toggle.tsx`
- To retune colors, update only CSS variables in `src/app/globals.css` rather than hardcoding component colors.

## Error Handling & Message Patterns
- Shared copy lives in `src/lib/messages.ts`.
- Shared error contracts and mapping live in:
  - `src/lib/errors.ts`
  - `src/lib/errorMapper.ts`
  - `src/lib/http/client.ts`
- Server routes return safe user-facing messages (no raw stack traces), while logging structured context through `src/lib/logger.ts`.
- Feedback UI patterns:
  - Inline blocking notices: `src/components/feedback/inline-notice.tsx`
  - Empty states: `src/components/feedback/empty-state.tsx`
  - Loading states: `src/components/feedback/loading-state.tsx`
  - Retry actions: `src/components/feedback/retry-button.tsx`
  - Transient toasts: `src/components/feedback/toast-provider.tsx`

## Project Structure
- `src/auth`: provider-agnostic auth interface + adapters
- `src/storage`: storage interface + Supabase/local providers
- `src/payments`: payment provider abstraction + implementations
- `src/server`: business logic (orders, analytics, notifications, identity)
- `src/app`: pages + API route handlers
- `migrations`: plain SQL migrations compatible with any Postgres
- `scripts`: migrate/seed and image mapping

## Prerequisites
- Node.js 22+
- Docker
- Supabase CLI
- pnpm (recommended)

If pnpm is not installed:
```bash
npm i -g pnpm
```

## Environment
Copy and edit:
```bash
cp .env.example .env.local
```

Required minimum for local app startup:
- `APP_BASE_URL`
- `DATABASE_URL`
- `AUTH_PROVIDER`
- `ADMIN_EMAILS`

Connection pool tuning (important for Vercel/serverless):
- `DB_POOL_MAX` (recommended `1` on Vercel)
- `DB_POOL_IDLE_TIMEOUT_MS` (recommended `5000` on Vercel)
- `DB_POOL_CONNECTION_TIMEOUT_MS` (recommended `10000`)
- `DB_POOL_MAX_USES` (recommended `7500`)

Backoffice bootstrap/invite vars:
- `SUPERADMIN_EMAIL` (recommended)
- `SUPERADMIN_INITIAL_PASSWORD` (for NextAuth bootstrap)
- `SUPERADMIN_NAME` (defaults to `AT Thrill Superadmin`)
- `BACKOFFICE_INVITE_TTL_HOURS` (default `72`)
- `ENABLE_ADMIN_EMAILS_FALLBACK` (default `true`)
- `BACKOFFICE_INVITE_FROM` (optional override for invite sender; falls back to `EMAIL_FROM`)

## Local Setup (Supabase CLI + SQL migrations)
1. Start Supabase local services:
```bash
pnpm supabase:start
```
2. Confirm local DB URL in `.env.local` (default from this repo):
`postgresql://postgres:postgres@127.0.0.1:54322/postgres`
3. Run migrations:
```bash
pnpm db:migrate
```
4. Seed initial catalog, Lagos zones, CMS pages:
```bash
pnpm db:seed
```
This also seeds/updates the default superadmin when `SUPERADMIN_EMAIL` is configured.
5. Run app:
```bash
pnpm dev
```

## Auth Setup
### Supabase Auth
- Set:
  - `AUTH_PROVIDER=supabase`
  - `NEXT_PUBLIC_AUTH_PROVIDER=supabase`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- In Supabase auth settings, configure redirect URLs:
  - `http://localhost:3000/auth/callback`

### NextAuth (Provider B)
- Set:
  - `AUTH_PROVIDER=nextauth`
  - `NEXT_PUBLIC_AUTH_PROVIDER=nextauth`
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
- Optional Google OAuth:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Credentials auth uses `user_credentials` table with bcrypt hash.

### Switching Providers
Change only:
- `AUTH_PROVIDER=supabase|nextauth`
- `NEXT_PUBLIC_AUTH_PROVIDER=supabase|nextauth`

Business logic still uses `src/auth` interface.

## Payments
Primary provider:
- `PRIMARY_PAYMENT_PROVIDER=paystack`

Enable list:
- `ENABLED_PAYMENT_PROVIDERS=paystack,stripe,paypal,flutterwave`
- `SHOW_PAYPAL_ALWAYS=false` (set `true` to always show PayPal on checkout)

Checkout payment intent contract:
- Frontend sends `paymentMethod` only: `pay_online | paypal`.
- `pay_online` is routed server-side to an enabled card gateway (`paystack|flutterwave|stripe`) using `PRIMARY_PAYMENT_PROVIDER` as first preference.
- `paypal` is routed server-side to PayPal.
- Backward compatibility: API still accepts legacy `card` and normalizes it to `pay_online`.
- PayPal option visibility in checkout:
  - shown when quote currency is non-`NGN`, or
  - when `SHOW_PAYPAL_ALWAYS=true`.

Provider secrets:
- Paystack: `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET` (optional client key for inline flows: `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`)
- Flutterwave: `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`

If a provider secret is missing, checkout falls back to a safe local mock redirect for development.

## Webhook Testing (Tunnel-Based)
1. Expose local server:
```bash
npx localtunnel --port 3000
```
or
```bash
ngrok http 3000
```
2. Configure provider webhook URL(s), for example:
- `https://your-tunnel-url/api/webhooks/paystack`
- `https://your-tunnel-url/api/webhooks/flutterwave`
- `https://your-tunnel-url/api/webhooks/stripe`
- `https://your-tunnel-url/api/webhooks/paypal`
3. Replay/send provider test events.
4. Confirm:
- `webhook_events` has unique event id entry
- `payments.status` changed
- `orders.status=paid` on success

## Scripts
```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm supabase:start
pnpm db:migrate
pnpm db:seed
```

## Admin Access
Set allowlist emails in `ADMIN_EMAILS`:
```env
ADMIN_EMAILS=owner@atthrill.ng,ops@atthrill.ng
```
Admin routes are enforced server-side in `/admin` and `/api/admin/*`.

Role model:
- `superadmin`: full access + backoffice user/invite management
- `admin`: catalog, zones, CMS, orders/events operations
- `staff`: orders/events operations

Backoffice onboarding:
- Backoffice users should be invited by a `superadmin` from `/admin/backoffice`.
- Invite accept page: `/backoffice/invite/accept?token=...`
- Invite acceptance currently requires `AUTH_PROVIDER=nextauth`.
- `/auth/register` remains for customers, but blocks emails with pending backoffice invites.

Compatibility rollout:
- `ENABLE_ADMIN_EMAILS_FALLBACK=true` keeps legacy `ADMIN_EMAILS` access active while migrating to role records.

## Production Notes
- App DB is standard Postgres via `DATABASE_URL` (not tied to Supabase in production).
- Orders/payments are stored in app DB independent of auth provider DB features.
- Keep secrets in env vars only.
- Configure secure webhook secrets in production.
- If you are using Supabase pooling on Vercel, use the **transaction pooler URL** (port `6543`), not session mode (`5432`).
- For Vercel + Supabase, set:
  - `DB_POOL_MAX=1`
  - `DB_POOL_IDLE_TIMEOUT_MS=5000`
  - `DB_POOL_CONNECTION_TIMEOUT_MS=10000`

## QA Checklist
- Guest checkout succeeds without login
- `order_code + email/phone` lookup works
- Paid webhook transitions order to `paid` exactly once
- Switching `AUTH_PROVIDER` does not break purchasing
- Admin routes enforce role-based access and reject unauthorized users
- Claim flow links guest orders by verified email
