# Backup & Disaster Recovery Plan

## Overview
Boudreaux's New Drug Store PMS relies on Supabase (PostgreSQL) for all persistent data. This document outlines backup strategy, recovery procedures, and disaster recovery targets.

## Recovery Objectives
- **RPO (Recovery Point Objective):** 1 hour — maximum acceptable data loss
- **RTO (Recovery Time Objective):** 4 hours — maximum acceptable downtime

## Backup Strategy

### Database (Supabase PostgreSQL)
- **Automated daily backups:** Enabled via Supabase Pro plan
- **Point-in-Time Recovery (PITR):** Enabled — allows recovery to any point within retention window
- **Retention:** 30 days (Supabase Pro default)
- **Region:** US-East-1 (primary)

### Application Code
- **Source:** GitHub repository (CalebDowling/bnds-pms)
- **Branches:** `master` (production), `develop` (staging)
- **Docker images:** Stored in GitHub Container Registry (ghcr.io)

### Environment Configuration
- **Secrets:** Stored in Vercel environment variables (production/preview/development)
- **Backup:** Critical secrets documented in secure vault (1Password/LastPass)

## Recovery Procedures

### Scenario 1: Database Corruption
1. Identify the corruption timestamp from audit logs
2. Use Supabase PITR to restore to the point before corruption
3. Verify data integrity with `scripts/validate-migration.ts`
4. Notify all active users of the recovery window

### Scenario 2: Complete Database Loss
1. Contact Supabase support for backup restoration
2. If backups unavailable, restore from most recent daily backup
3. Re-run any migrations since backup date
4. Reconcile data with DRX system for any gap period

### Scenario 3: Application Failure
1. Roll back to previous Vercel deployment (1-click in dashboard)
2. If persistent, revert Git to last known good commit
3. Deploy from Docker image tagged with last stable version

### Scenario 4: Supabase Region Outage
1. Monitor Supabase status page (status.supabase.com)
2. If prolonged (>2 hours), spin up new Supabase project in alternate region
3. Restore from most recent backup
4. Update DNS/environment variables

## Testing Schedule
- **Monthly:** Verify backup exists and is restorable
- **Quarterly:** Full DR drill — restore to test environment and validate
- **Annually:** Complete failover test with staff

## Data Retention (HIPAA)
- **Patient records:** 7 years minimum (soft-deleted, never purged)
- **Prescription records:** 7 years minimum
- **Audit logs:** 7 years minimum
- **Financial records:** 7 years minimum
- **Controlled substance logs:** Permanent (DEA requirement)

## Contact
- **Supabase Support:** support@supabase.io
- **Vercel Support:** via dashboard
- **On-call:** [To be configured]
