# Vercel deployment

## Architecture decision

Keep the backend functionality. Authentication administration, role enforcement, agent approvals, audit logging, database writes, Resend delivery, and future Stripe webhooks require trusted server-side code. The existing NestJS application can run on Vercel as one serverless function, so a separately managed long-running server is not required.

Deploy this repository as two Vercel projects:

1. `coach-johnson-realty-api` with Root Directory set to `backend`.
2. `coach-johnson-realty-web` with Root Directory set to `frontend`.

Deploy the API first so its production URL can be supplied to the web project. A custom API domain such as `api.coachjohnsonrealty.com` is recommended but not required.

Current production deployments:

- API: `https://coach-johnson-realty-api-nu.vercel.app`
- Canonical web: `https://coachjohnsonrealty.com`
- Web support fallback: `https://coach-johnson-realty-web-sigma.vercel.app`

The apex domain and all five explicit portal subdomains are assigned to the web project's Production environment. Cloudflare uses DNS-only CNAME records to the project-specific Vercel target; Vercel reports valid configuration and issued TLS for all six hosts. Production portal variables and Supabase callbacks use the custom-domain map below.

The web project serves one public site and five role-specific portals from the same production deployment:

| Domain | Surface | Required role |
|---|---|---|
| `coachjohnsonrealty.com` | Public corporate site, sale listings, and rentals | Public |
| `agents.coachjohnsonrealty.com` | Agent/sub-company workspace | `AGENT` |
| `properties-admin.coachjohnsonrealty.com` | Buy/Sell administration | `SALES_ADMIN` |
| `rental-admin.coachjohnsonrealty.com` | Rental and lease administration | `TENANT_ADMIN` |
| `tenant.coachjohnsonrealty.com` | Tenant portal | `TENANT` |
| `admin.coachjohnsonrealty.com` | Cross-vertical main administration | `SUPER_ADMIN` |

Next.js Proxy isolates each hostname and sends portal routes to their canonical domain. This is navigation isolation only; NestJS JWT and role guards remain the authorization boundary.

## API project

Use the NestJS framework preset. Vercel recognizes `src/main.ts`; the application uses Vercel's `PORT` automatically.

Use Node.js `22.x`, as pinned in `backend/package.json`.

- Install command: `npm ci`
- Build command: `npm run build`
- Root directory: `backend`
- Health check after deployment: `https://<api-host>/api/health`

Configure these production environment variables in Vercel:

