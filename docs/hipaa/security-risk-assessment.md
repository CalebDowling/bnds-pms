# HIPAA Security Risk Assessment
## Boudreaux's New Drug Store — Pharmacy Management System

**Date:** March 2026
**Assessor:** IT Administration
**System:** BNDS PMS (Next.js/Supabase)

---

## 1. Administrative Safeguards (45 CFR 164.308)

### 1.1 Security Management Process
- **Risk Analysis:** This document (reviewed annually)
- **Risk Management:** Remediation tracked in GitHub Issues
- **Sanction Policy:** Staff handbook defines disciplinary actions for HIPAA violations
- **Information System Activity Review:** Audit logs reviewed monthly via `/compliance/hipaa-audit`

### 1.2 Assigned Security Responsibility
- **Security Officer:** Pharmacy Owner/Administrator
- **Contact:** [To be assigned]

### 1.3 Workforce Security
- **Authorization/Supervision:** RBAC system with 6 defined roles
- **Workforce Clearance:** Background check required before system access
- **Termination Procedures:** Supabase account deactivation + session revocation

### 1.4 Information Access Management
- **Access Authorization:** Role-based (Admin, Pharmacist, Technician, Shipping, Billing, Cashier)
- **Access Establishment/Modification:** Admin-only user invite and role assignment
- **Minimum Necessary:** Permissions scoped per role (e.g., cashiers cannot view full patient records)

### 1.5 Security Awareness Training
- **Security Reminders:** Quarterly email reminders
- **Protection from Malware:** Endpoint protection on all pharmacy workstations
- **Log-in Monitoring:** Failed login attempts logged and alerted
- **Password Management:** 12-character minimum with complexity requirements

### 1.6 Security Incident Procedures
- **Response and Reporting:** Incidents logged to audit system, escalated to Security Officer
- **Breach Notification:** 60-day notification window per HITECH Act

### 1.7 Contingency Plan
- **Data Backup Plan:** Supabase PITR + daily automated backups (see backup-dr.md)
- **Disaster Recovery Plan:** Documented in backup-dr.md
- **Emergency Mode Operation:** Read-only access to critical patient data via DRX fallback
- **Testing and Revision:** Quarterly DR drills, annual plan review

### 1.8 Evaluation
- **Annual evaluation** of security controls and this risk assessment
- **Penetration testing:** Annual third-party assessment (to be scheduled)

---

## 2. Physical Safeguards (45 CFR 164.310)

### 2.1 Facility Access Controls
- **Pharmacy:** Locked facility with key card access
- **Server room:** N/A (cloud-hosted via Supabase/Vercel)
- **Workstations:** Located within pharmacy, not publicly accessible

### 2.2 Workstation Use
- **Policy:** PMS accessed only from authorized workstations within pharmacy
- **Auto-lock:** 30-minute inactivity timeout with session warning

### 2.3 Workstation Security
- **Physical protection:** Workstations in secured pharmacy area
- **Screen privacy:** Privacy filters on monitors facing public areas

### 2.4 Device and Media Controls
- **Disposal:** Hard drives wiped (NIST 800-88) before disposal
- **Media re-use:** Full wipe required before reassignment
- **Data backup:** Cloud-hosted, no local PHI storage

---

## 3. Technical Safeguards (45 CFR 164.312)

### 3.1 Access Control
- **Unique User Identification:** Email-based accounts, UUID-based internal IDs
- **Emergency Access Procedure:** Admin can grant temporary elevated access
- **Automatic Logoff:** 30-minute inactivity timeout (configurable)
- **Encryption:** AES-256-GCM field-level encryption for SSN, TOTP secrets

### 3.2 Audit Controls
- **Audit Log:** Every PHI access logged (view, edit, delete, export)
- **Hash Chain:** SHA-256 tamper-evident chain on audit entries
- **Retention:** 7 years minimum
- **Export:** CSV export for compliance review

### 3.3 Integrity
- **Authentication of ePHI:** Hash chain on audit logs detects tampering
- **Transmission Security:** TLS 1.2+ (HSTS enforced, max-age=31536000)

### 3.4 Person or Entity Authentication
- **Password Policy:** 12+ characters, uppercase, lowercase, number, special character
- **Two-Factor Authentication:** TOTP-based, mandatory for Admin/Pharmacist roles
- **Session Management:** 30-minute timeout, secure cookie storage

### 3.5 Transmission Security
- **Encryption in Transit:** HTTPS/TLS enforced via HSTS header
- **API Security:** JWT-based authentication, rate limiting on all endpoints
- **Content Security Policy:** Strict CSP header restricting script/style/connect sources

---

## 4. Risk Register

| # | Risk | Likelihood | Impact | Mitigation | Status |
|---|------|-----------|--------|------------|--------|
| 1 | Unauthorized PHI access | Low | High | RBAC + audit logging + 2FA | Implemented |
| 2 | Data breach via injection | Low | Critical | Prisma ORM (parameterized) + Zod validation | Implemented |
| 3 | Data loss | Low | Critical | Supabase PITR + daily backups | Implemented |
| 4 | Insider threat | Medium | High | Audit logs + minimum necessary access | Implemented |
| 5 | Brute force login | Low | Medium | Rate limiting + 2FA | Implemented |
| 6 | Session hijacking | Low | High | Secure cookies + HTTPS + timeout | Implemented |
| 7 | Audit log tampering | Low | High | SHA-256 hash chain | Implemented |
| 8 | Third-party data exposure | Low | High | BAAs in place + encrypted transit | In progress |
| 9 | Ransomware | Low | Critical | Cloud-hosted + PITR backups | Mitigated |
| 10 | Social engineering | Medium | Medium | Staff training + 2FA enforcement | Partially mitigated |

---

## 5. Review Schedule
- **Next review date:** March 2027
- **Reviewed by:** Security Officer + Pharmacist-in-Charge
- **Approval:** [Signature required]
