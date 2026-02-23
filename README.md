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
- Admin dashboard with server-side allowlist authz (`ADMIN_EMAILS`)
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

Provider secrets:
- Paystack: `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`
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

## Production Notes
- App DB is standard Postgres via `DATABASE_URL` (not tied to Supabase in production).
- Orders/payments are stored in app DB independent of auth provider DB features.
- Keep secrets in env vars only.
- Configure secure webhook secrets in production.

## QA Checklist
- Guest checkout succeeds without login
- `order_code + email/phone` lookup works
- Paid webhook transitions order to `paid` exactly once
- Switching `AUTH_PROVIDER` does not break purchasing
- Admin routes reject non-allowlisted users
- Claim flow links guest orders by verified email
