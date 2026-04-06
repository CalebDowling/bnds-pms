# Security Features Implementation

Four comprehensive security features have been implemented for the Boudreaux's Pharmacy PMS:

## 1. Two-Factor Authentication (TOTP)

### Libraries & Files
- **Utility**: `/src/lib/security/totp.ts`
  - Pure Web Crypto API implementation (no npm dependencies)
  - `generateSecret()` - Random base32 secret
  - `generateTOTP(secret, time?)` - 6-digit TOTP code
  - `verifyTOTP(secret, token)` - Verify with 1-step clock skew tolerance
  - `generateQRCodeURL()` - otpauth:// URI for QR scanning
  - `generateRecoveryCodes()` - 10 one-time backup codes
  - Helper: `base32Encode/Decode` for manual entry

### Pages & Actions
- **Settings Page**: `/src/app/(dashboard)/settings/security/page.tsx`
  - Display 2FA status (enabled/disabled)
  - Setup flow: generate secret → scan QR code → verify code → save
  - Disable 2FA (requires current TOTP code)
  - Download/regenerate recovery codes
  - QR code generation with QRCode library

- **Server Actions**: `/src/app/(dashboard)/settings/security/actions.ts`
  - `get2FAStatus()` - Check if 2FA enabled
  - `setup2FA()` - Generate new secret
  - `verify2FA(token)` - Enable 2FA with recovery codes
  - `disable2FA(token)` - Disable with verification
  - `generateRecoveryCodesNew()` - Regenerate codes
  - `saveTempTOTPSecret()` - Store temp secret before verification

### Data Storage
- User metadata JSON field stores:
  - `totpSecret` - Active TOTP secret
  - `recoveryCodes` - Array of {code, used, usedAt}
  - `twoFAEnabledAt` - Timestamp
  - `tempTotpSecret` - Temporary during setup

## 2. Session Timeout / Auto-Logout

### Component
- **Provider**: `/src/components/providers/SessionTimeoutProvider.tsx`
  - Monitors user activity: mouse, keyboard, scroll, touch events
  - Configurable timeout: default 30 minutes
  - Warning modal at 5 minutes: countdown timer, "Stay Logged In" button
  - Auto-logout with session clearing
  - "Log Out" button to exit immediately
  - Uses useRef for timer to avoid re-renders
  - Debounced activity detection (1s cooldown)

### Integration
- **Dashboard Layout**: `/src/app/(dashboard)/layout.tsx`
  - SessionTimeoutProvider wraps all dashboard content
  - Preserves all existing providers and structure

## 3. IP Allowlisting for Admin Access

### Utility
- **Module**: `/src/lib/security/ip-allowlist.ts`
  - `getClientIP(request)` - Extract from headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
  - `isIPAllowed(ip, allowList)` - Check individual IPs or CIDR ranges
  - `parseCIDR(cidr)` - Parse /24 notation
  - `ipInRange(ip, network, mask)` - Check CIDR membership
  - `parseIPAllowlist(json)` - Parse from StoreSetting
  - `serializeIPAllowlist()` - Serialize for storage

### Pages & Actions
- **IP Allowlist Page**: `/src/app/(dashboard)/compliance/ip-allowlist/page.tsx`
  - Admin-only access
  - Toggle enforcement on/off
  - List of IPs/CIDRs with labels
  - Add/remove individual entries
  - "Add Current IP" button (auto-detects)
  - Shows user's current IP with option to add

- **Server Actions**: `/src/app/(dashboard)/compliance/ip-allowlist/actions.ts`
  - `getIPAllowlist()` - Retrieve current settings
  - `updateIPAllowlist()` - Save full list and enabled state
  - `addIPToAllowlist()` - Add single IP/CIDR
  - `removeIPFromAllowlist()` - Remove single entry
  - `toggleIPAllowlist()` - Enable/disable enforcement

### API Endpoints
- **IP Detection**: `/src/app/api/ip/route.ts`
  - GET - Returns client's IP address
  - Used by settings page for "Add Current IP"

- **IP Check**: `/src/app/api/security/ip-check/route.ts`
  - POST - Verify if admin's IP is allowed
  - Returns: allowed (bool), reason, ip
  - Status 403 if blocked, 200 if allowed

### Data Storage
- **StoreSetting** table with key: `ip_allowlist`
  - Value: `{"ips": ["192.168.1.1", "10.0.0.0/8"], "enabled": true}`

## 4. HIPAA Audit Trail Enhancements