- `DATABASE_URL`: Supabase **Session pooler** connection string from **Connect**, using port `5432`, with `connection_limit=3`, `pool_timeout=30`, and TLS required. The Phase 11 20-way reliability gate verified this bounded configuration against the current 15-session pool. Do not use Prisma's unbounded default in Vercel.
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`: server-only; never use a `NEXT_PUBLIC_` prefix.
- `FRONTEND_URL`: local-development/backward-compatible fallback.
- `PUBLIC_SITE_URL`: `https://coachjohnsonrealty.com`.
- `AGENT_PORTAL_URL`: `https://agents.coachjohnsonrealty.com`.
- `PROPERTIES_ADMIN_URL`: `https://properties-admin.coachjohnsonrealty.com`.
- `RENTAL_ADMIN_URL`: `https://rental-admin.coachjohnsonrealty.com`.
- `TENANT_PORTAL_URL`: `https://tenant.coachjohnsonrealty.com`.
- `SUPER_ADMIN_URL`: `https://admin.coachjohnsonrealty.com`.
- `CORS_ORIGINS`: comma-separated list of the six production origins. Add an exact preview origin only when it needs direct API access.
- `RESEND_API_KEY`: server-only.
- `RESEND_FROM_EMAIL`: `Coach Johnson Realty <noreply@coachjohnsonrealty.com>`.
- `RESEND_WEBHOOK_SECRET`: server-only Resend endpoint signing secret.
- `CRON_SECRET`: server-only random secret shared with the Supabase Vault entry `email_retry_cron_secret`.
- `ESIGNATURES_ENABLED`: set to `true` only after the Verdocs API key, webhook, and legal-approved templates are ready.
- `VERDOCS_API_BASE_URL`: `https://api.verdocs.com`.
- `VERDOCS_CLIENT_ID`: server-only Verdocs API client ID.
- `VERDOCS_CLIENT_SECRET`: server-only Verdocs API client secret.
- `VERDOCS_WEBHOOK_SECRET`: server-only HMAC secret shown when Verdocs webhooks are configured.
- `VERDOCS_LEASE_TEMPLATE_ID`: UUID of the legal-approved residential lease template.
- `VERDOCS_DISCLOSURE_TEMPLATE_ID`: UUID of the legal-approved disclosure template.
- `VERDOCS_AGREEMENT_TEMPLATE_ID`: UUID of the legal-approved agent/company agreement template.
- `VERDOCS_SENDER_NAME`: `Coach Johnson Realty`.
- `VERDOCS_SENDER_EMAIL`: `noreply@coachjohnsonrealty.com` (used in the envelope UI/certificate; Verdocs still sends notifications from its own delivery domain).
- `CHATBOT_ENABLED`: keep `false` until the chatbot migration and key are present; then set `true`.
- `OPENROUTER_API_KEY`: server-only OpenRouter key. Never add this to the web project or use a `NEXT_PUBLIC_` prefix.
- `CHATBOT_FINGERPRINT_SECRET`: server-only random value of at least 32 characters, generated independently from every other secret (for example, `openssl rand -hex 32`).
- `STRIPE_RENT_PAYMENTS_ENABLED`: set to `true` only after the reviewed rental-payment migration and Stripe webhook are live; otherwise keep `false`.
- `STRIPE_SECRET_KEY`: sensitive server-only restricted live Stripe key (`rk_live_` preferred). Never expose this to the web project.
- `STRIPE_WEBHOOK_SECRET`: sensitive server-only `whsec_` value for `/api/stripe/webhook`.
- `STRIPE_CONNECT_WEBHOOK_SECRET`: sensitive server-only `whsec_` value for `/api/stripe/connect-webhook`; never reuse the Snapshot destination secret.

Do not run Prisma migrations as part of every Vercel build. Apply reviewed migrations to Supabase separately, then deploy the generated application code.

### Rental payments and owner payouts

The rent flow is tenant-initiated only: the portal creates a one-time Stripe-hosted Checkout Session after a tenant explicitly clicks pay. It does not store a payment method or create a subscription/off-session debit. A destination charge automatically places owner proceeds in the owner’s Stripe Connect balance while Johnson Realty retains the owner-specific management commission. Configure the Snapshot payment destination at `https://coach-johnson-realty-api-nu.vercel.app/api/stripe/webhook` and the separate Accounts v2 Thin capability destination at `https://coach-johnson-realty-api-nu.vercel.app/api/stripe/connect-webhook`, as documented in [Stripe rental payments](stripe-rental-payments.md). Apply `20260823183000_add_tenant_initiated_stripe_rent_payments.sql` before setting the feature flag to `true`.

### Public chatbot activation

The chatbot implementation is disabled safely when its feature flag or OpenRouter key is absent. To activate it:

1. Review and apply `20260823164507_add_public_chatbot.sql` to Supabase through the migration integration.
2. Confirm RLS is enabled and `anon`/`authenticated` have no direct privileges on `ChatConversation` or `ChatMessage`; confirm the daily expired-conversation cron exists.
3. Add `OPENROUTER_API_KEY` and a unique `CHATBOT_FINGERPRINT_SECRET` to the API project's encrypted Production environment, then set `CHATBOT_ENABLED=true`.
4. Redeploy the API first and the web project second. The web project requires no AI secret and continues using the same-origin `/api` rewrite.
5. Verify `/api/public/chatbot/status`, one streamed reply, browser refresh history, a public property link, the `/contact` fallback, and absence of the widget on every role portal.

