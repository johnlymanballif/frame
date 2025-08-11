# Time - Team Time Tracking

A professional time tracking application for design teams, built with Next.js 15, Drizzle ORM, and NextAuth.

## Features

### Core Features (v1)
- ⏱️ **Individual Time Tracking** - Fast, keyboard-first timer with natural language input
- 📋 **Resource Planning** - Weekly allocations & capacity management  
- 📊 **Profitability** - Project burn vs budget tracking with role-based visibility
- 🔐 **Role-based Access** - Member/Manager/Owner permissions
- 📅 **Google Calendar Integration** - Quick time logging from calendar events
- 🎯 **Natural Language Input** - Parse entries like "3.5h yesterday — ACME — homepage wireframes — billable"

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, ShadCN/UI components
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js with magic link email
- **Deployment**: Ready for Vercel/Netlify

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or Neon/Supabase)
- SMTP email service (for magic links)

### Environment Setup

1. Install dependencies:
```bash
npm install
```

2. Update `.env.local` with your configuration:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/timetracker"

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Email (for magic link auth)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-password"
EMAIL_FROM="your-email@gmail.com"

# Google Calendar Integration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Database Setup

1. Generate database migrations:
```bash
npm run db:generate
```

2. Push schema to database:
```bash
npm run db:push
```

3. Seed with demo data:
```bash
npm run db:seed
```

### Development

Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Demo Accounts

After seeding, you can sign in with these demo accounts:

- **Owner**: `owner@demo.com` (Full access)
- **Manager**: `manager@demo.com` (Team view + profitability)
- **Member**: `designer@demo.com` (Individual time tracking only)

## API Routes

### Time Tracking
- `GET /api/time/running` - Get current running timer
- `POST /api/time/start` - Start new timer
- `POST /api/time/stop` - Stop running timer
- `POST /api/time/switch` - Switch to different project

### Projects & Tasks
- `GET /api/projects` - List organization projects
- `GET /api/projects/[id]/tasks` - List project tasks

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Seed demo data
```

## Deploying to Vercel

### 1) Create a Postgres database
- Recommended: Neon, Supabase, or Vercel Postgres
- Grab the connection string and set it as `DATABASE_URL` in Vercel

### 2) Add environment variables in Vercel (Project Settings → Environment Variables)

Required:

```
DATABASE_URL=postgresql://user:password@host:5432/db
NEXTAUTH_SECRET=your-long-random-secret
# Optional if you want to hardcode it; routes will fall back to the deployment origin
NEXTAUTH_URL=https://your-app.vercel.app

# Email (Resend) – required for magic-link emails in production
RESEND_API_KEY=your_resend_key
EMAIL_FROM="Frame <noreply@yourdomain.com>"

# Google Calendar (optional feature)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Tip: Generate a secret with `openssl rand -base64 32`.

### 3) Connect the GitHub repo and deploy
- Push your changes to your repo and import the project in Vercel
- Framework preset: Next.js (auto-detected)
- Build command: `next build` (default)
- Output: `.vercel/output` (Next handles this automatically)

### 4) Initialize the database schema (choose one)
- Option A (recommended): From your local machine, point `.env.local` `DATABASE_URL` to the remote DB and run:
  - `npm run db:push`
  - `npm run db:seed` (optional demo data)
- Option B (runtime migration): After the first deploy, call the protected endpoint as an owner user:
  - `POST https://YOUR_DOMAIN/api/admin/migrate`

### 5) Test auth and magic links
- Sign in with a demo user or send yourself a magic link from the sign in screen
- Emails will be sent via Resend in production; ensure `RESEND_API_KEY` and `EMAIL_FROM` are set

### Notes
- Magic link URLs prefer `NEXTAUTH_URL` if set, and gracefully fall back to the request origin (works for Preview and Production)
- The database client is serverless-friendly (Postgres + Drizzle) and configured for Vercel
