# Integrations Quick Start Guide

This guide helps you get started with the three new integrations: Twilio, Stripe, and Shipping Carriers.

## Quick Setup

### 1. Twilio SMS/Voice/Fax

**Sign up:**
1. Go to https://www.twilio.com
2. Create account and verify phone number
3. Buy a phone number for SMS
4. Get Account SID and Auth Token from dashboard

**Environment variables (.env.local):**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_FAX_NUMBER=+1234567891  # optional
```

**Test it:**
```bash
curl -X POST http://localhost:3000/api/integrations/twilio/test \
  -H "Content-Type: application/json"
```

**Send an SMS:**
```bash
curl -X POST http://localhost:3000/api/integrations/twilio \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sms",
    "to": "+14155552671",
    "body": "Your refill is ready for pickup"
  }'
```

---

### 2. Stripe Payments

**Sign up:**
1. Go to https://stripe.com
2. Create account
3. Go to Developers → API Keys
4. Copy Secret Key and Publishable Key
5. Create webhook endpoint (see webhook setup below)
6. Copy webhook signing secret

**Environment variables (.env.local):**
```bash
STRIPE_SECRET_KEY=sk_test_51234567890abcdefg
STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefg
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefg
```

**Test it:**
```bash
curl -X POST http://localhost:3000/api/integrations/payments/test \
  -H "Content-Type: application/json"
```

**Create a payment:**
```bash
curl -X POST http://localhost:3000/api/integrations/payments \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "amount": 5000,
    "currency": "usd",
    "metadata": {
      "orderId": "ORD123",
      "patientId": "PAT456"
    }
  }'
```

**Frontend integration:**
- Use the `client_secret` from response with Stripe.js
- Let customer complete payment on frontend
- Handle webhook for payment confirmation

---

### 3. Shipping Carriers

**USPS Setup:**
1. Go to https://www.usps.com/business/web-tools-apis/
2. Register for Web Tools API
3. Get your User ID

**UPS Setup:**
1. Go to https://developer.ups.com
2. Create developer account
3. Create OAuth app
4. Get Client ID and Secret

**FedEx Setup:**
1. Go to https://developer.fedex.com
2. Create account
3. Get API Key and Secret

**Environment variables (.env.local):**
```bash
USPS_USER_ID=your_usps_user_id
UPS_CLIENT_ID=your_ups_client_id
UPS_CLIENT_SECRET=your_ups_secret
FEDEX_API_KEY=your_fedex_api_key
FEDEX_SECRET_KEY=your_fedex_secret
```

**Test it:**
```bash
curl -X POST http://localhost:3000/api/integrations/shipping/test \
  -H "Content-Type: application/json" \
  -d '{"carrier": "all"}'
```

**Get shipping rates:**
```bash
curl -X POST http://localhost:3000/api/integrations/shipping \
  -H "Content-Type: application/json" \
  -d '{
    "action": "rates",
    "origin": {
      "line1": "123 Main St",
      "city": "New Orleans",
      "state": "LA",
      "postalCode": "70112"
    },
    "destination": {
      "line1": "456 Oak Ave",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001"
    },
    "package": {
      "weight": 16,
      "length": 12,
      "width": 8,
      "height": 4
    }
  }'
```

**Track a package (public endpoint):**
```bash
curl http://localhost:3000/api/integrations/shipping/track/1Z123456789US
```

---

## Common Tasks

### Send Bulk SMS
```typescript
import { twilioClient } from "@/lib/integrations/twilio";

const result = await twilioClient.sendBulkSMS([
  { to: "+14155552671", body: "Prescription ready" },
  { to: "+14155552672", body: "Prescription ready" },
]);
```

### Create Payment & Capture
```typescript
import { stripePaymentClient } from "@/lib/integrations/payments";

// Create intent
const intent = await stripePaymentClient.createPaymentIntent(5000, "usd");

// Later, capture it
const captured = await stripePaymentClient.capturePayment(intent.data.id);
```

### Get Tracking Status
```typescript
import { shippingClient } from "@/lib/integrations/shipping-carriers";

// Auto-detects carrier from tracking number
const tracking = await shippingClient.getTrackingInfo("ups", "1Z123456789");
```

---

## Webhook Configuration

### Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set URL: `https://yourdomain.com/api/integrations/payments/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.created`
5. Copy the signing secret
6. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### Twilio Webhook

1. Go to Twilio Console → Phone Numbers
2. Click your SMS number
3. Scroll to "Messaging"
4. Set "Webhook URL" to: `https://yourdomain.com/api/integrations/twilio/webhook`
5. Set method to POST

---

## Development Mode

If credentials aren't configured, integrations run in **dev mode**:
- SMS/calls/faxes log to console instead of being sent
- Payments return mock data
- Shipping rates return example quotes
- Great for testing without credentials!

To enable dev mode:
- Leave environment variables blank
- APIs will return success but log to console instead

---

## Error Handling

All integrations return consistent error format:
```typescript
{
  success: false,
  error: "Human-readable error message",
  errorCode?: "CODE_123"
}
```

Handle errors like this:
```typescript
const result = await twilioClient.sendSMS("+14155552671", "Hello");
if (!result.success) {
  console.error("Failed to send SMS:", result.error);
} else {
  console.log("Message SID:", result.data?.sid);
}
```

---

## Authentication

All endpoints require authentication as a pharmacist/admin except:
- `GET /api/integrations/shipping/track/[trackingNumber]` — **PUBLIC**
- Webhook endpoints — signature-verified, not user-authenticated

Get current user in API routes:
```typescript
import { getCurrentUser } from "@/lib/auth";

const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

---

## Audit Logging

All transactions are automatically logged. View them in the database:
```sql
SELECT * FROM "AuditLog"
WHERE action LIKE 'twilio_%'
  OR action LIKE 'stripe_%'
  OR action LIKE 'shipping_%'
ORDER BY "createdAt" DESC;
```

---

## Testing

**Test SMS:**
```bash
POST /api/integrations/twilio
{
  "type": "sms",
  "to": "+14155552671",
  "body": "Test message"
}
```

**Test Payment:**
```bash
POST /api/integrations/payments
{
  "action": "create",
  "amount": 100,  # $1.00
  "currency": "usd"
}
```

**Test Shipping:**
```bash
POST /api/integrations/shipping
{
  "action": "rates",
  "origin": {...},
  "destination": {...},
  "package": {...}
}
```

---

## Limits & Quotas

| Service | Limit | Notes |
|---------|-------|-------|
| Twilio SMS | 100/sec per account | Contact support to increase |
| Stripe | 100 req/sec | Burst to 100/min |
| USPS | 500/day | Varies by API |
| UPS | See plan | Depends on account tier |
| FedEx | See plan | Depends on account tier |

---

## Support & Docs

- **Twilio:** https://www.twilio.com/docs
- **Stripe:** https://stripe.com/docs
- **USPS:** https://www.usps.com/business/web-tools-apis/
- **UPS:** https://developer.ups.com/docs
- **FedEx:** https://developer.fedex.com/api/rest

See detailed guide: `src/lib/integrations/INTEGRATIONS.md`
