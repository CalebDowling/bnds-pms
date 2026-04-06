# Go-Live Checklist
## Boudreaux's New Drug Store — PMS Launch

### Pre-Launch (1 Week Before)

#### Infrastructure
- [ ] Production Supabase project provisioned and configured
- [ ] PITR backups enabled and verified
- [ ] All environment variables set in Vercel production
- [ ] DNS configured and SSL certificate active
- [ ] IP allowlist configured for pharmacy locations
- [ ] Sentry alerts configured (error rate, performance)
- [ ] Health check endpoint responding at `/api/health`

#### Security
- [ ] ENCRYPTION_KEY generated and stored securely
- [ ] All admin/pharmacist accounts have 2FA enabled
- [ ] Rate limiting tested and functional
- [ ] CSP header verified (no violations in console)
- [ ] Audit log chain verified (no broken links)
- [ ] Password policy enforced (12-char minimum)

#### Compliance
- [ ] BAAs signed with: Supabase, Vercel, Twilio, Sentry, SureScripts, clearinghouse
- [ ] HIPAA Security Risk Assessment completed and signed
- [ ] DEA log export tested and verified
- [ ] State board reporting tested
- [ ] Backup/DR plan reviewed by pharmacist-in-charge

#### Data
- [ ] Full DRX data migration completed
- [ ] Migration validation script run — all counts match
- [ ] Patient demographics verified (sample of 50 records)
- [ ] Prescription history verified (sample of 100 Rx)
- [ ] Insurance plans imported correctly
- [ ] Inventory lots and quantities match DRX

#### Testing
- [ ] All unit tests passing (`npm test`)
- [ ] E2E smoke tests passing
- [ ] Claims submission tested against clearinghouse sandbox
- [ ] SureScripts eRx intake tested
- [ ] Label printing tested on pharmacy printer
- [ ] SMS notifications tested
- [ ] POS payment flow tested

### Launch Day (Day 0)

#### Morning (Before Opening)
- [ ] Final DRX data sync (catch any overnight changes)
- [ ] Staff accounts created and verified
- [ ] All workstations logged in and tested
- [ ] Printer connections verified
- [ ] Barcode scanner connections verified

#### Go-Live
- [ ] Switch DNS to production (if separate domain)
- [ ] Announce go-live to all staff
- [ ] First prescription entered in new system
- [ ] First claim submitted successfully
- [ ] First label printed

#### Monitoring
- [ ] War room active (admin monitoring Sentry + audit logs)
- [ ] Hourly check: error rate, response times, claim success rate
- [ ] Staff feedback channel open (Slack/Teams/group text)

### Post-Launch (Week 1)

#### Daily Checks
- [ ] Review Sentry for new errors
- [ ] Compare daily fill count: BNDS PMS vs DRX
- [ ] Review claim acceptance rate
- [ ] Review staff feedback and issues

#### End of Week 1
- [ ] Performance baseline documented
- [ ] Known issues triaged and prioritized
- [ ] Staff confidence assessment
- [ ] Decision: continue parallel run or decommission DRX

### Rollback Triggers
If any of the following occur, revert to DRX immediately:
- [ ] Claims not submitting for >30 minutes
- [ ] Patient data corruption detected
- [ ] System unavailable for >15 minutes during business hours
- [ ] Critical security incident
