# Claude AI Client - Usage Examples

This document provides practical examples for using the `ClaudeAIClient` from `claude-ai.ts`.

## Quick Start

### 1. Import and Initialize

```typescript
import { claudeAIClient } from "@/lib/integrations/claude-ai";

// Client is a singleton, ready to use
// Requires ANTHROPIC_API_KEY environment variable
```

### 2. Test Connection

```typescript
// Test if Claude AI is configured and accessible
const result = await claudeAIClient.testConnection();

if (result.success) {
  console.log("Connected to Claude AI");
} else {
  console.error("Connection failed:", result.error);
}
```

---

## Example 1: Prescription Interaction Analysis

**Scenario**: Pharmacist wants to check new prescription for interactions before filling.

```typescript
const prescriptionData = {
  drugName: "Metformin",
  strength: "850mg",
  quantity: 60,
  directions: "One tablet three times daily with meals",
  refills: 11,
  patientAge: 58,
  patientWeight: 82, // kg
  knownAllergies: ["Sulfonamides"],
  currentMedications: [
    {
      name: "Lisinopril",
      strength: "10mg",
      directions: "Once daily"
    },
    {
      name: "Atorvastatin",
      strength: "20mg",
      directions: "Once daily at bedtime"
    }
  ],
  conditions: ["Type 2 Diabetes", "Hypertension", "Hyperlipidemia"],
  notes: "Patient just started insulin glargine 3 days ago"
};

const analysis = await claudeAIClient.analyzePrescription(prescriptionData);

if (analysis.success) {
  console.log("Drug Interactions:", analysis.data?.interactions);
  // Output: [
  //   {
  //     drug: "Insulin Glargine",
  //     severity: "high",
  //     description: "Both metformin and insulin lower blood glucose..."
  //   }
  // ]

  console.log("Dosing Concerns:", analysis.data?.dosingConcerns);
  // Output: ["Moderate renal function - verify eGFR..."]

  console.log("Allergy Concerns:", analysis.data?.allergyConcerns);
  // Output: [] (No sulfonamide in metformin)

  console.log("Confidence:", analysis.confidence);
  // Output: 0.85
} else {
  console.error("Analysis failed:", analysis.error);
}
```

---

## Example 2: Compounding Formulation Suggestion

**Scenario**: Pharmacist needs help with a custom formulation for a pediatric patient.

```typescript
const formulationRequest = {
  ingredients: [
    { name: "Albuterol Sulfate", quantity: 50, unit: "mg" },
    { name: "Glycerin", quantity: 100, unit: "mL" },
    { name: "Cherry Flavoring", quantity: 5, unit: "mL" },
    { name: "Purified Water", quantity: qs, unit: "mL" }
  ],
  indication: "Bronchospasm relief - pediatric liquid",
  patientAge: 4,
  specialRequirements: "Pleasant tasting, easy to measure dosing, sterile"
};

const suggestion = await claudeAIClient.suggestFormulation(formulationRequest);

if (suggestion.success) {
  console.log("Recommended Formulation:", suggestion.data?.formulation);
  // Detailed formulation with concentrations

  console.log("Instructions:", suggestion.data?.instructions);
  // Step-by-step compounding procedure

  console.log("BUD (Beyond-Use Dating):", suggestion.data?.budDays);
  // 30 days for this liquid formulation

  console.log("References:", suggestion.citations);
  // ["USP <795>", "Remington's Pharmacy"]
} else {
  console.error("Formulation failed:", suggestion.error);
}
```

---

## Example 3: Patient Counseling Generation

**Scenario**: New prescription filled, need to generate counseling points.

```typescript
const counselingRequest = {
  drugName: "Warfarin",
  strength: "5mg",
  directions: "Take exactly as prescribed, one tablet once daily",
  patientAge: 68,
  knownConditions: ["Atrial Fibrillation", "Heart Valve Replacement"],
  knownAllergies: ["NSAID intolerance"]
};

const counseling = await claudeAIClient.draftPatientCounseling(counselingRequest);

if (counseling.success) {
  console.log("Counseling Points:");
  // Output:
  // [
  //   "Take at the same time every day - consistency is crucial",
  //   "Avoid sudden dietary changes, especially vitamin K (leafy greens)",
  //   "Do not start new medications without telling your pharmacist",
  //   "Report any unusual bleeding or bruising immediately"
  // ]

  console.log("Side Effects to Monitor:");
  // ["Bleeding", "Easy bruising", "Unusual nosebleeds"]

  console.log("Warning Signs (Call Doctor):");
  // [
  //   "Heavy bleeding from any source",
  //   "Sudden weakness or numbness",
  //   "Severe headache",
  //   "Blood in urine or stool"
  // ]

  console.log("Storage:", counseling.data?.storageInstructions);
  // "Room temperature, away from moisture and heat"
} else {
  console.error("Counseling generation failed:", counseling.error);
}
```

---

## Example 4: Lab Results Interpretation

**Scenario**: Patient on warfarin has new INR lab results, check therapeutic relevance.

