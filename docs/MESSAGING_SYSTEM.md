# SMS/Email Patient Notification System

A complete patient notification system for Boudreaux's Pharmacy PMS that allows sending SMS and email notifications via both automated reminders and manual staff control.

## Architecture Overview

### Core Services (`src/lib/messaging/`)

#### 1. **email.ts** - Email Service Abstraction
- Generic `sendEmail(to, subject, html, text?)` function
- Supports nodemailer with SMTP configuration
- Falls back to console logging in dev mode (no env vars)
- Provides `buildEmailHtml(templateName, content)` helper for pharmacy-branded templates
- HTML templates include inline CSS with green pharmacy branding (#40721D)

**Environment Variables:**
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP port (465 for TLS)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - Sender email (default: noreply@boudreauxsnewdrug.com)

#### 2. **sms.ts** - SMS Service Abstraction
- Uses Twilio REST API via native fetch (no npm packages needed)
- Generic `sendSMS(to, message)` function
- Falls back to console logging in dev mode
- Validates phone number format

**Environment Variables:**
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number to send from

#### 3. **templates.ts** - Message Templates
Five notification templates, each returning `{subject, html, text, sms}`:

- **readyForPickup** - Prescription ready notification
- **refillDue** - Refill reminder (daysSupply - 3 check)
- **refillProcessed** - Refill completed confirmation
- **shippingUpdate** - Shipping tracking notification
- **prescriptionExpiring** - Expiration warning

Templates include:
- Professional HTML email with inline CSS and pharmacy branding
- Plain text email fallback
- Short SMS versions (fits < 160 chars)
- Template function: `getTemplate(templateName, data)`

#### 4. **dispatcher.ts** - Notification Dispatcher
Core notification logic that:
- Sends notifications to patients via email/SMS
- Respects patient communication preferences (email exists, SMS consent via `acceptsSms`)
- Logs all communications to `CommunicationLog` table
- Tracks sender (staff member who triggered)
- Batch send support for cron jobs

**Functions:**
- `notifyPatient(patientId, template, data, {channels, sentBy})` - Send to one patient
- `notifyBatch(patientIds[], template, data, options)` - Send to multiple patients

### API Routes

#### POST `/api/messaging/send`
Manual notification endpoint for staff to send messages.

**Request Body:**
```json
{
  "patientId": "uuid",
  "template": "readyForPickup",
  "data": {
    "drugName": "Metformin",
    "rxNumber": "RX123456",
    "pharmacyPhone": "555-1234"
  },
  "channels": ["email", "sms"]
}
```

**Response:**
```json
{
  "success": true,
  "channels": {
    "email": { "success": true, "messageId": "..." },
    "sms": { "success": true, "messageId": "..." }
  },
  "communicationLogId": "uuid"
}
```

#### POST `/api/messaging/refill-reminders`
Automated refill reminder scan (call via Vercel cron or external scheduler).

**Cron Secret:** Set `CRON_SECRET` env var for Bearer token auth

**Logic:**
- Finds prescriptions due for refill:
  - `refillsRemaining > 0`
  - Not expired (`expirationDate > now`)
  - Last fill was > (daysSupply - 3) days ago
  - Active and in filled/dispensed status
- Sends `refillDue` notifications via email + SMS
- Returns success count and per-patient results

### Dashboard (`src/app/(dashboard)/messaging/`)

#### page.tsx - Messaging Dashboard
Staff view with:
- **Stats Grid:** Total sent, emails, SMS, last sent date
- **Quick Send Form:** Select patient, template, channels
- **Professional UI:** Green branding, error handling, loading states

#### actions.ts - Server Actions
- `getMessagingStats()` - Dashboard statistics
- `getNotificationHistory(filters)` - Query communications with filtering
- `sendManualNotification(patientId, template, data, channels)` - Trigger send

All functions are async and use `requireUser()` for auth.

### Navigation
Added "Messaging" (💬) to sidebar navigation at `/messaging`

## Patient Data Model

### Patient Table
- `email` (nullable) - For email notifications
- `preferredContact` - Patient preference (email/phone)

### PatientPhoneNumber Table
- `number` - Phone number
- `isPrimary` - Only primary phone used for SMS
- `acceptsSms` - Opt-in flag for SMS notifications

## Communication Logging

All notifications logged to `CommunicationLog` with:
- `channel` - "email" or "sms"
- `direction` - "outbound"
- `patientId` - Associated patient
- `toAddress` - Email or phone number
- `subject` - Email subject
- `body` - Message content
- `status` - "sent"
- `templateName` - Which template used
- `sentBy` - User ID of staff member
- `createdAt` - Timestamp

## Development Mode

When SMTP or Twilio config is missing:
- Emails logged to console with subject, recipient, body
- SMS logged to console with recipient and message
- No actual messages sent
- Useful for testing without credentials

## Integration Example

```typescript
// Send a refill reminder to a patient
import { notifyPatient } from "@/lib/messaging/dispatcher";

const result = await notifyPatient(
  "patient-uuid",
  "refillDue",
  {
    rxNumber: "RX123456",
    drugName: "Lisinopril 10mg",
    refillsRemaining: 2,
  },
  {
    channels: ["email", "sms"],
    sentBy: "staff-user-id",
  }
);

if (result.success) {
  console.log("Notification sent", result.channels);
}
```

## Cron Job Setup (Vercel)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/messaging/refill-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Set environment variable: `CRON_SECRET=your-secret-token`

## File Locations

```
src/lib/messaging/
├── email.ts              # Email service
├── sms.ts                # SMS service via Twilio
├── templates.ts          # Message templates
└── dispatcher.ts         # Notification dispatcher

src/app/api/messaging/
├── send/route.ts         # Manual send endpoint
└── refill-reminders/route.ts  # Cron job endpoint

src/app/(dashboard)/messaging/
├── page.tsx              # Dashboard UI
└── actions.ts            # Server actions

src/components/layout/Sidebar.tsx  # Updated with Messaging nav
```

## Type Safety

Full TypeScript support with:
- `TemplateName` union type for template validation
- `TemplateData` interface for template parameters
- `Channel` type for email/sms
- `MessageTemplate` interface for return types
- All async functions properly typed

✅ Passes `npm run typecheck` with zero errors

## Key Features

- ✅ Professional HTML email templates with pharmacy branding
- ✅ SMS support via Twilio (fetch-based, no extra packages)
- ✅ Development mode console logging
- ✅ Patient communication preference respects
- ✅ Batch notification support
- ✅ Full audit trail in CommunicationLog
- ✅ Staff-only manual send
- ✅ Automated refill reminder cron
- ✅ Type-safe throughout
- ✅ Error handling and logging
- ✅ Extensible template system