The implementation pins the router ID to `openrouter/free`; it cannot be changed through environment configuration to a paid model. Database-backed limits allow 12 visitor messages and 45 total messages per UTC day, preserving headroom under the base free-account quota. NestJS also permits at most five message starts per minute per caller.

## Web project

Use the Next.js framework preset.

- Install command: `npm ci`
- Build command: `npm run build`
- Root directory: `frontend`

Configure these production environment variables:

- `BACKEND_URL`: API project origin only, without `/api` and without a trailing slash.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ROOT_DOMAIN`: `coachjohnsonrealty.com`.
- `NEXT_PUBLIC_SITE_URL`: `https://coachjohnsonrealty.com`.
- `NEXT_PUBLIC_AGENT_PORTAL_URL`: `https://agents.coachjohnsonrealty.com`.
- `NEXT_PUBLIC_PROPERTIES_ADMIN_URL`: `https://properties-admin.coachjohnsonrealty.com`.
- `NEXT_PUBLIC_RENTAL_ADMIN_URL`: `https://rental-admin.coachjohnsonrealty.com`.
- `NEXT_PUBLIC_TENANT_PORTAL_URL`: `https://tenant.coachjohnsonrealty.com`.
- `NEXT_PUBLIC_SUPER_ADMIN_URL`: `https://admin.coachjohnsonrealty.com`.

Do not set `NEXT_PUBLIC_API_URL` in Vercel. The browser calls same-origin `/api`, and the Next.js rewrite proxies those requests to `BACKEND_URL`. This avoids exposing a second API origin to browser code and also works with authenticated requests.

## Vercel domains and DNS

All six domains are assigned to the same web project and verified in production. If DNS is ever recreated, configure the apex using the exact record Vercel displays and configure each subdomain with the project-specific CNAME target Vercel displays:

- `agents`
- `properties-admin`
- `rental-admin`
- `tenant`
- `admin`

Do not copy a CNAME target from another project. Vercel can provide a project-specific target. A wildcard is unnecessary because the portal list is fixed; explicit domains reduce accidental exposure.

## Supabase and Resend dashboard settings

Current Supabase Auth URL Configuration:

- **Site URL**: `https://coachjohnsonrealty.com`.
- Exact production redirect URLs:
  - `https://agents.coachjohnsonrealty.com/agent/status`
  - `https://coachjohnsonrealty.com/auth/reset-password`
  - `https://agents.coachjohnsonrealty.com/auth/reset-password`
  - `https://properties-admin.coachjohnsonrealty.com/auth/reset-password`
  - `https://rental-admin.coachjohnsonrealty.com/auth/reset-password`
  - `https://tenant.coachjohnsonrealty.com/auth/reset-password`
  - `https://admin.coachjohnsonrealty.com/auth/reset-password`
- Local development retains `http://localhost:3000/auth/reset-password`; the Vercel-alias callbacks remain temporarily available for support fallback access.
- Add preview callback patterns only if preview deployments must support authentication.

The browser client stores the Supabase session in chunked secure cookies scoped to `.coachjohnsonrealty.com`. This permits a role redirect between these controlled subdomains without exposing the secret/service-role key. Keep every subdomain on Johnson Realty-controlled deployments; a compromised subdomain would share the parent-domain session boundary.

The Resend sender domain `coachjohnsonrealty.com` is verified and must remain verified. Keep the API key and webhook signing secret only in the API project's encrypted Vercel environment variables. The enabled production webhook targets `https://coach-johnson-realty-api-nu.vercel.app/api/webhooks/resend`; requests are verified against the raw body and Svix signature headers before delivery state is written. On August 22, 2026, the Phase 7 deterministic delivery check recorded signed `email.sent` and `email.delivered` events and then removed its test rows. A separate earlier message to `admin@coachjohnsonrealty.com` was `suppressed`; confirm that mailbox exists and clear its Resend suppression before relying on it as an operational reviewer inbox.

## Verdocs setup

