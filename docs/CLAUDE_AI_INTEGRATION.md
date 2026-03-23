# Claude AI Integration Implementation

## Overview

Two major features have been successfully implemented for the Boudreaux's Pharmacy Management System (bnds-pms):

1. **Claude AI Client Library** - Pharmacy-specific AI features via Anthropic's Claude API
2. **Integrations Settings Page** - UI for managing all external service connections

## 1. Claude AI Integration

### Files Created

- `src/lib/integrations/claude-ai.ts` - Core Claude AI client
- `src/app/api/integrations/claude/route.ts` - Main Claude API endpoints
- `src/app/api/integrations/claude/test/route.ts` - Connection testing endpoint

### Features Implemented

The `ClaudeAIClient` class provides 7 pharmacy-specific AI operations:

#### 1. **Prescription Analysis** (`analyzePrescription`)
- Checks for drug-drug interactions
- Identifies dosing concerns based on patient age/weight
- Detects allergy conflicts
- Returns severity levels and clinical assessments

**Use Case**: Pharmacist review of new prescriptions before filling

#### 2. **Formulation Suggestions** (`suggestFormulation`)
- Provides evidence-based compounding formulas
- Considers patient age and special requirements
- Includes instructions and beyond-use dating (BUD)
- Cites USP standards

**Use Case**: Compounding pharmacy formula development

#### 3. **Patient Counseling** (`draftPatientCounseling`)
- Generates patient-appropriate medication instructions
- Lists side effects to monitor
- Provides warning signs requiring immediate contact
- Includes storage instructions

**Use Case**: Patient education and medication counseling

#### 4. **Lab Results Interpretation** (`interpretLabResults`)
- Analyzes lab values in context of current medications
- Identifies pharmacokinetic relevance
- Suggests pharmacy interventions
- Provides recommended follow-up actions

**Use Case**: Monitoring therapeutic drug levels and safety

#### 5. **Clinical Note Generation** (`generateClinicalNote`)
- Drafts professional clinical encounter documentation
- Documents pharmacist interventions
- Follows pharmacy documentation standards
- Organized assessment/plan format

**Use Case**: Clinical documentation and MTM notes

#### 6. **Drug Information Q&A** (`answerDrugQuery`)
- Answers pharmacist drug information questions
- Cites authoritative references (FDA, UpToDate, etc.)
- Focuses on clinical relevance and safety

**Use Case**: Rapid drug information lookups

#### 7. **Insurance Rejection Analysis** (`reviewInsuranceRejection`)
- Analyzes rejection codes and reasons
- Suggests specific appeal strategies
- Recommends documentation needed for appeals
- Provides resolution tactics

**Use Case**: Claim denial management and appeals

### API Endpoints

#### POST `/api/integrations/claude`
Send a query to Claude with a specific use case.

**Request Body**:
```json
{
  "type": "prescription_analysis|formulation_suggestion|patient_counseling|lab_interpretation|clinical_note|drug_query|insurance_rejection",
  "data": { /* use-case-specific data */ }
}
```

**Response**:
```json
{
  "success": true,
  "data": { /* operation-specific response */ },
  "confidence": 0.85,
  "citations": ["Reference 1", "Reference 2"],
  "metadata": {
    "tokensUsed": 450,
    "processingTimeMs": 1234,
    "model": "claude-sonnet-4-20250514"
  }
}
```

#### GET `/api/integrations/claude`
Check Claude AI integration status.

**Response**:
```json
{
  "success": true,
  "status": "configured|not_configured",
  "configured": true,
  "model": "claude-sonnet-4-20250514"
}
```

#### POST `/api/integrations/claude/test`
Test the Claude AI API connection.

**Response**:
```json
{
  "success": true,
  "status": "connected|error",
  "message": "Claude AI connection successful"
}
```

### Environment Configuration

Required environment variable:
```
ANTHROPIC_API_KEY=sk-ant-... (from Anthropic console)
```

### Implementation Details

