# Pharmacy Industry Integrations

This directory contains critical integrations for pharmacies to connect with prescribers and insurance networks using industry-standard protocols.

## Overview

### 1. SureScripts eRx/EPCS Integration

**File:** `surescripts.ts`

SureScripts is the primary network connecting pharmacies to prescribers for electronic prescriptions (eRx) and electronic prescribing of controlled substances (EPCS).

**Key Features:**
- Send prescription acknowledgements to prescribers
- Request therapy changes (dosage, quantity, alternative drugs)
- Submit refill/renewal requests
- Cancel prescriptions
- Process inbound NCPDP SCRIPT messages
- EPCS signature verification (stub)
- Real-time message status tracking

**Environment Variables Required:**
```
SURESCRIPTS_PARTNER_ID=<pharmacy_partner_id>
SURESCRIPTS_API_KEY=<api_authentication_key>
SURESCRIPTS_ENDPOINT=<base_url_for_api>
SURESCRIPTS_WEBHOOK_API_KEY=<webhook_authentication_key>
```

**API Usage:**

```typescript
import { surescriptsClient } from "@/lib/integrations/surescripts";

// Send prescription acknowledgement
const ack = await surescriptsClient.sendNewRxResponse(rxId, "received");

// Request therapy change
const change = await surescriptsClient.sendRxChangeRequest(
  rxId,
  "quantity",
  "Patient unable to afford quantity 30, requesting 15"
);

// Send renewal request
const renewal = await surescriptsClient.sendRxRenewalRequest(rxId, patientId);

// Cancel prescription
const cancel = await surescriptsClient.sendCancelRx(rxId, "Duplicate prescription");

// Check message status
const status = await surescriptsClient.getMessageStatus(messageId);

// Process inbound message
const message = await surescriptsClient.processInboundMessage(xmlData);

// Test connection
const test = await surescriptsClient.testConnection();
```

**Webhook Endpoint:** `POST /api/integrations/surescripts`
- Receives inbound NCPDP SCRIPT messages from SureScripts
- Authenticates with API key header: `Authorization: Bearer <SURESCRIPTS_WEBHOOK_API_KEY>`
- Routes messages to appropriate handlers:
  - NEWRX → IntakeQueueItem (pending processing)
  - RXCHG → Status log update
  - RXREN → Renewal creation
  - CANRX → Prescription cancellation

**Message Types Supported:**
- NEWRX: New prescription from prescriber
- RXCHG: Change request from prescriber
- RXREN: Renewal request from prescriber
- CANRX: Cancellation from prescriber
- RXSTAT: Status query
- ERROR: Error message

---

### 2. NCPDP D.0 Insurance Claims Integration

**File:** `ncpdp-claims.ts`

NCPDP D.0 (Telecommunications Standard) is the real-time claims format used to submit pharmacy claims to insurance companies through claims switches (e.g., MedImpact, Emdeon, Caremark).

**Key Features:**
- Submit B1 (billing) claims in real-time
- Submit B2 (reversal) transactions to reverse claims
- Submit B3 (rebill) transactions to resubmit with changes
- E1 (eligibility) verification in real-time
- Prior authorization (PA) requests
- NCPDP D.0 segment building and parsing
- Comprehensive field formatting per NCPDP spec

**Environment Variables Required:**
```
NCPDP_SWITCH_URL=<switch_endpoint_url>
NCPDP_SENDER_ID=<pharmacy_sender_id>
NCPDP_PASSWORD=<sender_password>
NCPDP_PROCESSOR_ID=<insurance_processor_id>
```

**API Usage:**

```typescript
import {
  ncpdpClaimsClient,
  type ClaimData,
  type EligibilityData,
  type PriorAuthRequest,
} from "@/lib/integrations/ncpdp-claims";

// Submit claim
const claimResult = await ncpdpClaimsClient.submitClaim({
  patientFirstName: "John",
  patientLastName: "Doe",
  patientDateOfBirth: "19800115",
  patientGender: "M",
  planBin: "610056",
  memberId: "123456789",
  prescriptionNumber: "RX123456",
  drugNdc: "50383011630",
  quantity: 30,
  daysSupply: 30,
  refillNumber: 0,
  prescriberNpi: "1234567890",
  pharmacyNpi: "1234567890",
  pharmacyNcpdpId: "0123456",
  ingredientCost: 45.00,
  dispensingFee: 2.50,
  totalAmount: 47.50,
});

// Check eligibility
const eligibility = await ncpdpClaimsClient.checkEligibility(
  {
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "19800115",
  },
  {
    memberId: "123456789",
    bin: "610056",
    groupNumber: "12345",
  }
);

// Prior authorization
const priorAuth = await ncpdpClaimsClient.priorAuthRequest({
  patientFirstName: "John",
  patientLastName: "Doe",
  patientDateOfBirth: "19800115",
  memberId: "123456789",
  planBin: "610056",
  drugNdc: "50383011630",
  quantity: 90,
  daysSupply: 90,
  prescriberNpi: "1234567890",
  pharmacyNpi: "1234567890",
  reason: "Non-formulary medication",
});

// Reverse a claim
const reversal = await ncpdpClaimsClient.reverseClaim(claimId);

// Rebill with changes
const rebill = await ncpdpClaimsClient.submitRebill(claimId, {
  quantity: 15,
  daysSupply: 15,
  // ... other changed fields
});

// Test connection
const test = await ncpdpClaimsClient.testConnection();
```

