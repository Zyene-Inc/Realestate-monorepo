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
- **Storage**: Supabase Storage signed uploads for agent and sale-listing files
- **Infrastructure**: Vercel deployments with Supabase-managed Auth and PostgreSQL

## Getting Started

### 1. Supabase setup
This application uses the connected `coachjohnsonrealty Project` for PostgreSQL and authentication. Copy `backend/.env.example` to `backend/.env` and add the database password and server-only Supabase secret key from **Settings > API Keys**. Copy `frontend/.env.example` to `frontend/.env.local`.

The database migrations have been applied to the connected project. Future schema changes should be applied through the Supabase integration and committed alongside the matching Prisma schema change.

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
- **Maintenance Management**: Real-time request tracking and status updates.
- **Asset Management**: Full CRUD for properties and units.
- **File Storage**: Private Supabase Storage buckets with signed upload and download URLs for the active agent and sale-listing workflows.
- **Health Monitoring**: `/health` endpoint for system status.

## Environment Variables

Refer to `backend/.env.example` and `frontend/.env.example` for all required configuration. Supabase is the sole database and authentication provider; no local PostgreSQL container or JWT secrets are required.

## Vercel deployment

The frontend and API are deployed as two Vercel projects from this repository. `coachjohnsonrealty.com` and its five role-specific subdomains are the canonical web origins; `coach-johnson-realty-web-sigma.vercel.app` remains a support fallback, and `coach-johnson-realty-api-nu.vercel.app` serves the API. Vercel runs the NestJS API as a serverless function, while Supabase provides Auth and PostgreSQL. See [docs/vercel-deployment.md](docs/vercel-deployment.md) for the domain map, environment variables, Supabase redirect allowlist, and verification checklist.

## License
MIT