```typescript
const labResults = [
  {
    testName: "International Normalized Ratio (INR)",
    value: 2.8,
    unit: "",
    referenceRange: "0.8-1.1 (non-anticoagulated); 2-3 (target with warfarin)",
    date: "2024-03-18"
  },
  {
    testName: "Hemoglobin",
    value: 13.2,
    unit: "g/dL",
    referenceRange: "13.5-17.5",
    date: "2024-03-18"
  },
  {
    testName: "Platelet Count",
    value: 180,
    unit: "K/uL",
    referenceRange: "150-400",
    date: "2024-03-18"
  }
];

const medications = [
  { name: "Warfarin", strength: "5mg" },
  { name: "Aspirin", strength: "81mg" },
  { name: "Lisinopril", strength: "10mg" }
];

const interpretation = await claudeAIClient.interpretLabResults(labResults, medications);

if (interpretation.success) {
  console.log("Interpretations:");
  // [
  //   {
  //     test: "INR",
  //     value: 2.8,
  //     interpretation: "Therapeutic range achieved...",
  //     pharmacokineticRelevance: "Warfarin dosing appears appropriate..."
  //   }
  // ]

  console.log("Overall Assessment:", interpretation.data?.overallAssessment);
  // "Patient is adequately anticoagulated with appropriate warfarin dosing..."

  console.log("Recommended Actions:", interpretation.data?.recommendedActions);
  // ["Continue current warfarin dose", "Recheck INR in 2 weeks", "Counsel on bleeding precautions"]
} else {
  console.error("Lab interpretation failed:", interpretation.error);
}
```

---

## Example 5: Clinical Note Generation

**Scenario**: Pharmacist completed MTM visit, need to document the encounter.

```typescript
const encounterData = {
  patientName: "Margaret Johnson",
  patientAge: 72,
  patientMRN: "BNDS-0047381",
  visitDate: "2024-03-18",
  chiefComplaint: "Medication review",
  presentingProblem: "Patient reported experiencing side effects from multiple medications",
  medicationsReviewed: [
    { name: "Metoprolol", strength: "50mg", directions: "Twice daily" },
    { name: "Atorvastatin", strength: "20mg", directions: "Once daily" },
    { name: "Lisinopril", strength: "10mg", directions: "Once daily" },
    { name: "Amlodipine", strength: "5mg", directions: "Once daily" },
    { name: "Metformin", strength: "1000mg", directions: "Twice daily" }
  ],
  assessmentAndPlan: "Patient experiencing fatigue and dizziness. Possible adverse effect from combination of beta-blocker and ACE inhibitor causing hypotension.",
  pharmacistInterventions: [
    "Recommended contacting prescriber about hypotension symptoms",
    "Suggested checking BP at home daily",
    "Counseled on medication timing to minimize interactions"
  ]
};

const note = await claudeAIClient.generateClinicalNote(encounterData);

if (note.success) {
  console.log("Clinical Note:");
  // Professional SOAP-format note for patient record
  // S: Patient report of symptoms
  // O: Medications reviewed, vital signs noted
  // A: Possible drug interaction causing hypotension
  // P: Contact prescriber, home BP monitoring, follow-up in 1 week

  console.log("Interventions Documented:");
  // ["Hypotension counseling", "BP monitoring recommendation", ...]

  console.log("Clinical Outcome:");
  // "Patient counseled on monitoring and advised to contact prescriber"
} else {
  console.error("Note generation failed:", note.error);
}
```

---

## Example 6: Drug Information Q&A

**Scenario**: Pharmacist receives question about a drug, needs quick answer with citations.

```typescript
const question = "What are the key differences between clopidogrel and ticagrelor in acute coronary syndrome?";

const answer = await claudeAIClient.answerDrugQuery(question);

if (answer.success) {
  console.log("Answer:", answer.data?.answer);
  // Comprehensive answer with clinical differences, dosing, monitoring

  console.log("Relevant Topics:", answer.data?.relevantTopics);
  // ["Antiplatelet agents", "ACS management", "Drug comparison", ...]

  console.log("Recommended Resources:", answer.data?.recommendedResources);
  // ["FDA Orange Book", "Micromedex", "UpToDate", ...]

  console.log("Confidence:", answer.confidence);
  // 0.9 (high confidence for well-established drugs)

  console.log("Citations:", answer.citations);
  // ["FDA", "Clinical Evidence Databases"]
} else {
  console.error("Drug query failed:", answer.error);
}
```

---

## Example 7: Insurance Rejection Analysis

**Scenario**: Claim was rejected, need to find best resolution strategy.

