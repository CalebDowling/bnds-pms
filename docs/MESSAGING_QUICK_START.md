# Messaging System Quick Start

## Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=pharmacy@boudreauxsnewdrug.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Cron authentication
CRON_SECRET=your-secret-token-here
```

### 2. Deploy

```bash
npm run build
git add src/lib/messaging/ src/app/api/messaging/ src/app/\(dashboard\)/messaging/ src/components/layout/Sidebar.tsx
git commit -m "Add SMS/email patient notification system"
git push
```

## Usage

### Send Notification from Code

```typescript
import { notifyPatient } from "@/lib/messaging/dispatcher";

await notifyPatient(
  "patient-uuid",
  "readyForPickup",
  {
    drugName: "Lisinopril 10mg",
    rxNumber: "RX123456",
    pharmacyPhone: "555-1234"
  },
  { channels: ["email", "sms"], sentBy: "user-uuid" }
);
```

### Send from Dashboard

1. Navigate to **Messaging** in sidebar
2. Enter patient ID or MRN
3. Select template (Ready for Pickup, Refill Due, etc.)
4. Check Email/SMS channels
5. Click "Send Notification"

### Automated Refill Reminders (Vercel Cron)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/messaging/refill-reminders",
    "schedule": "0 9 * * *"
  }]
}
```

Then run daily at 9 AM UTC. Sends `refillDue` template to patients with:
- `refillsRemaining > 0`
- Prescription not expired
- Days since last fill >= (daysSupply - 3)

### Manual API Call

```bash
curl -X POST http://localhost:3000/api/messaging/send \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-uuid",
    "template": "readyForPickup",
    "data": {
      "drugName": "Metformin",
      "rxNumber": "RX789"
    },
    "channels": ["email", "sms"]
  }'
```

## Templates

### readyForPickup
**Use:** When prescription is ready for patient to pick up
**Variables:** patientName, rxNumber, drugName, pharmacyPhone

### refillDue
**Use:** Remind patient to refill prescription
**Variables:** patientName, rxNumber, drugName, refillsRemaining

### refillProcessed
**Use:** Confirm refill request has been processed
**Variables:** patientName, rxNumber, status

### shippingUpdate
**Use:** Notify about shipment dispatch
**Variables:** patientName, trackingNumber, carrier

### prescriptionExpiring
**Use:** Warn about expiring prescription
**Variables:** patientName, rxNumber, drugName, expirationDate

## Development Mode

If SMTP or Twilio config is missing, messages are logged to console:

```
📧 [DEV MODE] Email would be sent:
  To: patient@example.com
  Subject: Your prescription is ready for pickup
  Body: Hello John Doe...

📱 [DEV MODE] SMS would be sent:
  To: 555-1234
  Message: Hi John! Your prescription is ready for pickup...
```

Perfect for local testing without credentials.

## Troubleshooting

### Emails not sending
1. Check `SMTP_*` env vars are set
2. Verify SMTP credentials in env
3. Check console for dev mode logs
4. Look at `CommunicationLog` table for status

### SMS not sending
1. Check `TWILIO_*` env vars are set
2. Verify patient phone has `acceptsSms = true`
3. Check console for dev mode logs
4. Look at `CommunicationLog` table for status

### Patient not receiving
- Check `Patient.email` exists and is valid
- Check `PatientPhoneNumber.number` exists
- Check `PatientPhoneNumber.acceptsSms` is true
- View `CommunicationLog` to verify send was attempted

## Database Logging

All notifications logged to `CommunicationLog`:

```sql
SELECT * FROM communication_log
WHERE channel IN ('email', 'sms')
  AND direction = 'outbound'
ORDER BY created_at DESC
LIMIT 20;
```

## Performance Notes

- **Batch sends** are sequential (not parallel) to avoid rate limits
- **Cron jobs** can handle hundreds of reminders per run
- **Patient lookups** include phone numbers eagerly to reduce queries
- **Email templates** use inline CSS for email client compatibility

## Security

- Staff-only endpoints (require `requireUser()`)
- No sensitive data in logs
- Communication logged for HIPAA compliance
- Cron requires secret token if configured
- Patient contact preferences respected

## Extension Points

### Add New Template

1. Edit `src/lib/messaging/templates.ts`
2. Add function with template content
3. Update `TemplateName` type
4. Update `getTemplate()` switch
5. Add to dashboard select options

### Add New Channel

1. Create `src/lib/messaging/[channel].ts`
2. Implement `send[Channel](to, message)` function
3. Update dispatcher to handle new channel
4. Add to `Channel` type
5. Update dashboard UI

## Support

For issues or questions, check:
- `/MESSAGING_SYSTEM.md` - Full documentation
- `src/lib/messaging/` - Source code comments
- `src/app/api/messaging/` - API endpoint examples
- `src/app/(dashboard)/messaging/` - Dashboard implementation
