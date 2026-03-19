# Boudreaux's Pharmacy - Third-Party Integrations

This document provides an overview of the three major third-party integrations built for the PMS system.

## Architecture Overview

All integrations follow consistent patterns:
- **Native fetch only** — no external npm packages required
- **TypeScript interfaces** — fully typed request/response objects
- **Error handling** — comprehensive error messages with logging
- **Audit logging** — all transactions logged via Prisma audit log
- **Dev mode fallback** — graceful degradation in development when credentials missing
- **Authentication** — user authentication via `getCurrentUser()` on API endpoints (except webhooks)

## 1. Twilio Integration (SMS/Voice/Fax)

**Location:** `src/lib/integrations/twilio.ts`

### Features
- **SMS**: Send single or bulk SMS messages
- **Voice**: Initiate outbound calls with TwiML, generate IVR scripts
- **Fax**: Send faxes to prescribers
- **Tracking**: Get message/call/fax delivery status
- **History**: Query sent message history with filters

### Environment Variables
```
TWILIO_ACCOUNT_SID       # Your Twilio Account SID
TWILIO_AUTH_TOKEN        # Your Twilio Auth Token
TWILIO_PHONE_NUMBER      # Pharmacy SMS phone number (e.g., +1234567890)
TWILIO_FAX_NUMBER        # Pharmacy fax number (for outbound faxes)
```

### Core Methods

#### SMS Methods
```typescript
// Send single SMS
const result = await twilioClient.sendSMS("+14155552671", "Your refill is ready");

// Send bulk SMS to multiple recipients
const result = await twilioClient.sendBulkSMS([
  { to: "+14155552671", body: "Refill ready" },
  { to: "+14155552672", body: "Refill ready" }
]);

// Get message status
const status = await twilioClient.getMessageStatus("SM123abc");

// Get SMS history
const history = await twilioClient.getSMSHistory({
  limit: 50,
  dateSentAfter: "2024-01-01",
  status: "delivered"
});
```

#### Voice Methods
```typescript
// Make outbound call
const result = await twilioClient.makeCall("+14155552671", twimlString);

// Generate IVR (Interactive Voice Response)
const twiml = twilioClient.generateIVR([
  { digit: "1", description: "Check status", action: "check-status" },
  { digit: "2", description: "Request refill", action: "refill" }
]);

// Get call status
const status = await twilioClient.getCallStatus("CA123abc");
```

#### Fax Methods
```typescript
// Send fax
const result = await twilioClient.sendFax("+14155552671", "https://example.com/doc.pdf");

// Get fax status
const status = await twilioClient.getFaxStatus("FX123abc");
```

### API Routes

**POST /api/integrations/twilio**
```json
{
  "type": "sms|voice|fax",
  "to": "+1234567890",
  "body": "Message (SMS/Voice IVR)",
  "mediaUrl": "https://example.com/file.pdf (Fax only)",
  "twiml": "<Response>...</Response> (Voice only, optional)"
}
```

**GET /api/integrations/twilio**
- Returns connection status

**POST /api/integrations/twilio/test**
- Test connection credentials

**POST /api/integrations/twilio/webhook**
- Receives Twilio status callbacks (no auth required)
- Handles SMS delivery receipts, call events, fax status

### Use Cases
- Prescription refill reminders via SMS
- Outbound calls for pickup notifications
- Refill request IVR ("Press 1 to refill prescription")
- Fax prescriber communications

---

## 2. Stripe Payment Processing

**Location:** `src/lib/integrations/payments.ts`

### Features
- **Payment Intents**: Create payment intents for POS transactions
- **Capture/Refund**: Capture authorized payments and process refunds
- **Customers**: Create and manage Stripe customer records linked to patients
- **Payment Methods**: Save cards on file for recurring charges
- **Webhooks**: Handle Stripe events (payment succeeded, failed, refunded)
- **History**: Query transaction history with date range filters

### Environment Variables
```
STRIPE_SECRET_KEY           # Stripe secret API key (sk_live_... or sk_test_...)
STRIPE_PUBLISHABLE_KEY      # Stripe publishable key (pk_live_... or pk_test_...)
STRIPE_WEBHOOK_SECRET       # Webhook signing secret (whsec_...)
```

### Core Methods

#### Payment Intent
```typescript
// Create payment intent
const result = await stripePaymentClient.createPaymentIntent(
  5000,  // amount in cents ($50.00)
  "usd",
  { orderId: "ORD123", patientId: "PAT456" }
);
// Returns: PaymentIntent with client_secret for frontend tokenization

// Get payment status
const status = await stripePaymentClient.getPaymentStatus("pi_1234567890");

// Capture authorized payment
const result = await stripePaymentClient.capturePayment("pi_1234567890");

// Refund payment (full or partial)
const result = await stripePaymentClient.refundPayment("pi_1234567890", 2500); // partial refund
```