Use the Coach Johnson Realty Verdocs organization on the free plan (25 envelopes per month and up to five templates). Keep three legal-approved, sendable templates: residential lease, property disclosure, and agent/company agreement. Each Phase 9 template must contain exactly one actionable signer or approver role; the portal rejects an ambiguous template instead of sending it to the wrong person.

Create a dedicated server API key in **Settings > API Keys**. Do not use a personal username/password in the application and do not expose the client secret to Next.js. In **Settings > Webhooks**, configure:

- URL: `https://coach-johnson-realty-api-nu.vercel.app/api/webhooks/verdocs`
- Active: enabled
- Authentication: HMAC
- Events: all envelope lifecycle and recipient lifecycle events used by the portal, including created, updated, completed, canceled, expired, invited, reminded, opened, submitted, disclosure accepted, invite failed, auth failed, and declined

Store the generated HMAC secret as `VERDOCS_WEBHOOK_SECRET`. The endpoint validates the signature against the unmodified request body before it records or synchronizes anything, and duplicate provider deliveries are ignored by provider event ID.

The completed package is not considered final merely because Verdocs reports `status=complete`. The API waits for `envelope.signed=true`, downloads both the signed attachment and Verdocs certificate, verifies PDF type and size, calculates SHA-256, and archives each object in the private `signed-documents` Supabase bucket. Portal downloads are five-minute signed URLs. Never persist the recipient in-app key in browser storage or logs; the API returns it only for an authenticated, rate-limited signing session.

## Vercel constraints applied

- NestJS runs request-by-request as a Vercel Function; no always-running process is assumed.
- The health endpoint verifies the Supabase database connection.
- Proxied uploads are capped at 4 MB to remain below Vercel's 4.5 MB request limit. Larger files should use direct-to-object-storage signed uploads.
- The project does not depend on WebSockets or in-process background workers. Use Supabase Realtime for live updates and Supabase Cron/Queues or Vercel Cron for scheduled work.
- The linked Vercel team is on Hobby, whose cron interval is limited to once daily. Phase 7 critical-email retries therefore use Supabase Cron every 10 minutes to call the protected Vercel API endpoint; the shared credential is encrypted in both Supabase Vault and Vercel, never in source control.
- In-memory throttling is instance-local on serverless infrastructure. Vercel's automatic DDoS protection remains the network boundary; endpoint-specific API throttles protect signup, login, buyer inquiry, signing sessions, and webhook-adjacent paths.
- Vercel Web Analytics and Speed Insights are rendered from the root layout. API responses include `x-request-id`, and structured exception records can be correlated in Vercel Runtime Logs without logging request bodies or secrets.

## Deployment verification

Phase 2 production verification completed on August 20, 2026 and was rerun after the fresh Git-connected Vercel deployment: API health returned `database: connected`; the web `/api` rewrite passed; session retrieval and sign-out passed; password reset passed; and the pending → decline → edit → resubmit → approve workflow passed against the production API with the exact expected audit sequence. Verification, decline, resubmission, reviewer, approval, and password-reset messages all reached Resend's deterministic `delivered` state. Test identities and database audit rows were removed afterward.

The custom-domain cutover completed on August 20, 2026. Vercel reports valid configuration for the apex and five portal hosts; Cloudflare retains explicit DNS-only CNAME records for each host without modifying the existing Zoho or Resend records; TLS and HTTP checks pass on every hostname; and Supabase Auth uses the custom apex Site URL with exact agent-verification and per-portal password-reset callbacks.

1. Open `/api/health` and confirm `database: connected`.
2. Test sign-up, email verification, sign-in, sign-out, and session persistence across the six domains.
3. Test password reset and confirm the message appears in the Resend dashboard.
4. Test agent approval and decline using authorized sales-admin accounts.
5. Confirm every role lands on its canonical domain after sign-in.
6. Confirm the public domain redirects portal paths and each portal rejects routes belonging to another portal.
7. Confirm tenant users cannot reach admin APIs and agent users cannot access unapproved routes.
8. Check Vercel Function logs for database connection, timeout, and payload errors.
