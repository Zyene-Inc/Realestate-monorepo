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
- **Database**: PostgreSQL with Prisma 7
- **Auth**: JWT (Access/Refresh Tokens), bcrypt hashing
- **Email**: SendGrid Integration
- **Storage**: AWS S3 / Cloudflare R2
- **Infrastructure**: Docker Compose

## Getting Started

### 1. Database Setup
Ensure Docker is installed and run:
```bash
docker compose up -d db
```

### 2. Backend Setup
```bash
cd backend
npm install
# Configure your .env file using .env.example
npx prisma migrate dev
npm run seed
npm run start:dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Modules Implemented

- **Authentication**: JWT-based login with Refresh Token rotation. Role-based access control (RBAC).
- **Manual Payment Ledger**: Record rent payments, track overdue balances, and manage payment history without external processors.
- **Tenant Onboarding**: Secure invite flow with email-based activation links.
- **Maintenance Management**: Real-time request tracking and status updates.
- **Asset Management**: Full CRUD for properties and units.
- **File Storage**: Production-grade S3 integration for documents and photos.
- **Health Monitoring**: `/health` endpoint for system status.

## Environment Variables

Refer to `backend/.env.example` for all required configuration including:
- `DATABASE_URL` (PostgreSQL)
- `SENDGRID_API_KEY`
- `S3_BUCKET_NAME`
- `JWT_SECRET`

## License
MIT
