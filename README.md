# BNDS Pharmacy Management System

Custom pharmacy management platform for Boudreaux's Compounding Pharmacy. Replaces DRX with full API parity + compounding extensions.

## Tech Stack

- **Frontend:** Next.js 14+ / React / TypeScript / Tailwind CSS
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma 5
- **Auth:** Supabase Auth
- **Real-time:** Supabase Realtime

## Quick Start

### 1. Extract and install

```bash
tar -xzf bnds-pms-scaffold.tar.gz -C bnds-pms
cd bnds-pms
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

You need:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings > API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings > API
- `DATABASE_URL` — from Supabase project settings > Database > Connection string (URI)

### 3. Push database schema

```bash
npx prisma db push
```

This creates all 55 tables in your Supabase Postgres database.

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Create a test user in Supabase

Go to Supabase Dashboard > Authentication > Users > Add User. Create a user with email/password. This will be your first login.

### 6. Run dev server

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the login page.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup, callback
│   │   ├── login/
│   │   ├── signup/
│   │   └── callback/
│   ├── (dashboard)/      # All authenticated pages
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── prescriptions/
│   │   ├── compounding/
│   │   ├── inventory/
│   │   ├── shipping/
│   │   ├── billing/
│   │   ├── pos/
│   │   └── settings/
│   └── api/
├── components/
│   ├── layout/           # Sidebar, Header
│   ├── ui/               # Reusable UI components
│   └── forms/            # Form components
├── lib/
│   ├── supabase/         # Supabase client/server/middleware helpers
│   └── prisma.ts         # Prisma client singleton
├── hooks/
├── types/
└── middleware.ts          # Auth middleware (session refresh + route protection)

prisma/
└── schema.prisma          # 55 tables, full DRX API parity
```

## Database Schema

55 tables across 17 domains:
- Patient (9 tables), Prescriber (1), Prescriptions & Fills (4)
- Intake Queue (5), Items & Inventory (4), Formulas & Compounding (7)
- Billing & Claims (5), Shipping & Delivery (5), POS (3)
- Communications (1), Documents (1), Comments & Tags (3)
- Facilities/LTC (3), Tasks & Todos (2), Stores & Settings (2)
- Users & Auth (4), Webhooks (2), Audit Log (1)

## Next Steps

1. Wire Supabase credentials and push schema
2. Create first user in Supabase Auth
3. Build out Patient CRUD (first working module)
4. Build Prescription + Fill workflow
5. Continue module-by-module per the 13-week timeline
