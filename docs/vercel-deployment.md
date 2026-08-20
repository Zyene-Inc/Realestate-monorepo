# Vercel deployment

## Architecture decision

Keep the backend functionality. Authentication administration, role enforcement, agent approvals, audit logging, database writes, Resend delivery, and future Stripe webhooks require trusted server-side code. The existing NestJS application can run on Vercel as one serverless function, so a separately managed long-running server is not required.

Deploy this repository as two Vercel projects:

1. `coach-johnson-realty-api` with Root Directory set to `backend`.
2. `coach-johnson-realty-web` with Root Directory set to `frontend`.

Deploy the API first so its production URL can be supplied to the web project. A custom API domain such as `api.coachjohnsonrealty.com` is recommended but not required.

Current production deployments:

- API: `https://coach-johnson-realty-api-nu.vercel.app`
- Web: `https://coach-johnson-realty-web-sigma.vercel.app`

The web alias is the active canonical origin until `coachjohnsonrealty.com` is owned or DNS-verified in the Vercel team. Production Supabase callbacks and portal URL variables currently use that working alias. After domain verification, change them to the target hostname map below and redeploy both projects.

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

- `DATABASE_URL`: Supabase **Transaction pooler** connection string from **Connect**, using port `6543`. Use the copied value rather than constructing it manually.
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
- Storage and Stripe variables when those modules are enabled.

Do not run Prisma migrations as part of every Vercel build. Apply reviewed migrations to Supabase separately, then deploy the generated application code.

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

Assign all six domains in the **Domains** settings of the same web project after the apex domain is owned or DNS-verified in the Vercel team. As of August 20, 2026, Vercel rejects the assignment with `domain_not_owned` and public DNS has no A/CNAME records for these hosts. Configure the apex domain using the exact record Vercel displays. Configure each subdomain with the exact CNAME target Vercel displays:

- `agents`
- `properties-admin`
- `rental-admin`
- `tenant`
- `admin`

Do not copy a CNAME target from another project. Vercel can provide a project-specific target. A wildcard is unnecessary because the portal list is fixed; explicit domains reduce accidental exposure.

## Supabase and Resend dashboard settings

Current Supabase Auth URL Configuration:

- **Site URL**: `https://coach-johnson-realty-web-sigma.vercel.app`
- Allowed redirects:
  - `https://coach-johnson-realty-web-sigma.vercel.app/agent/status`
  - `https://coach-johnson-realty-web-sigma.vercel.app/auth/reset-password`
  - `http://localhost:3000/auth/reset-password`

After the custom-domain cutover:

- Set **Site URL** to `https://coachjohnsonrealty.com`.
- Add these exact production redirect URLs:
  - `https://agents.coachjohnsonrealty.com/agent/status`
  - `https://coachjohnsonrealty.com/auth/reset-password`
  - `https://agents.coachjohnsonrealty.com/auth/reset-password`
  - `https://properties-admin.coachjohnsonrealty.com/auth/reset-password`
  - `https://rental-admin.coachjohnsonrealty.com/auth/reset-password`
  - `https://tenant.coachjohnsonrealty.com/auth/reset-password`
  - `https://admin.coachjohnsonrealty.com/auth/reset-password`
- Add preview callback patterns only if preview deployments must support authentication.

The browser client stores the Supabase session in chunked secure cookies scoped to `.coachjohnsonrealty.com`. This permits a role redirect between these controlled subdomains without exposing the secret/service-role key. Keep every subdomain on Johnson Realty-controlled deployments; a compromised subdomain would share the parent-domain session boundary.

The Resend sender domain `coachjohnsonrealty.com` is verified and must remain verified. Keep the Resend key only in the API project's Vercel environment variables. On August 20, 2026, the official deterministic delivery address reached `delivered` state from the production sender. A separate message to `admin@coachjohnsonrealty.com` was `suppressed`; confirm that mailbox exists and clear its Resend suppression before relying on it as an operational reviewer inbox.

## Vercel constraints applied

- NestJS runs request-by-request as a Vercel Function; no always-running process is assumed.
- The health endpoint verifies the Supabase database connection.
- Proxied uploads are capped at 4 MB to remain below Vercel's 4.5 MB request limit. Larger files should use direct-to-object-storage signed uploads.
- The project does not depend on WebSockets or in-process background workers. Use Supabase Realtime for live updates and Supabase Cron/Queues or Vercel Cron for scheduled work.
- In-memory throttling is only instance-local on serverless infrastructure. Configure production abuse protection in Vercel Firewall before launch.

## Deployment verification

Phase 2 production verification completed on August 20, 2026 and was rerun after the fresh Git-connected Vercel deployment: API health returned `database: connected`; the web `/api` rewrite passed; session retrieval and sign-out passed; password reset passed; and the pending → decline → edit → resubmit → approve workflow passed against the production API with the exact expected audit sequence. Verification, decline, resubmission, reviewer, approval, and password-reset messages all reached Resend's deterministic `delivered` state. Test identities and database audit rows were removed afterward.

1. Open `/api/health` and confirm `database: connected`.
2. Test sign-up, email verification, sign-in, sign-out, and session persistence across the six domains.
3. Test password reset and confirm the message appears in the Resend dashboard.
4. Test agent approval and decline using authorized sales-admin accounts.
5. Confirm every role lands on its canonical domain after sign-in.
6. Confirm the public domain redirects portal paths and each portal rejects routes belonging to another portal.
7. Confirm tenant users cannot reach admin APIs and agent users cannot access unapproved routes.
8. Check Vercel Function logs for database connection, timeout, and payload errors.