### Utility
- **Module**: `/src/lib/security/hipaa-audit.ts`
  - `logPHIAccess()` - Log patient data access (view/edit/delete/export)
  - `logPrescriptionAccess()` - Log Rx record access
  - `logPatientRecordView()` - Log patient chart views
  - `logDataExport()` - Log bulk exports
  - `logAuthEvent()` - Log login/logout/2FA events
  - `getAuditLog(filters)` - Query with date/user/action/patient filters
  - `getHIPAAStats()` - Aggregate: total accesses, unique patients, exports, failed logins
  - `exportAuditLogsAsCSV()` - Generate CSV for auditors

### Pages & Actions
- **HIPAA Audit Page**: `/src/app/(dashboard)/compliance/hipaa-audit/page.tsx`
  - Admin-only viewer
  - Summary stats: PHI accesses, unique patients, data exports, failed logins
  - Filters: date range, action type
  - Table: Timestamp, User, Action, Record, IP, Details
  - Color-coded actions (blue=view, amber=edit, red=delete, purple=export, gray=auth)
  - Export to CSV for compliance

- **Server Actions**: `/src/app/(dashboard)/compliance/hipaa-audit/actions.ts`
  - `getHIPAAAuditLog(filters)` - Retrieve paginated logs
  - `getHIPAAStatsData()` - Get daily/date-range statistics
  - `exportHIPAAAuditCSV()` - Generate downloadable CSV

### Action Types Logged
- PHI_VIEW, PHI_EDIT, PHI_DELETE, PHI_EXPORT
- RX_VIEW, RX_CREATE, RX_FILL, RX_TRANSFER
- PATIENT_VIEW, PATIENT_CREATE, PATIENT_EDIT
- LOGIN, LOGOUT, LOGIN_FAILED
- 2FA_ENABLE, 2FA_DISABLE
- DATA_EXPORT

### Data Storage
- **AuditLog** table (existing) with new structured logging:
  - action (enum-like string)
  - tableName, recordId
  - userId (with include user.email, firstName, lastName)
  - ipAddress, userAgent
  - newValues (JSON for context)
  - createdAt (timestamptz)
  - Indexes on: tableName+recordId, userId+createdAt, createdAt

## Database Changes

### Schema Update
- `/prisma/schema.prisma`
  - Added `metadata Json @default("{}") @map("metadata")` to User model
  - Stores TOTP secrets, recovery codes, 2FA timestamps

### Migration
- `/prisma/migrations/20260322_add_user_metadata.sql`
  - SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSON DEFAULT '{}'::json;`

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ip` | GET | Get client IP address |
| `/api/security/ip-check` | POST | Verify admin IP is allowed |
| `/api/user/profile` | GET | Get current user profile (email, name, roles) |

## Security Considerations

1. **TOTP Implementation**
   - HMAC-SHA1 per RFC 4226
   - 30-second time windows
   - 1-step clock skew tolerance for time sync issues
   - Recovery codes for account recovery

2. **Session Management**
   - Debounced activity detection prevents timer reset spam
   - Proper Supabase auth.signOut() on timeout
   - Non-blocking notification (doesn't prevent interaction)

3. **IP Allowlist**
   - CIDR support for enterprise networks
   - Graceful when enforcement is disabled
   - Separate from user authentication (admin-only feature)
   - Logged IP addresses for audit trail

4. **HIPAA Compliance**
   - All PHI access automatically logged
   - Immutable audit log (append-only)
   - User context included (who accessed what when)
   - CSV export for auditor review
   - Supports 6-year retention requirement

## Testing Checklist

- [ ] 2FA setup: scan QR code, verify token, enable successfully
- [ ] 2FA disable: requires valid token
- [ ] Recovery codes: download, regenerate
- [ ] Session timeout: 30 min inactivity → warning → auto-logout
- [ ] Session stay logged in: resets timer
- [ ] IP allowlist: add/remove IPs, toggle enforcement
- [ ] IP detection: "Add Current IP" works
- [ ] HIPAA audit: logs PHI access, auth events
- [ ] Audit stats: correct counts and aggregations
- [ ] CSV export: downloadable, properly formatted

## Environment & Dependencies

- **No new npm packages required** for TOTP (uses Web Crypto API)
- **Existing dependencies used**:
  - `qrcode` (for QR code generation in 2FA)
  - Prisma (database)
  - Supabase Auth (session management)
  - React, TypeScript, Tailwind CSS

## Notes

- All "use server" functions are async and authenticated
- All pages: `export const dynamic = "force-dynamic"`
- Uses Option B design (consistent with codebase)
- Preserves all existing layout.tsx content when adding providers
- Console logging instead of toast notifications (can be enhanced with actual toast library)