#### Customer Management
```typescript
// Create customer linked to patient
const customer = await stripePaymentClient.createCustomer({
  email: "patient@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890",
  address: {
    line1: "123 Main St",
    city: "New York",
    state: "NY",
    postalCode: "10001"
  }
});

// Attach payment method to customer (save card on file)
const result = await stripePaymentClient.attachPaymentMethod(
  "cus_1234567890",
  "pm_1234567890"
);
```

#### Transaction History
```typescript
// Get transaction history
const history = await stripePaymentClient.getTransactionHistory({
  limit: 50,
  created: {
    gte: 1609459200,  // Jan 1, 2021
    lte: 1640995199   // Dec 31, 2021
  }
});
```

#### Webhook Handling
```typescript
// In webhook route
const result = stripePaymentClient.processWebhook(
  rawBody,      // Raw request body
  signature     // stripe-signature header value
);

// Event types to handle:
// - payment_intent.succeeded
// - payment_intent.payment_failed
// - charge.refunded
// - customer.created
```

### API Routes

**POST /api/integrations/payments**
```json
{
  "action": "create|capture|refund",
  "amount": 5000,
  "currency": "usd",
  "paymentIntentId": "pi_... (for capture/refund)",
  "metadata": { "orderId": "...", "patientId": "..." }
}
```

**GET /api/integrations/payments**
- Returns connection status

**POST /api/integrations/payments/test**
- Test API credentials

**POST /api/integrations/payments/webhook**
- Receives Stripe webhook events (no auth required)
- Handles payment succeeded/failed, refunds, customer creation

### Use Cases
- POS payment processing at pickup
- Patient portal online payments
- Recurring prescription refill charges
- Partial/full refunds for disputed transactions

---

## 3. Shipping Carriers (USPS/UPS/FedEx)

**Location:** `src/lib/integrations/shipping-carriers.ts`

### Features
- **Unified Interface**: Single API for all three carriers
- **Address Validation**: Validate and standardize addresses via USPS
- **Rate Quotes**: Get shipping rates from all configured carriers
- **Shipment Creation**: Create shipments and generate shipping labels
- **Tracking**: Track packages in real-time (auto-detects carrier from tracking number)
- **Cancellation**: Cancel/void shipments before shipping
- **Label Retrieval**: Get printable PDF shipping labels

### Environment Variables
```
USPS_USER_ID                # USPS Web Tools API user ID
UPS_CLIENT_ID               # UPS OAuth client ID
UPS_CLIENT_SECRET           # UPS OAuth client secret
FEDEX_API_KEY               # FedEx REST API key
FEDEX_SECRET_KEY            # FedEx API secret
```

### Core Methods

#### Address Validation
```typescript
// Validate address
const result = await shippingClient.validateAddress({
  line1: "123 Main St",
  city: "New York",
  state: "NY",
  postalCode: "10001"
});
// Returns: ValidatedAddress with deliverable flag
```

#### Rating & Shipping
```typescript
// Get rates from all configured carriers
const result = await shippingClient.getRates(
  { line1: "123 Main St", city: "New York", state: "NY", postalCode: "10001" },
  { line1: "456 Oak Ave", city: "Los Angeles", state: "CA", postalCode: "90001" },
  { weight: 16, length: 12, width: 8, height: 4 }
);
// Returns: Array of ShippingRate objects sorted by cost

// Create shipment
const result = await shippingClient.createShipment({
  carrier: "ups",
  from: { ... },
  to: { ... },
  package: { weight: 16, length: 12, width: 8, height: 4 },
  signature: true,
  insurance: true
});
// Returns: Shipment with tracking number and label URL
```

#### Tracking
```typescript
// Get tracking info (auto-detects carrier)
const result = await shippingClient.getTrackingInfo("ups", "1Z123456789");
// Returns: TrackingInfo with status and event history

// Via HTTP API (public endpoint - no auth required):
// GET /api/integrations/shipping/track/1Z123456789
// Auto-detects carrier from tracking number format
```

#### Shipment Management
```typescript
// Cancel shipment
const result = await shippingClient.cancelShipment("ups", "shipment-12345");

// Get label URL
const result = await shippingClient.getLabel("ups", "shipment-12345");

// Test carrier connection
const result = await shippingClient.testConnection("ups");
```

