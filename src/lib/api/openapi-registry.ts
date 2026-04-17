import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Patch Zod so schemas can add .openapi() metadata
extendZodWithOpenApi(z);

// ─────────────────────────────────────────────────────────────────────────────
// Shared schemas
// ─────────────────────────────────────────────────────────────────────────────

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: "invalid_api_key" }),
    message: z.string().openapi({ example: "API key not recognized." }),
  })
  .openapi("ErrorResponse");

export const PaginationMetaSchema = z
  .object({
    page: z.number().int().min(1).openapi({ example: 1 }),
    pageSize: z.number().int().min(1).openapi({ example: 50 }),
    total: z.number().int().min(0).openapi({ example: 128 }),
    totalPages: z.number().int().min(0).openapi({ example: 3 }),
  })
  .openapi("PaginationMeta");

export const PatientSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "3f4a8b22-9c1d-4e82-ab20-0d7c8e9f4512" }),
    mrn: z.string().openapi({ example: "BNDS-1000421" }),
    firstName: z.string().openapi({ example: "Destini" }),
    lastName: z.string().openapi({ example: "Broussard" }),
    dateOfBirth: z.string().openapi({ example: "1985-04-12", description: "ISO 8601 date" }),
    gender: z.string().nullable().openapi({ example: "F" }),
    email: z.string().nullable().openapi({ example: "destini@example.com" }),
    phone: z.string().nullable().openapi({ example: "(337) 555-0147" }),
    status: z.string().openapi({ example: "active" }),
    allergies: z
      .array(z.object({ allergen: z.string(), severity: z.string().nullable() }))
      .openapi({ description: "List of known allergies." }),
    createdAt: z.string().openapi({ example: "2025-11-02T14:32:18Z" }),
  })
  .openapi("Patient");

export const PrescriptionSchema = z
  .object({
    id: z.string().uuid(),
    rxNumber: z.string().openapi({ example: "714367" }),
    patientId: z.string().uuid(),
    prescriberName: z.string().openapi({ example: "Dr. Sarah Kim, MD" }),
    medicationName: z.string().openapi({ example: "Lisinopril 10mg" }),
    ndc: z.string().nullable().openapi({ example: "00093-1025-01" }),
    sig: z.string().openapi({ example: "Take 1 tablet by mouth once daily" }),
    quantity: z.number().openapi({ example: 30 }),
    daysSupply: z.number().openapi({ example: 30 }),
    refillsRemaining: z.number().openapi({ example: 5 }),
    status: z.string().openapi({ example: "ready" }),
    createdAt: z.string(),
  })
  .openapi("Prescription");

export const FillSchema = z
  .object({
    id: z.string().uuid(),
    prescriptionId: z.string().uuid(),
    fillNumber: z.number().openapi({ example: 1 }),
    status: z.string().openapi({ example: "verified" }),
    quantityFilled: z.number(),
    filledAt: z.string().nullable(),
    verifiedAt: z.string().nullable(),
    binLocation: z.string().nullable().openapi({ example: "A12" }),
    copay: z.number().nullable().openapi({ example: 10.0 }),
  })
  .openapi("Fill");

export const InventoryItemSchema = z
  .object({
    id: z.string().uuid(),
    ndc: z.string().nullable(),
    name: z.string().openapi({ example: "Lisinopril 10mg Tablet" }),
    strength: z.string().nullable(),
    manufacturer: z.string().nullable(),
    onHand: z.number().openapi({ example: 1250 }),
    reorderPoint: z.number().nullable(),
    isLow: z.boolean(),
    isCompoundIngredient: z.boolean(),
    deaSchedule: z.string().nullable(),
  })
  .openapi("InventoryItem");

export const HeartbeatSchema = z
  .object({
    status: z.literal("ok"),
    pulse: z.number().openapi({ example: 1 }),
    serverTime: z.string(),
    apiVersion: z.literal("v1"),
    environment: z.string().openapi({ example: "live" }),
  })
  .openapi("Heartbeat");

// ─────────────────────────────────────────────────────────────────────────────
// The registry
// ─────────────────────────────────────────────────────────────────────────────

export const registry = new OpenAPIRegistry();

// Register all component schemas so they appear under #/components/schemas
registry.register("ErrorResponse", ErrorResponseSchema);
registry.register("PaginationMeta", PaginationMetaSchema);
registry.register("Patient", PatientSchema);
registry.register("Prescription", PrescriptionSchema);
registry.register("Fill", FillSchema);
registry.register("InventoryItem", InventoryItemSchema);
registry.register("Heartbeat", HeartbeatSchema);

// Security scheme — API key via header or Bearer
registry.registerComponent("securitySchemes", "ApiKeyHeader", {
  type: "apiKey",
  in: "header",
  name: "X-BNDS-Key",
  description:
    "Your BNDS API key, starting with `bnds_live_` or `bnds_test_`. Generate keys from Settings → API Keys.",
});

registry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "API Key",
  description:
    "Alternative: pass your key as `Authorization: Bearer bnds_live_...`. Functionally identical to X-BNDS-Key.",
});

// Tag groupings shown in the sidebar of the docs site
export const TAGS = {
  GETTING_STARTED: "Getting Started",
  HEARTBEAT: "Heartbeat",
  PATIENTS: "Patients",
  PRESCRIPTIONS: "Prescriptions",
  FILLS: "Fills",
  INVENTORY: "Inventory",
};

// ─────────────────────────────────────────────────────────────────────────────
// Register routes
// ─────────────────────────────────────────────────────────────────────────────

const idParam = z.string().uuid().openapi({
  param: { name: "id", in: "path" },
  example: "3f4a8b22-9c1d-4e82-ab20-0d7c8e9f4512",
});