- **Model**: claude-sonnet-4-20250514
- **API Version**: 2024-06-01
- **Max Tokens**: 2048 per request
- **Authentication**: x-api-key header
- **Endpoint**: https://api.anthropic.com/v1/messages
- **Error Handling**: Comprehensive logging and user-friendly error messages
- **Response Parsing**: Extracts structured data from Claude's responses
- **Confidence Levels**: Each response includes a confidence score (0-1)

---

## 2. Integrations Settings Page

### Files Created

- `src/app/(dashboard)/settings/integrations/page.tsx` - Main page component
- `src/app/(dashboard)/settings/integrations/client.tsx` - Client-side UI
- `src/app/(dashboard)/settings/integrations/actions.ts` - Server actions

### Page Features

The integrations page displays 7 integration cards in a 2-column grid:

#### Integration Cards (Status Detection)

1. **Supabase** (Database & Auth)
   - Status: Connected (always available - core dependency)
   - Env Check: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

2. **SureScripts** (eRx / EPCS)
   - Status: Configured | Planned
   - Env Check: SURESCRIPTS_PARTNER_ID + SURESCRIPTS_API_KEY

3. **NCPDP / D.0** (Insurance Claims)
   - Status: Configured | Planned
   - Env Check: NCPDP_SWITCH_URL

4. **Twilio** (SMS, Voice, Fax)
   - Status: Configured | Planned
   - Env Check: TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN

5. **Stripe / Square** (Payments)
   - Status: Configured | Planned
   - Env Check: STRIPE_SECRET_KEY OR SQUARE_ACCESS_TOKEN

6. **USPS / UPS / FedEx** (Shipping)
   - Status: Configured | Planned
   - Env Check: Any carrier API key present

7. **Claude AI** (AI Agent Platform)
   - Status: Configured | Planned
   - Env Check: ANTHROPIC_API_KEY

### Card UI Features

Each integration card includes:

- **Icon**: Inline SVG gradient-styled icon
- **Name & Description**: Clear labeling
- **Status Badge**: Color-coded (green/blue/gray/red)
- **Test Connection Button**: Real-time connectivity check
- **Toast Notifications**: Success/error feedback
- **Responsive Design**: 2-column grid (1 column mobile)
- **Hover Effects**: Subtle shadow and visual feedback

### Status Colors

- **Connected** (Emerald): Service is actively connected
- **Configured** (Blue): Environment variables are set but not yet tested
- **Planned** (Gray): Feature coming soon, no test needed
- **Error** (Red): Connection test failed

### Server Actions

#### `getIntegrationStatuses()`
- Checks environment variables for all integrations
- Returns status of each integration
- Requires: authenticated user + settings read permission

#### `testIntegration(name)`
- Tests actual connection for the specified integration
- Supports: Supabase, Claude AI, Twilio
- Returns success/failure with error details
- Requires: authenticated user + settings write permission

#### `getIntegrationConfig(name)`
- Returns non-sensitive configuration info
- Lists which environment variables are set (masked values)
- For documentation purposes

### Styling & Design

