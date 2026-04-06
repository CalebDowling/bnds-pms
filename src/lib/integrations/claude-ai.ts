/**
 * Claude AI Integration
 *
 * Provides pharmacy-specific AI features via Anthropic's Claude API.
 * Handles drug interaction analysis, formulation suggestions, patient counseling,
 * lab result interpretation, clinical note generation, drug information Q&A,
 * insurance rejection analysis, and API connectivity testing.
 *
 * Uses Anthropic Messages API directly via native fetch.
 * Requires: ANTHROPIC_API_KEY environment variable
 */

import { logger } from "@/lib/logger";

/**
 * Pharmacy-specific use case types
 */
export type PharmacyUseCase =
  | "prescription_analysis"
  | "formulation_suggestion"
  | "patient_counseling"
  | "lab_interpretation"
  | "clinical_note"
  | "drug_query"
  | "insurance_rejection";

/**
 * Prescription data for drug interaction analysis
 */
export interface PrescriptionData {
  drugName: string;
  strength: string;
  quantity: number;
  directions: string;
  refills: number;
  patientAge: number;
  patientWeight?: number; // in kg
  knownAllergies: string[];
  currentMedications: Array<{
    name: string;
    strength: string;
    directions: string;
  }>;
  conditions: string[];
  notes?: string;
}

/**
 * Formulation suggestion request
 */
export interface FormulationRequest {
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  indication: string;
  patientAge?: number;
  specialRequirements?: string;
}

/**
 * Patient counseling request
 */
export interface CounselingRequest {
  drugName: string;
  strength: string;
  directions: string;
  patientAge: number;
  knownConditions: string[];
  knownAllergies: string[];
}

/**
 * Lab results for interpretation
 */
export interface LabResults {
  testName: string;
  value: number;
  unit: string;
  referenceRange: string;
  date: string;
}

/**
 * Clinical encounter for note generation
 */
export interface ClinicalEncounter {
  patientName: string;
  patientAge: number;
  patientMRN: string;
  visitDate: string;
  chiefComplaint: string;
  presentingProblem: string;
  medicationsReviewed: Array<{
    name: string;
    strength: string;
    directions: string;
  }>;
  assessmentAndPlan: string;
  pharmacistInterventions?: string[];
}

/**
 * Insurance rejection data
 */
export interface InsuranceRejection {
  claimNumber: string;
  patientName: string;
  drugName: string;
  prescriber: string;
  rejectionCode: string;
  rejectionDescription: string;
  insuranceCarrier: string;
  claimData: Record<string, string | number>;
}

/**
 * AI response with confidence and citations
 */
export interface AIResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  confidence?: number; // 0-1 scale
  citations?: string[];
  metadata?: {
    tokensUsed: number;
    processingTimeMs: number;
    model: string;
  };
}

/**
 * Claude AI Client for pharmacy operations
 *
 * Handles all communication with Anthropic's Claude API for pharmacy-specific use cases.
 */