### API Routes

**POST /api/integrations/shipping**
```json
{
  "action": "rates|validate|create",

  "origin": { "line1": "...", "city": "...", "state": "...", "postalCode": "..." },
  "destination": { "line1": "...", "city": "...", "state": "...", "postalCode": "..." },
  "package": { "weight": 16, "length": 12, "width": 8, "height": 4 }
}
```

**GET /api/integrations/shipping**
- Returns connection status for all carriers

**GET /api/integrations/shipping/track/[trackingNumber]**
- Track any package (auto-detects carrier)
- **No authentication required** — public endpoint
- Response includes all tracking events and estimated delivery

**POST /api/integrations/shipping/test**
```json
{
  "carrier": "usps|ups|fedex|all"
}
```

### Tracking Number Formats (Auto-Detection)

| Carrier | Format | Example |
|---------|--------|---------|
| USPS | 9400xxxx... (22 digits) | 9400111899223456789012 |
| UPS | 1Zxxxxxxxx (18 chars) | 1Z123456789012345678 |
| FedEx | 12-14 digits | 123456789012 |

### Use Cases
- Address validation on patient profiles
- Pharmacy-to-patient shipment pricing
- Prescription shipment tracking
- Insurance/compliance documentation
- Multi-carrier rate comparison

---

## Integration Patterns

### Error Handling

All integrations return a consistent response structure:
```typescript
interface IntegrationResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}
```

Example handling:
```typescript
const result = await twilioClient.sendSMS("+14155552671", "Hello");
if (result.success) {
  console.log("Message SID:", result.data?.sid);
} else {
  console.error("Error:", result.error);
}
```

### Audit Logging

All transactions are logged to `AuditLog` table:
```typescript
{
  userId: user.id,
  action: "twilio_sms_send|stripe_payment|shipping_create",
  tableName: "communications|payments|shipments",
  recordId: messageId,
  newValues: { /* integration-specific data */ },
  ipAddress: request.headers.get("x-forwarded-for")
}
```

### Dev Mode

When credentials are not configured, integrations gracefully fall back to dev mode:
- Logs to console instead of making API calls
- Returns mock data with sensible defaults
- Allows development without configured credentials

Example:
```typescript
if (this.isDev) {
  logger.info("[Twilio SMS - DEV] SMS to +1234567890: ...");
  return {
    success: true,
    data: {
      sid: `dev-${Date.now()}`,
      status: "sent"
    }
  };
}
```

### Webhook Security

**Stripe webhooks** are signature-verified using HMAC-SHA256.
**Twilio webhooks** accept all incoming data (Twilio sends from trusted IPs).

All webhook events are logged to audit log with raw data for compliance.

---

## Environment Setup Checklist

### Twilio
- [ ] Create Twilio account at https://www.twilio.com
- [ ] Copy Account SID and Auth Token
- [ ] Buy a phone number for SMS
- [ ] (Optional) Buy a fax number
- [ ] Set webhook URL in Twilio console

### Stripe
- [ ] Create Stripe account at https://stripe.com
- [ ] Get API keys from Dashboard → Developers → API Keys
- [ ] Create webhook endpoint at https://yourdomain.com/api/integrations/payments/webhook
- [ ] Get webhook signing secret

### Shipping Carriers
- [ ] USPS: Register at https://www.usps.com/business/web-tools-apis/
- [ ] UPS: Create developer account at https://developer.ups.com
- [ ] FedEx: Sign up at https://developer.fedex.com
- [ ] Add credentials to environment variables

---

## Testing

Each integration has a `/test` endpoint:
```bash
# Twilio
curl -X POST http://localhost:3000/api/integrations/twilio/test

# Stripe
curl -X POST http://localhost:3000/api/integrations/payments/test

# Shipping
curl -X POST http://localhost:3000/api/integrations/shipping/test
```

All require authentication and return connection status.

---

## Implementation Notes

1. **No External Dependencies** — All integrations use native Node.js `fetch()` API and built-in `crypto` module
2. **Rate Limiting** — Consider implementing rate limiting for high-volume operations (bulk SMS, bulk tracking)
3. **Idempotency** — Store external transaction IDs (message SID, payment intent ID) for idempotent retries
4. **Compliance** — All SMS messages should include opt-out instructions per TCPA
5. **PCI Compliance** — Never log full credit card numbers; use Stripe tokenization
6. **Webhook Verification** — Always verify webhook signatures before processing
7. **Error Recovery** — Implement exponential backoff for transient failures
8. **Monitoring** — Monitor audit logs for integration failures and unusual patterns