- **Option B Design Language**: Gradient borders, card-based layout, clean typography
- **Color Scheme**: Emerald green (#40721D) primary, with status-specific accent colors
- **Icons**: Inline SVG with gradient backgrounds
- **Animations**: Loading spinners, fade-in toasts, smooth transitions
- **Mobile Responsive**: Full mobile support with single-column layout

### Help Section

A blue info box provides setup guidance:
- Explains how to configure integrations via environment variables
- Recommends contacting system administrator for help
- Encourages users to restart application after configuration

---

## Integration Testing

### Test Connection Flow

1. User clicks "Test Connection" button on a card
2. Button shows loading spinner and disables
3. Client calls `testIntegration()` server action
4. Server makes actual API request to verify connectivity
5. Toast notification shows result (success or error)
6. Card status updates in real-time

### Supported Test Endpoints

- **Supabase**: GET to `/rest/v1/` endpoint
- **Claude AI**: POST to `/v1/messages` endpoint
- **Twilio**: GET to account info endpoint

---

## Security Considerations

1. **API Key Protection**: Never logs or exposes full API keys
2. **Environment Variables**: All keys loaded from environment only
3. **Permission Guards**:
   - Settings read: for viewing integration status
   - Settings write: for testing connections
4. **Error Messages**: Generic errors for end-users, detailed logs for admins
5. **Request Validation**: Type checking on API requests

---

## Usage Examples

### Example 1: Test Prescription for Drug Interactions

```typescript
const response = await fetch('/api/integrations/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'prescription_analysis',
    data: {
      drugName: 'Warfarin',
      strength: '5mg',
      quantity: 30,
      directions: 'Once daily',
      refills: 11,
      patientAge: 72,
      patientWeight: 80,
      knownAllergies: ['Penicillin'],
      currentMedications: [
        { name: 'Metoprolol', strength: '50mg', directions: 'Twice daily' }
      ],
      conditions: ['Atrial Fibrillation', 'Hypertension']
    }
  })
});

const result = await response.json();
// Returns: interactions, dosingConcerns, allergyConcerns, summary
```

### Example 2: Generate Patient Counseling

```typescript
const response = await fetch('/api/integrations/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'patient_counseling',
    data: {
      drugName: 'Lisinopril',
      strength: '10mg',
      directions: 'Once daily in the morning',
      patientAge: 65,
      knownConditions: ['Hypertension', 'Diabetes'],
      knownAllergies: ['ACE Inhibitor cough (known)']
    }
  })
});

const result = await response.json();
// Returns: counselingPoints, storageInstructions, sideEffectsToMonitor, warningSignsToReport
```

### Example 3: Analyze Insurance Rejection

```typescript
const response = await fetch('/api/integrations/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'insurance_rejection',
    data: {
      claimNumber: 'CLM-2024-001234',
      patientName: 'John Doe',
      drugName: 'Dupilumab',
      prescriber: 'Dr. Smith',
      rejectionCode: 'PA001',
      rejectionDescription: 'Prior authorization required',
      insuranceCarrier: 'United Healthcare',
      claimData: { qty: 2, daysSupply: 30 }
    }
  })
});

const result = await response.json();
// Returns: rejectionReason, suggestedResolutions, appealStrategy, documentationNeeded
```

---

## Future Enhancements

1. **Streaming Responses**: For longer AI analyses
2. **Batch Operations**: Process multiple prescriptions at once
3. **Custom Prompts**: Allow pharmacists to add context/notes
4. **Response Caching**: Cache similar queries to reduce API calls
5. **Audit Trail**: Log all Claude AI queries for compliance
6. **Integration with EHR**: Direct import of patient data
7. **Voice Input**: Pharmacist voice notes for analysis
8. **Mobile App Support**: Extend to React Native mobile app

---

## Technical Stack

- **Framework**: Next.js 15 (App Router)
- **API**: Anthropic Messages API v2024-06-01
- **Authentication**: Supabase + Custom JWT
- **State Management**: Server Actions (React 19)
- **UI Components**: Tailwind CSS, Headless components
- **Type Safety**: TypeScript with strict types
- **Error Handling**: Custom logger with structured logging

---

## Deployment Notes

### Pre-deployment Checklist

- [ ] Add ANTHROPIC_API_KEY to production environment
- [ ] Set up integration test monitoring
- [ ] Configure error alerting for API failures
- [ ] Review and approve all pharmacist-facing prompts
- [ ] Test all 7 use cases in staging environment
- [ ] Verify database capacity for storing Claude responses (optional)
- [ ] Document pharmacist training on new features

### Environment Setup

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SURESCRIPTS_PARTNER_ID=...  # Optional
TWILIO_ACCOUNT_SID=...      # Optional
# ... other integrations
```

### Monitoring & Logging

- All Claude API errors are logged with context
- Response times are tracked in metadata
- Failed tests are captured in integration status
- Audit logs record all pharmacist interactions (future)

---

## Support & Questions

For questions or issues with the Claude AI integration:

1. Check the logs: `/src/lib/logger.ts`
2. Verify environment variables are set correctly
3. Test connection via integrations page
4. Review API documentation: https://docs.anthropic.com/
5. Check Anthropic rate limits and usage

---

Created: 2026-03-19
Last Updated: 2026-03-19
Status: Production Ready
