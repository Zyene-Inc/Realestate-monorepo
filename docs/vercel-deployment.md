# Vercel deployment

## Architecture decision

Keep the backend functionality. Authentication administration, role enforcement, agent approvals, audit logging, database writes, Resend delivery, and future Stripe webhooks require trusted server-side code. The existing NestJS application can run on Vercel as one serverless function, so a separately managed long-running server is not required.

Deploy this repository as two Vercel projects:

1. `coach-johnson-realty-api` with Root Directory set to `backend`.
2. `coach-johnson-realty-web` with Root Directory set to `frontend`.

Deploy the API first so its production URL can be supplied to the web project. A custom API domain such as `api.coachjohnsonrealty.com` is recommended but not required.

## API project

Use the NestJS framework preset. Vercel recognizes `src/main.ts`; the application uses Vercel's `PORT` automatically.

- Install command: `npm ci`
- Build command: `npm run build`
- Root directory: `backend`
- Health check after deployment: `https://<api-host>/api/health`

Configure these production environment variables in Vercel:

- `DATABASE_URL`: Supabase **Transaction pooler** connection string from **Connect**, using port `6543`. Use the copied value rather than constructing it manually.
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`: server-only; never use a `NEXT_PUBLIC_` prefix.
- `FRONTEND_URL`: exact production web origin, for example `https://coachjohnsonrealty.com`.
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

Do not set `NEXT_PUBLIC_API_URL` in Vercel. The browser calls same-origin `/api`, and the Next.js rewrite proxies those requests to `BACKEND_URL`. This avoids exposing a second API origin to browser code and also works with authenticated requests.

## Supabase and Resend dashboard settings

In Supabase Auth URL Configuration:

- Set **Site URL** to the production web origin.
- Add the production callback URLs used by `/agent/status` and `/auth/reset-password`.
- Add preview callback patterns only if preview deployments must support authentication.

The Resend sender domain `coachjohnsonrealty.com` must remain verified. Keep the Resend key only in the API project's Vercel environment variables.

## Vercel constraints applied

- NestJS runs request-by-request as a Vercel Function; no always-running process is assumed.
- The health endpoint verifies the Supabase database connection.
- Proxied uploads are capped at 4 MB to remain below Vercel's 4.5 MB request limit. Larger files should use direct-to-object-storage signed uploads.
- The project does not depend on WebSockets or in-process background workers. Use Supabase Realtime for live updates and Supabase Cron/Queues or Vercel Cron for scheduled work.
- In-memory throttling is only instance-local on serverless infrastructure. Configure production abuse protection in Vercel Firewall before launch.

## Deployment verification

1. Open `/api/health` and confirm `database: connected`.
2. Test sign-up, email verification, sign-in, sign-out, and session persistence.
3. Test password reset and confirm the message appears in the Resend dashboard.
4. Test agent approval and decline using authorized sales-admin accounts.
5. Confirm tenant users cannot reach admin APIs and agent users cannot access unapproved routes.
6. Check Vercel Function logs for database connection, timeout, and payload errors.
