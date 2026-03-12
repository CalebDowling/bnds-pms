# Deployment Guide — Boudreaux's PMS

## Overview

The PMS is a Next.js 16 application backed by PostgreSQL (Supabase). It uses Prisma as ORM and can be deployed as a Docker container or directly to platforms like Vercel, Railway, or Render.

---

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (via Supabase or self-hosted)
- Docker (for containerized deployments)
- GitHub account with access to the repo

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pooled Postgres connection string (port 6543 for Supabase) |
| `DIRECT_URL` | Yes | Direct Postgres connection for migrations (port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | No | App base URL (defaults to http://localhost:3000) |
| `DRX_API_KEY` | No | DRX API key for pharmacy data sync |
| `DRX_BASE_URL` | No | DRX API base URL |

---

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database (dev only)
npx prisma db push

# Seed initial data
npx prisma db seed

# Start dev server
npm run dev
```

---

## Database Migrations

We use Prisma Migrate for production schema changes:

```bash
# Create a new migration after editing schema.prisma
npx prisma migrate dev --name describe_your_change

# Apply migrations to staging/production
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

**Important**: Never use `prisma db push` in production. Always create proper migrations.

---

## Docker Deployment

### Build and run locally

```bash
# Build the image
docker build -t bnds-pms .

# Run with env vars
docker run -p 3000:3000 --env-file .env.local bnds-pms
```

### Using docker-compose

```bash
# Start the app
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down
```

### Health Check

The app exposes `GET /api/health` which returns:
- `200` with `{ status: "healthy" }` when the app and database are connected
- `503` with `{ status: "unhealthy" }` when the database is unreachable

---

## CI/CD Pipeline

### Branches

| Branch | Purpose | Auto-deploy |
|--------|---------|-------------|
| `main` | Production | Tag with `v*` to deploy |
| `develop` | Staging | Auto-deploys to staging |
| Feature branches | Development | CI runs on PR |

### GitHub Actions Workflows

1. **CI** (`ci.yml`) — Runs on every push/PR to main or develop:
   - ESLint
   - TypeScript type checking
   - Vitest unit tests
   - Next.js production build
   - Prisma schema validation

2. **Deploy Staging** (`deploy-staging.yml`) — Runs on push to develop:
   - Builds Docker image
   - Pushes to GitHub Container Registry
   - Deploys to staging environment

3. **Deploy Production** (`deploy-production.yml`) — Runs on version tags:
   - Full validation (lint + typecheck + tests)
   - Builds production Docker image
   - Deploys with manual confirmation
   - Creates GitHub Release

### Required GitHub Secrets

| Secret | Environment | Description |
|--------|-------------|-------------|
| `STAGING_SUPABASE_ANON_KEY` | staging | Staging Supabase anon key |
| `PRODUCTION_SUPABASE_ANON_KEY` | production | Production Supabase anon key |

### Required GitHub Variables

| Variable | Environment | Description |
|----------|-------------|-------------|
| `STAGING_APP_URL` | staging | e.g., https://staging.bnds-pms.com |
| `STAGING_SUPABASE_URL` | staging | Staging Supabase URL |
| `PRODUCTION_APP_URL` | production | e.g., https://pms.boudreauxsnewdrug.com |
| `PRODUCTION_SUPABASE_URL` | production | Production Supabase URL |

---

## Pre-Deployment Checklist

- [ ] All CI checks pass (lint, typecheck, tests, build)
- [ ] Database migrations created and tested locally
- [ ] Environment variables configured in target environment
- [ ] Prisma migrations applied: `npx prisma migrate deploy`
- [ ] Health check returns 200: `curl https://your-app/api/health`
- [ ] Smoke test critical flows: login, patient search, prescription create
- [ ] Verify DRX sync connectivity (if enabled)
- [ ] Check error monitoring (Sentry or equivalent)
- [ ] Confirm database backups are current

---

## Rollback Procedure

1. **Application**: Redeploy the previous Docker image tag
   ```bash
   # Find previous tag
   docker images ghcr.io/your-org/bnds-pms --format "{{.Tag}}"

   # Deploy previous version
   docker compose down
   # Update image tag in docker-compose.yml or .env
   docker compose up -d
   ```

2. **Database**: Prisma migrations are forward-only. For rollback:
   - Create a new migration that reverses the changes
   - Never manually modify the `_prisma_migrations` table

3. **Emergency**: If the app is completely down:
   ```bash
   # Check logs
   docker compose logs --tail=100 app

   # Restart
   docker compose restart app

   # If persistent: rollback to previous image
   docker compose pull  # pulls latest tagged image
   docker compose up -d
   ```

---

## Monitoring

### Health Endpoint

`GET /api/health` returns:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-12T...",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy", "latencyMs": 12 }
  }
}
```

### Recommended Monitoring Setup

- **Uptime**: Monitor `/api/health` every 60 seconds
- **Error tracking**: Sentry (add `@sentry/nextjs` when ready)
- **Logs**: Docker logs or platform-native logging
- **Database**: Supabase dashboard for query performance and storage

---

## Platform-Specific Notes

### Vercel
- Remove `output: "standalone"` from `next.config.js`
- Add env vars in Vercel dashboard
- Prisma: Add `prisma generate` to build command

### Railway
- Works with Dockerfile as-is
- Add env vars via Railway dashboard
- Enable health checks on `/api/health`

### Render
- Use Docker deployment type
- Add env vars in Render dashboard
- Configure health check path: `/api/health`