**Claim Response:**
```typescript
{
  claimId: string;
  status: "approved" | "rejected" | "denied" | "pended" | "hold";
  approvedAmount?: number;
  approvedCopay?: number;
  denialCodes?: string[];
  denialMessages?: string[];
  messageId: string;
  rawResponse?: string;
}
```

**NCPDP Segment Format:**

Claims are built using NCPDP D.0 segments:
- ISA (Interchange Control Header)
- GS (Functional Group Header)
- ST (Transaction Set Header)
- 100 (Claim Header)
- 200 (Insurance/Payer)
- 210 (Patient)
- 220 (Pharmacy)
- 230 (Prescriber)
- 300 (Drug/Prescription)
- 400 (Pricing)
- SE (Transaction Trailer)
- GE (Group Trailer)
- IEA (Interchange Trailer)

**Field Formatting:**
- AN (Alphanumeric): Left justify, pad right
- N (Numeric): Right justify, pad left with zeros
- D (Date): YYYYMMDD format
- R (Real/Decimal): Right justify with 2 decimal places

---

## API Routes

### SureScripts Routes

**POST /api/integrations/surescripts**
- Receives inbound messages from SureScripts webhook
- Authentication: `Authorization: Bearer <SURESCRIPTS_WEBHOOK_API_KEY>`
- Body: XML or JSON with NCPDP SCRIPT message
- Response: `{ success: boolean, messageId: string, processed: boolean, action: string }`

**GET /api/integrations/surescripts**
- Check SureScripts connection status
- Requires authenticated user
- Response: `{ connected: boolean, message: string, timestamp: Date }`

**POST /api/integrations/surescripts/test**
- Test SureScripts connection (admin/pharmacist only)
- Optional body: `{ partnerId?, apiKey?, endpoint? }`
- Response: `{ success: boolean, connected: boolean, message: string, timestamp: Date, tested_by: string }`

### NCPDP Routes

**POST /api/integrations/ncpdp**
- Submit claim, check eligibility, or prior auth request (admin/pharmacist only)
- Body: `{ claimData: ClaimData, actionType: "submit"|"reverse"|"rebill"|"eligibility"|"priorauth" }`
- Response: `{ success: boolean, claimId?, messageId: string, status: string, approvedAmount?, denialCodes?, denialMessages? }`

**GET /api/integrations/ncpdp**
- Check NCPDP switch connection status
- Requires authenticated user
- Response: `{ connected: boolean, message: string, timestamp: Date }`

**POST /api/integrations/ncpdp/test**
- Test NCPDP switch connection (admin/pharmacist only)
- Optional body: `{ switchUrl?, senderId?, password?, processorId? }`
- Response: `{ success: boolean, connected: boolean, message: string, timestamp: Date, tested_by: string }`

---

## Audit Trail

All integration transactions are logged to the `AuditLog` table:
- Action: `surescripts_inbound_message`, `ncpdp_claim_submit`, etc.
- Resource ID: Message ID or Claim ID
- Changes: Full transaction details
- IP Address: Request origin

---

## Security Considerations

1. **API Keys**: Store all credentials in environment variables, never in code
2. **HTTPS**: Always use HTTPS for all outbound requests
3. **Authentication**: Webhook endpoints require API key header authentication
4. **Authorization**: API routes check user roles (admin/pharmacist)
5. **Logging**: All transactions are audited for compliance
6. **Error Handling**: Sensitive information is never exposed in error messages
7. **Rate Limiting**: Implement rate limiting on API routes (recommended)

---

## Error Handling

Both clients return typed errors:

```typescript
interface SureScriptsError {
  code: string;
  message: string;
  details?: string;
}

// Thrown on API errors
try {
  await surescriptsClient.sendNewRxResponse(rxId, status);
} catch (error) {
  // error is SureScriptsError
  console.error(error.code, error.message);
}
```

---

## NCPDP/SureScripts Standards Reference

- **NCPDP SCRIPT**: XML format for eRx/EPCS messages (RxHub standard)
- **NCPDP D.0**: Telecommunications standard for real-time claims
- **NCPDP EPCS**: Electronic prescribing of controlled substances
- **DEA Form 106**: EPCS authorization requirement
- **HIPAA**: All transactions must comply with HIPAA privacy/security rules

---

## Testing

### Local Testing

Create a test script:

```typescript
import { surescriptsClient } from "@/lib/integrations/surescripts";
import { ncpdpClaimsClient } from "@/lib/integrations/ncpdp-claims";

// Test SureScripts
const sureScriptsStatus = await surescriptsClient.testConnection();
console.log("SureScripts:", sureScriptsStatus);

// Test NCPDP
const ncpdpStatus = await ncpdpClaimsClient.testConnection();
console.log("NCPDP:", ncpdpStatus);
```

### Via API

```bash
# Test SureScripts
curl -X POST http://localhost:3000/api/integrations/surescripts/test \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json"

# Test NCPDP
curl -X POST http://localhost:3000/api/integrations/ncpdp/test \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json"
```

---

## Future Enhancements

1. **EPCS Full Implementation**: Complete EPCS signature verification with certificate chain validation
2. **Message Caching**: Implement Redis-backed message caching for performance
3. **Retry Logic**: Add exponential backoff for failed transactions
4. **Switch Multi-routing**: Support multiple claims switches with automatic failover
5. **Real-time Monitoring**: Add Prometheus metrics and alerting
6. **Batch Processing**: Support batch claim submissions for off-peak hours
7. **Prior Auth Tracking**: Build PriorAuthRequest model in Prisma for full tracking
8. **Claim Status Polling**: Scheduled jobs to poll claim status from switches