// Heartbeat
registry.registerPath({
  method: "get",
  path: "/api/v1/heartbeat",
  summary: "Check that your API key is working",
  description:
    "Returns a simple ok response if your API key is valid. Use this to verify connectivity and authentication before making other calls. Requires any valid key (no scope required).",
  tags: [TAGS.HEARTBEAT],
  security: [{ ApiKeyHeader: [] }, { BearerAuth: [] }],
  responses: {
    200: {
      description: "API key is valid.",
      content: { "application/json": { schema: z.object({ data: HeartbeatSchema }) } },
    },
    401: {
      description: "Missing or invalid API key.",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// Patients — list
registry.registerPath({
  method: "get",
  path: "/api/v1/patients",
  summary: "List patients",
  description:
    "Returns a paginated list of patients. Supports optional search by name, MRN, phone, or email. Requires `patients:read` scope.",
  tags: [TAGS.PATIENTS],
  security: [{ ApiKeyHeader: [] }],
  request: {
    query: z.object({
      search: z.string().optional().openapi({ description: "Search term matched against name, MRN, phone, or email." }),
      status: z.enum(["active", "inactive", "all"]).optional().default("active"),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
    }),
  },
  responses: {
    200: {
      description: "A page of patients.",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(PatientSchema),
            meta: PaginationMetaSchema,
          }),
        },
      },
    },
    401: { description: "Unauthorized.", content: { "application/json": { schema: ErrorResponseSchema } } },
    403: {
      description: "Missing `patients:read` scope.",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: { description: "Rate limit exceeded.", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// Patients — single
registry.registerPath({
  method: "get",
  path: "/api/v1/patients/{id}",
  summary: "Retrieve a patient",
  description: "Returns a single patient by UUID. Requires `patients:read` scope.",
  tags: [TAGS.PATIENTS],
  security: [{ ApiKeyHeader: [] }],
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: {
      description: "The patient.",
      content: { "application/json": { schema: z.object({ data: PatientSchema }) } },
    },
    404: {
      description: "Patient not found.",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: { description: "Unauthorized.", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

// Prescriptions — list
registry.registerPath({
  method: "get",
  path: "/api/v1/prescriptions",
  summary: "List prescriptions",
  description:
    "Returns a paginated list of prescriptions. Supports filtering by status and optional search by Rx number, patient name, or MRN. Requires `prescriptions:read` scope.",
  tags: [TAGS.PRESCRIPTIONS],
  security: [{ ApiKeyHeader: [] }],
  request: {
    query: z.object({
      search: z.string().optional(),
      status: z.string().optional().openapi({
        description: "Filter by fill status (intake, ready, dispensed, on_hold, etc.).",
      }),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
    }),
  },
  responses: {
    200: {
      description: "A page of prescriptions.",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(PrescriptionSchema),
            meta: PaginationMetaSchema,
          }),
        },
      },
    },
  },
});

// Fills — list
registry.registerPath({
  method: "get",
  path: "/api/v1/fills",
  summary: "List prescription fills",
  description:
    "Returns a paginated list of prescription fills (each Rx can have multiple fills). Supports filtering by status. Requires `fills:read` scope.",
  tags: [TAGS.FILLS],
  security: [{ ApiKeyHeader: [] }],
  request: {
    query: z.object({
      status: z.string().optional(),
      patientId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
    }),
  },
  responses: {
    200: {
      description: "A page of fills.",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(FillSchema),
            meta: PaginationMetaSchema,
          }),
        },
      },
    },
  },
});

// Inventory — list
registry.registerPath({
  method: "get",
  path: "/api/v1/inventory",
  summary: "List inventory items",
  description:
    "Returns a paginated list of drug items in the pharmacy catalog with on-hand quantities. Requires `inventory:read` scope.",
  tags: [TAGS.INVENTORY],
  security: [{ ApiKeyHeader: [] }],
  request: {
    query: z.object({
      search: z.string().optional().openapi({ description: "Search by name, NDC, or manufacturer." }),
      category: z.enum(["all", "compound_ingredient", "controlled", "refrigerated"]).optional().default("all"),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
    }),
  },
  responses: {
    200: {
      description: "A page of inventory items.",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(InventoryItemSchema),
            meta: PaginationMetaSchema,
          }),
        },
      },
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Spec generator
// ─────────────────────────────────────────────────────────────────────────────

export function buildOpenApiSpec(baseUrl: string) {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "BNDS Pharmacy Management API",
      version: "1.0.0",
      description:
        "Public REST API for Boudreaux's New Drug Store — the BNDS Pharmacy Management System.\n\n" +
        "This API is intended for third-party integrations such as telehealth platforms, " +
        "prescriber EMRs, insurance partners, delivery services, and clinical decision-support tools.\n\n" +
        "All endpoints are versioned under `/api/v1/` and require an API key obtained from the " +
        "pharmacy. Keys are scoped to specific resources and actions, and all responses are JSON.",
      contact: {
        name: "Boudreaux's New Drug Store",
        email: "it@bndsrx.com",
        url: "https://bndsrx.com",
      },
      license: { name: "Proprietary" },
    },
    servers: [
      { url: baseUrl, description: "Production" },
    ],
    security: [{ ApiKeyHeader: [] }],
    tags: [
      { name: TAGS.HEARTBEAT, description: "Liveness and connectivity check." },
      { name: TAGS.PATIENTS, description: "Patient demographics and profile data." },
      { name: TAGS.PRESCRIPTIONS, description: "Prescription records." },
      { name: TAGS.FILLS, description: "Individual prescription fills." },
      { name: TAGS.INVENTORY, description: "Drug catalog and on-hand inventory." },
    ],
  });
}
