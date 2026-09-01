# Coach Johnson Realty - Property Management System

A production-ready full-stack application for modern property management.

## Tech Stack

### Frontend

- **Framework**: Next.js 16+ (App Router)
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn UI / Base UI
- **State**: React Context API

### Backend

- **Framework**: NestJS
- **Database**: Supabase PostgreSQL with Prisma 6
- **Auth**: Supabase Auth sessions with NestJS role enforcement
- **Email**: Resend Integration
- **Storage**: Supabase Storage signed uploads for agent, sale-listing, rental-listing, and private maintenance files
- **Infrastructure**: Vercel deployments with Supabase-managed Auth and PostgreSQL
- **Website AI**: Groq-hosted `openai/gpt-oss-20b` replies with `meta-llama/llama-prompt-guard-2-86m` input screening; keys remain in the API project

## Getting Started

### 1. Supabase setup

This application uses the connected `coachjohnsonrealty Project` for PostgreSQL and authentication. Copy `backend/.env.example` to `backend/.env` and add the database password and server-only Supabase secret key from **Settings > API Keys**. Copy `frontend/.env.example` to `frontend/.env.local`.

The live Supabase migration history is authoritative. Baseline Prisma migrations remain in `backend/prisma/migrations`; Supabase-specific migrations live in `supabase/migrations` with matching Prisma schema migrations where applicable. [The checked-in migration ledger](docs/database-migration-ledger.json) maps the live records, locally validated pending migrations, and every known history exception explicitly; CI rejects unmapped or missing migration SQL. Future schema changes must be applied through the Supabase integration and committed alongside the matching Prisma schema change. Do not run both histories blindly against the same database or run `migration repair` without a reviewed production change.

### 2. Backend Setup

```bash
cd backend
npm install
# Configure backend/.env using .env.example
npm run start:dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Modules Implemented

- **Authentication**: Supabase Auth with role-based access control (RBAC).
- **Manual Payment Ledger**: Record rent payments, track overdue balances, and manage payment history without external processors.
- **Tenant Onboarding**: Secure invite flow with email-based activation links.
- **Maintenance Management**: Tenant submissions, private photos, admin status/cost/notes updates, and tenant completion confirmation.
- **Rental Operations**: Direct rental publishing, public rental inventory, units, tenant invitations, leases, and occupancy synchronization.
- **Tenant Messaging**: Shared Rental Admin inbox, cursor-bounded threads, replies, and read receipts.
- **File Storage**: Supabase signed uploads for private agent/maintenance files and public approved listing media.
- **Health Monitoring**: `/health` endpoint for system status.
- **Launch Hardening**: Strong/HIBP-checked passwords, expiring HttpOnly buyer access, security headers, request correlation, race-safe financial idempotency, Vercel telemetry, and CI release gates.
- **Transactional Email Operations**: Versioned Resend templates, durable delivery events, signed webhooks, bounded critical retries, and Super Admin delivery oversight.
- **Sale Commission Ledger**: Sales/Super Admin recording against sold listings, exact decimal revenue, listing-derived agent attribution, correction/void history, and bounded revenue reporting without online home-sale payments.
- **E-Signatures**: Verdocs envelope issuance for leases, disclosures, and agreements; tenant/agent embedded signing with email OTP; signed PDF/certificate archival in private Supabase Storage; and a cursor-bounded audit timeline.
- **Public Property Assistant**: Main-site-only floating chat, Groq `openai/gpt-oss-20b` streaming with Prompt Guard input screening, approved sale/published rental context, HttpOnly sessions, database-backed quotas, 30-day retention, audit events, Fair Housing safeguards, and human handoff.

## Environment Variables

Refer to `backend/.env.example` and `frontend/.env.example` for all required configuration. Supabase is the sole database and authentication provider; no local PostgreSQL container or JWT secrets are required.

## Vercel deployment

The frontend and API are deployed as two Vercel projects from this repository. `coachjohnsonrealty.com` and its five role-specific subdomains are the canonical web origins; `coach-johnson-realty-web-sigma.vercel.app` remains a support fallback, and `coach-johnson-realty-api-nu.vercel.app` serves the API. Vercel runs the NestJS API as a serverless function, while Supabase provides Auth and PostgreSQL. See [docs/vercel-deployment.md](docs/vercel-deployment.md) for the domain map, environment variables, Supabase redirect allowlist, and verification checklist.

Production operations use [the runbook](docs/operations-runbook.md), [staff training guide](docs/staff-training.md), and [launch checklist](docs/launch-checklist.md). Phase 11 evidence is recorded in [the launch-readiness report](docs/phase-11-launch-readiness.md).

## License

MIT