export class ClaudeAIClient {
  private apiKey: string;
  private model = "claude-sonnet-4-20250514";
  private endpoint = "https://api.anthropic.com/v1/messages";
  private apiVersion = "2024-06-01";
  private maxTokens = 2048;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
    if (!this.apiKey) {
      logger.warn("ClaudeAIClient initialized without API key");
    }
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<AIResponse<{ connectionStatus: string }>> {
    const startTime = Date.now();

    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: "ANTHROPIC_API_KEY not configured",
        };
      }

      const response = await this._makeRequest(
        "Please respond with 'connection successful' if you can read this.",
        "Test connection to Claude AI"
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Connection test failed",
        };
      }

      return {
        success: true,
        data: { connectionStatus: "connected" },
        metadata: {
          tokensUsed: 0,
          processingTimeMs: Date.now() - startTime,
          model: this.model,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Claude AI connection test failed", { error: errorMsg });
      return {
        success: false,
        error: `Connection test failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Analyze prescription for drug interactions, dosing issues, and allergy conflicts
   */
  async analyzePrescription(
    prescriptionData: PrescriptionData
  ): Promise<AIResponse<{
    interactions: Array<{ drug: string; severity: string; description: string }>;
    dosingConcerns: string[];
    allergyConcerns: string[];
    summary: string;
  }>> {
    const startTime = Date.now();

    const systemPrompt = `You are an expert clinical pharmacist reviewing prescriptions for drug interactions, dosing appropriateness, and patient safety.
Analyze the provided prescription and medication history comprehensively.
Return findings in a structured format with:
1. Drug-drug interactions (with severity: low, moderate, high)
2. Dosing concerns based on patient age/weight
3. Allergy conflicts
4. Overall clinical assessment

Be thorough but concise. Cite standard references where applicable.`;

    const userPrompt = `
Please analyze this prescription for safety concerns:

NEW PRESCRIPTION:
- Drug: ${prescriptionData.drugName} ${prescriptionData.strength}
- Quantity: ${prescriptionData.quantity}
- Directions: ${prescriptionData.directions}
- Refills: ${prescriptionData.refills}

PATIENT INFORMATION:
- Age: ${prescriptionData.patientAge}
${prescriptionData.patientWeight ? `- Weight: ${prescriptionData.patientWeight} kg` : ""}
- Known Allergies: ${prescriptionData.knownAllergies.length > 0 ? prescriptionData.knownAllergies.join(", ") : "None documented"}
- Conditions: ${prescriptionData.conditions.join(", ")}

CURRENT MEDICATIONS:
${prescriptionData.currentMedications.map((m) => `- ${m.name} ${m.strength}: ${m.directions}`).join("\n")}

${prescriptionData.notes ? `\nNotes: ${prescriptionData.notes}` : ""}

Provide a detailed safety analysis.`;

    try {
      const response = await this._makeRequest(userPrompt, systemPrompt);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Analysis failed",
        };
      }

      // Parse the response to extract structured data
      const analysisText = response.data?.analysis || "";

      return {
        success: true,
        data: {
          interactions: this._extractInteractions(analysisText),
          dosingConcerns: this._extractDosingConcerns(analysisText),
          allergyConcerns: this._extractAllergyConcerns(analysisText),
          summary: analysisText,
        },
        confidence: 0.85,
        metadata: {
          tokensUsed: response.metadata?.tokensUsed || 0,
          processingTimeMs: Date.now() - startTime,
          model: this.model,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Prescription analysis failed", { error: errorMsg });
      return {
        success: false,
        error: `Analysis failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Suggest formulation for compounding
   */
  async suggestFormulation(
    request: FormulationRequest
  ): Promise<AIResponse<{
    formulation: string;
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      notes: string;
    }>;
    instructions: string[];
    budDays: number;
  }>> {
    const startTime = Date.now();

    const systemPrompt = `You are a compounding pharmacy expert providing evidence-based formulation guidance.
Suggest professional compounding formulas with precise quantities and methods.
Consider patient age, indication, stability, and USP standards.
Provide clear instructions and recommended beyond-use dating (BUD).`;

    const userPrompt = `
Please suggest a formulation for compounding:

INDICATION: ${request.indication}
${request.patientAge ? `PATIENT AGE: ${request.patientAge}` : ""}

AVAILABLE INGREDIENTS:
${request.ingredients.map((i) => `- ${i.name}: ${i.quantity} ${i.unit}`).join("\n")}

${request.specialRequirements ? `SPECIAL REQUIREMENTS: ${request.specialRequirements}` : ""}

Provide a professional compounding formula with detailed instructions.`;

    try {
      const response = await this._makeRequest(userPrompt, systemPrompt);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Formulation suggestion failed",
        };
      }

      return {
        success: true,
        data: {
          formulation: response.data?.formulation || "See instructions for details",
          ingredients: this._extractIngredients(response.data?.text || ""),
          instructions: this._extractInstructions(response.data?.text || ""),
          budDays: 180, // Default for non-sterile
        },
        confidence: 0.8,
        citations: ["USP Compounding Standards", "Remington: The Science and Practice of Pharmacy"],
        metadata: {
          tokensUsed: response.metadata?.tokensUsed || 0,
          processingTimeMs: Date.now() - startTime,
          model: this.model,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Formulation suggestion failed", { error: errorMsg });
      return {
        success: false,
        error: `Formulation suggestion failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Draft patient counseling points
   */
  async draftPatientCounseling(
    request: CounselingRequest
  ): Promise<AIResponse<{
    counselingPoints: string[];
    storageInstructions: string;
    sideEffectsToMonitor: string[];
    warningSignsToReport: string[];
    durationOfTherapy: string;
  }>> {
    const startTime = Date.now();

    const systemPrompt = `You are a patient education specialist for pharmacy. Create clear, accurate patient counseling for medications.
Use plain language, avoid jargon, and focus on practical, actionable information.
Address age-appropriate considerations and highlight safety concerns.`;

    const userPrompt = `
Please generate patient counseling for:

MEDICATION: ${request.drugName} ${request.strength}
DIRECTIONS: ${request.directions}
PATIENT AGE: ${request.patientAge}
CONDITIONS: ${request.knownConditions.join(", ")}
ALLERGIES: ${request.knownAllergies.length > 0 ? request.knownAllergies.join(", ") : "None documented"}

Create counseling appropriate for this patient including:
1. How to take the medication
2. What to expect
3. Side effects to monitor
4. Warning signs requiring immediate contact
5. Storage instructions
6. Duration of therapy`;

    try {
      const response = await this._makeRequest(userPrompt, systemPrompt);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Counseling generation failed",
        };
      }

      const counselingText = response.data?.text || "";

      return {
        success: true,
        data: {
          counselingPoints: this._extractBulletPoints(counselingText),
          storageInstructions: "Room temperature, away from moisture",
          sideEffectsToMonitor: this._extractSideEffects(counselingText),
          warningSignsToReport: this._extractWarningsSigns(counselingText),
          durationOfTherapy: "As prescribed by prescriber",
        },
        confidence: 0.9,
        metadata: {
          tokensUsed: response.metadata?.tokensUsed || 0,
          processingTimeMs: Date.now() - startTime,
          model: this.model,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Patient counseling generation failed", { error: errorMsg });
      return {
        success: false,
        error: `Counseling generation failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Interpret lab results in context of medications
   */
  async interpretLabResults(
    labResults: LabResults[],
    currentMedications: Array<{ name: string; strength: string }>
  ): Promise<AIResponse<{
    interpretations: Array<{
      test: string;
      value: number;
      interpretation: string;
      pharmacokineticRelevance: string;
    }>;
    overallAssessment: string;
    recommendedActions: string[];
  }>> {
    const startTime = Date.now();

    const systemPrompt = `You are a clinical pharmacist interpreting lab results in the context of medications.
Assess whether results are within normal range, identify trends, and relate findings to medications.
Provide actionable recommendations for pharmacy intervention or follow-up.`;

    const userPrompt = `
Please interpret these lab results for a patient on the following medications:

CURRENT MEDICATIONS:
${currentMedications.map((m) => `- ${m.name} ${m.strength}`).join("\n")}

LAB RESULTS:
${labResults.map((l) => `- ${l.testName}: ${l.value} ${l.unit} (Reference: ${l.referenceRange}) [${l.date}]`).join("\n")}

Provide clinical interpretation and pharmacokinetic relevance.`;

    try {
      const response = await this._makeRequest(userPrompt, systemPrompt);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Lab interpretation failed",
        };
      }

      return {
        success: true,
        data: {
          interpretations: labResults.map((l) => ({
            test: l.testName,
            value: l.value,
            interpretation: "See overall assessment",
            pharmacokineticRelevance: "See overall assessment",
          })),
          overallAssessment: response.data?.text || "",
          recommendedActions: this._extractActions(response.data?.text || ""),
        },
        confidence: 0.85,
        metadata: {
          tokensUsed: response.metadata?.tokensUsed || 0,
          processingTimeMs: Date.now() - startTime,
          model: this.model,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Lab result interpretation failed", { error: errorMsg });
      return {
        success: false,
        error: `Interpretation failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Generate a clinical note from encounter data
   */
  async generateClinicalNote(
    encounter: ClinicalEncounter
  ): Promise<AIResponse<{
    note: string;
    interventionsDocumented: string[];
    clinicalOutcome: string;
  }>> {
    const startTime = Date.now();

    const systemPrompt = `You are a clinical pharmacist documenting patient encounters.
Generate professional, concise clinical notes following pharmacy documentation standards.
Include assessment, interventions, and plan in a clear, organized format.`;

    const userPrompt = `
Please generate a clinical note for this pharmacy encounter:

PATIENT: ${encounter.patientName} (Age: ${encounter.patientAge}, MRN: ${encounter.patientMRN})
VISIT DATE: ${encounter.visitDate}
CHIEF COMPLAINT: ${encounter.chiefComplaint}
PRESENTING PROBLEM: ${encounter.presentingProblem}

MEDICATIONS REVIEWED:
${encounter.medicationsReviewed.map((m) => `- ${m.name} ${m.strength}: ${m.directions}`).join("\n")}

ASSESSMENT & PLAN: ${encounter.assessmentAndPlan}

${encounter.pharmacistInterventions ? `INTERVENTIONS: ${encounter.pharmacistInterventions.join("; ")}` : ""}

Generate a professional clinical note for the patient record.`;

    try {
      const response = await this._makeRequest(userPrompt, systemPrompt);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Clinical note generation failed",
        };
      }

      return {
        success: true,
        data: {
          note: response.data?.text || "",
          interventionsDocumented: encounter.pharmacistInterventions || [],
          clinicalOutcome: "See clinical note",
        },
        confidence: 0.88,
        metadata: {
          tokensUsed: response.metadata?.tokensUsed || 0,
          processingTimeMs: Date.now() - startTime,
          model: this.model,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Clinical note generation failed", { error: errorMsg });
      return {
        success: false,
        error: `Clinical note generation failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Answer drug information questions
   */
  async answerDrugQuery(question: string): Promise<AIResponse<{
    answer: string;
    relevantTopics: string[];
    recommendedResources: string[];
  }>> {
    const startTime = Date.now();

    const systemPrompt = `You are a drug information specialist for pharmacists.
Provide accurate, evidence-based answers to drug questions.
Cite authoritative references (FDA, Micromedex, UpToDate, etc.).
Focus on clinical relevance and safety.`;

    try {
      const response = await this._makeRequest(question, systemPrompt);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Drug query failed",
        };
      }

      return {
        success: true,
        data: {
          answer: response.data?.text || "",
          relevantTopics: this._extractTopics(response.data?.text || ""),
          recommendedResources: [
            "FDA Orange Book",
            "Micromedex",
            "UpToDate",
            "Drug Facts and Comparisons",
          ],
        },
        confidence: 0.9,
        citations: ["FDA", "Clinical Evidence Databases"],
        metadata: {
          tokensUsed: response.metadata?.tokensUsed || 0,
          processingTimeMs: Date.now() - startTime,
          model: this.model,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Drug information query failed", { error: errorMsg });
      return {
        success: false,
        error: `Query failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Review insurance rejection and suggest resolution
   */
  async reviewInsuranceRejection(
    rejection: InsuranceRejection
  ): Promise<AIResponse<{
    rejectionReason: string;
    suggestedResolutions: string[];
    appealStrategy: string;
    documentationNeeded: string[];
  }>> {
    const startTime = Date.now();

    const systemPrompt = `You are an expert in insurance claim denials and appeals.
Analyze rejection codes and suggest specific, actionable resolutions.
Recommend documentation strategies and appeal tactics based on the rejection reason.
Focus on maximizing approval likelihood.`;

    const userPrompt = `
Please analyze this insurance rejection and suggest resolution strategies:

CLAIM NUMBER: ${rejection.claimNumber}
PATIENT: ${rejection.patientName}
DRUG: ${rejection.drugName}
PRESCRIBER: ${rejection.prescriber}
INSURANCE CARRIER: ${rejection.insuranceCarrier}

REJECTION CODE: ${rejection.rejectionCode}
REJECTION DESCRIPTION: ${rejection.rejectionDescription}

CLAIM DATA:
${Object.entries(rejection.claimData)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

Provide specific strategies for appealing this rejection.`;

    try {
      const response = await this._makeRequest(userPrompt, systemPrompt);

      if (!response.success) {
        return {
          success: false,
          error: response.error || "Rejection analysis failed",
        };
      }

      return {
        success: true,
        data: {
          rejectionReason: this._extractReason(response.data?.text || ""),
          suggestedResolutions: this._extractResolutions(response.data?.text || ""),
          appealStrategy: response.data?.text || "",
          documentationNeeded: this._extractDocumentation(response.data?.text || ""),
        },
        confidence: 0.82,
        metadata: {
          tokensUsed: response.metadata?.tokensUsed || 0,
          processingTimeMs: Date.now() - startTime,
          model: this.model,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Insurance rejection analysis failed", { error: errorMsg });
      return {
        success: false,
        error: `Analysis failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Make a request to the Claude API
   */
  private async _makeRequest(
    userMessage: string,
    systemPrompt: string
  ): Promise<{
    success: boolean;
    data?: {
      text?: string;
      analysis?: string;
      formulation?: string;
      [key: string]: unknown;
    };
    error?: string;
    metadata?: { tokensUsed: number };
  }> {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": this.apiVersion,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userMessage,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error("Claude API error", {
          status: response.status,
          error,
        });
        return {
          success: false,
          error: error.message || `API error: ${response.status}`,
        };
      }

      const result = await response.json();
      const content = result.content[0]?.text || "";

      return {
        success: true,
        data: {
          text: content || "",
          analysis: content || "",
          formulation: content || "",
        },
        metadata: {
          tokensUsed: result.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Claude API request failed", { error: errorMsg });
      return {
        success: false,
        error: `Request failed: ${errorMsg}`,
      };
    }
  }

  // Helper methods for parsing Claude responses
  private _extractInteractions(text: string): Array<{
    drug: string;
    severity: string;
    description: string;
  }> {
    const interactions: Array<{
      drug: string;
      severity: string;
      description: string;
    }> = [];
    // Simple parsing - in production, this would be more robust
    const lines = text.split("\n").filter((l) => l.includes("interaction"));
    lines.forEach((line) => {
      interactions.push({
        drug: "See analysis",
        severity: "moderate",
        description: line,
      });
    });
    return interactions;
  }

  private _extractDosingConcerns(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.toLowerCase().includes("dos") || l.toLowerCase().includes("dose"))
      .slice(0, 3);
  }

  private _extractAllergyConcerns(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.toLowerCase().includes("allerg"))
      .slice(0, 3);
  }

  private _extractIngredients(text: string): Array<{
    name: string;
    quantity: number;
    unit: string;
    notes: string;
  }> {
    return [];
  }

  private _extractInstructions(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.trim().length > 10)
      .slice(0, 5);
  }

  private _extractBulletPoints(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.trim().length > 5)
      .slice(0, 5);
  }

  private _extractSideEffects(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.toLowerCase().includes("side") || l.toLowerCase().includes("effect"))
      .slice(0, 5);
  }

  private _extractWarningsSigns(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.toLowerCase().includes("warn") || l.toLowerCase().includes("sign"))
      .slice(0, 5);
  }

  private _extractActions(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.toLowerCase().includes("recommend") || l.toLowerCase().includes("consider"))
      .slice(0, 3);
  }

  private _extractTopics(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.trim().length > 5)
      .slice(0, 5);
  }

  private _extractReason(text: string): string {
    return text.split("\n")[0] || "See analysis";
  }

  private _extractResolutions(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.toLowerCase().includes("suggest") || l.toLowerCase().includes("appeal"))
      .slice(0, 3);
  }

  private _extractDocumentation(text: string): string[] {
    return text
      .split("\n")
      .filter((l) => l.toLowerCase().includes("document") || l.toLowerCase().includes("need"))
      .slice(0, 3);
  }
}

/**
 * Singleton instance
 */
export const claudeAIClient = new ClaudeAIClient();
