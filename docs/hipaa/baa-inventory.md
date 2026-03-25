# Business Associate Agreement (BAA) Inventory
## Boudreaux's New Drug Store — PMS

**Last Updated:** March 2026

All third-party services that process, store, or transmit Protected Health Information (PHI) require a signed Business Associate Agreement per HIPAA.

---

## Required BAAs

| Service | Purpose | PHI Handled | BAA Status | Notes |
|---------|---------|-------------|------------|-------|
| **Supabase** | Database hosting (PostgreSQL) | All patient/Rx data | REQUIRED | Supabase offers BAA on Team/Enterprise plans. Contact sales@supabase.io |
| **Vercel** | Application hosting | PHI in server logs/memory | REQUIRED | Vercel offers BAA on Enterprise plan. Contact sales@vercel.com |
| **Twilio** | SMS/Voice/Fax | Patient phone numbers, Rx notifications | REQUIRED | Twilio offers BAA. Enable via console: Console > Settings > HIPAA |
| **Stripe** | Payment processing | Copay amounts (no clinical PHI) | RECOMMENDED | PCI-DSS compliant. BAA available for healthcare customers |
| **Sentry** | Error tracking | May capture PHI in error payloads | REQUIRED | Sentry offers BAA on Business plan. Configure PII scrubbing |
| **SureScripts** | E-prescribing | Full Rx data, patient demographics | REQUIRED | BAA included in SureScripts participation agreement |
| **NCPDP Clearinghouse** | Claims processing | Insurance claims with patient data | REQUIRED | BAA typically included in clearinghouse contract |
| **GitHub** | Source code hosting | No PHI in code (secrets in env vars) | NOT REQUIRED | No PHI stored in repository |

---

## Action Items

1. [ ] Confirm Supabase plan supports BAA — upgrade if needed
2. [ ] Contact Vercel sales for Enterprise BAA
3. [ ] Enable Twilio HIPAA mode in console
4. [ ] Configure Sentry PII data scrubbing rules
5. [ ] Verify SureScripts participation agreement includes BAA
6. [ ] Verify clearinghouse contract includes BAA
7. [ ] File all signed BAAs in secure document storage

## Review
- BAA inventory reviewed annually
- New services must be evaluated for BAA requirement before integration