```typescript
const rejection = {
  claimNumber: "CLM-2024-0156248",
  patientName: "Robert Williams",
  drugName: "Dupilumab",
  prescriber: "Dr. Sarah Mitchell",
  rejectionCode: "B2",
  rejectionDescription: "Prior Authorization required - clinical criteria not met",
  insuranceCarrier: "UnitedHealthcare",
  claimData: {
    ndc: "0023-5671-02",
    quantity: 2,
    daysSupply: 30,
    strength: "300mg/2mL prefilled pen",
    indication: "Moderate-to-severe atopic dermatitis",
    priorAuth: "Not submitted"
  }
};

const review = await claudeAIClient.reviewInsuranceRejection(rejection);

if (review.success) {
  console.log("Rejection Reason:", review.data?.rejectionReason);
  // "Prior authorization requirements not met for dupilumab"

  console.log("Suggested Resolutions:", review.data?.suggestedResolutions);
  // [
  //   "Submit prior authorization with recent EASI score and treatment history",
  //   "Provide documentation of failed topical therapy",
  //   "Include recent dermatology notes"
  // ]

  console.log("Appeal Strategy:", review.data?.appealStrategy);
  // Detailed strategy including documentation needed, timeline, contact info

  console.log("Documentation Needed:", review.data?.documentationNeeded);
  // [
  //   "EASI (Eczema Area and Severity Index) assessment",
  //   "Failed topical corticosteroid documentation",
  //   "Dermatologist evaluation note"
  // ]
} else {
  console.error("Rejection analysis failed:", review.error);
}
```

---

## Error Handling

### Pattern 1: Try-Catch with Fallback

```typescript
try {
  const result = await claudeAIClient.analyzePrescription(data);
  if (!result.success) {
    // Handle API error
    console.error("Claude returned error:", result.error);
    // Show user-friendly message
  } else {
    // Process result
    handleAnalysis(result.data);
  }
} catch (error) {
  // Network or runtime error
  console.error("Request failed:", error);
  showErrorToUser("Unable to analyze prescription. Please try again.");
}
```

### Pattern 2: Confidence-Based Actions

```typescript
const result = await claudeAIClient.answerDrugQuery(question);

if (result.success && result.confidence > 0.8) {
  // High confidence - use result directly
  presentAnswer(result.data);
} else if (result.success && result.confidence > 0.6) {
  // Medium confidence - flag for review
  markForPharmacistReview(result.data, result.confidence);
} else {
  // Low confidence - escalate to specialist
  escalateToSpecialist();
}
```

---

## API Response Structure

All methods return an `AIResponse<T>` with:

```typescript
interface AIResponse<T> {
  success: boolean;           // Operation succeeded
  data?: T;                   // Use-case specific data
  error?: string;             // Error message if failed
  message?: string;           // Optional message
  confidence?: number;        // 0-1 confidence score
  citations?: string[];       // References (if applicable)
  metadata?: {
    tokensUsed: number;       // API tokens consumed
    processingTimeMs: number; // Request duration
    model: string;            // Model used
  };
}
```

---

## Best Practices

### 1. Always Check Success Flag

```typescript
const result = await claudeAIClient.someMethod(data);
if (!result.success) {
  // Handle error - don't access result.data
}
```

### 2. Use Confidence Scores

```typescript
if ((result.confidence ?? 0) < 0.7) {
  console.warn("Low confidence result - recommend review");
}
```

### 3. Cache Results (Optional)

```typescript
const cacheKey = `prescription_${rxId}`;
let analysis = cache.get(cacheKey);

if (!analysis) {
  analysis = await claudeAIClient.analyzePrescription(data);
  cache.set(cacheKey, analysis, 3600); // 1 hour
}
```

### 4. Log for Auditing

```typescript
const result = await claudeAIClient.analyzePrescription(data);
if (result.success) {
  auditLog.create({
    action: "CLAUDE_ANALYSIS",
    resource: "prescription",
    result: result.confidence,
    tokensUsed: result.metadata?.tokensUsed,
    timestamp: new Date()
  });
}
```

### 5. Handle Rate Limiting

```typescript
const maxRetries = 3;
let attempt = 0;

while (attempt < maxRetries) {
  try {
    const result = await claudeAIClient.someMethod(data);
    if (result.success) return result;
  } catch (error) {
    attempt++;
    if (attempt < maxRetries) {
      await delay(1000 * attempt); // Exponential backoff
    }
  }
}
```

---

## Performance Considerations

- **Timeout**: Default 2 minute timeout on API calls
- **Token Budget**: ~2000 tokens per response (costs ~$0.01-0.02)
- **Rate Limits**: Anthropic allows 10,000 requests/min
- **Caching**: Consider caching similar queries
- **Streaming**: Future enhancement for longer responses

---

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"

```
Solution: Add ANTHROPIC_API_KEY to .env.local and restart dev server
```

### "Connection test failed"

```
Solution: Verify API key is valid in Anthropic console, check network connectivity
```

### "Low confidence result"

```
Solution: Provide more context in your prompt, review result with pharmacist
```

### Slow Response Times

```
Solution: Check network latency, Anthropic API status, consider caching
```

---

## References

- Anthropic API Docs: https://docs.anthropic.com/
- Claude Model: claude-sonnet-4-20250514
- Integration File: `/src/lib/integrations/claude-ai.ts`
- API Routes: `/src/app/api/integrations/claude/`
