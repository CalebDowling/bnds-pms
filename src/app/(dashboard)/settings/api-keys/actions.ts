"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { generateApiKey, type ApiKeyEnvironment } from "@/lib/api/api-key";
import { formatPatientName } from "@/lib/utils/formatters";

export interface ApiKeyListItem {
  id: string;
  keyPrefix: string;
  label: string;
  description: string | null;
  environment: string;
  scopes: string[];
  createdByName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  usageCount: number;
  rateLimitPerMin: number | null;
}

/** List all API keys. Admin-only. */
export async function listApiKeys(): Promise<ApiKeyListItem[]> {
  await requireUser();
  await requirePermission("settings", "write");

  const rows = await prisma.apiKey.findMany({
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  return rows.map((k) => ({
    id: k.id,
    keyPrefix: k.keyPrefix,
    label: k.label,
    description: k.description,
    environment: k.environment,
    scopes: Array.isArray(k.scopes) ? (k.scopes as string[]) : [],
    createdByName: k.createdBy ? formatPatientName(k.createdBy) : null,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
    usageCount: Number(k.usageCount),
    rateLimitPerMin: k.rateLimitPerMin,
  }));
}

export interface CreateApiKeyInput {
  label: string;
  description?: string;
  environment: ApiKeyEnvironment;
  scopes: string[];
  expiresAt?: string | null;
  rateLimitPerMin?: number | null;
}

export interface CreateApiKeyResult {
  id: string;
  keyPrefix: string;
  /** Full plaintext key — shown ONCE. The caller must display this to the user. */
  plainKey: string;
  label: string;
  environment: string;
  scopes: string[];
}

/**
 * Create a new API key. Returns the plaintext key value, which must be
 * shown to the user immediately. It is never retrievable again.
 */
export async function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  const user = await requireUser();
  await requirePermission("settings", "write");

  if (!input.label || input.label.trim().length === 0) {
    throw new Error("Label is required.");
  }
  if (input.label.length > 120) {
    throw new Error("Label must be 120 characters or fewer.");
  }
  if (!Array.isArray(input.scopes)) {
    throw new Error("Scopes must be an array.");
  }
  // Validate scope format
  for (const scope of input.scopes) {
    if (!/^(\*|[a-z_]+):(\*|[a-z_]+)$/.test(scope)) {
      throw new Error(`Invalid scope format: "${scope}". Expected "resource:action".`);
    }
  }

  const env: ApiKeyEnvironment = input.environment === "test" ? "test" : "live";
  const generated = generateApiKey(env);

  const created = await prisma.apiKey.create({
    data: {
      keyPrefix: generated.prefix,
      keyHash: generated.hash,
      label: input.label.trim(),
      description: input.description?.trim() || null,
      environment: env,
      scopes: input.scopes,
      createdByUserId: user.id,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      rateLimitPerMin: input.rateLimitPerMin ?? null,
    },
  });

  revalidatePath("/settings/api-keys");

  return {
    id: created.id,
    keyPrefix: created.keyPrefix,
    plainKey: generated.plainKey,
    label: created.label,
    environment: created.environment,
    scopes: Array.isArray(created.scopes) ? (created.scopes as string[]) : [],
  };
}

/** Revoke an API key. The key hash stays so the key can still be identified in logs. */
export async function revokeApiKey(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission("settings", "write");

  await prisma.apiKey.update({
    where: { id },
    data: {
      revokedAt: new Date(),
      revokedByUserId: user.id,
    },
  });

  revalidatePath("/settings/api-keys");
}

/** Update a key's label, description, scopes, or rate limit. Cannot change the secret. */
export async function updateApiKey(
  id: string,
  input: Partial<Pick<CreateApiKeyInput, "label" | "description" | "scopes" | "rateLimitPerMin" | "expiresAt">>
): Promise<void> {
  await requireUser();
  await requirePermission("settings", "write");

  await prisma.apiKey.update({
    where: { id },
    data: {
      label: input.label?.trim(),
      description: input.description?.trim() ?? undefined,
      scopes: input.scopes,
      rateLimitPerMin: input.rateLimitPerMin,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    },
  });

  revalidatePath("/settings/api-keys");
}

/** Get recent request log entries for a specific key. Admin-only. */
export async function getApiKeyRecentActivity(keyId: string, limit = 25) {
  await requireUser();
  await requirePermission("settings", "write");

  const logs = await prisma.apiRequestLog.findMany({
    where: { apiKeyId: keyId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });

  return logs.map((l) => ({
    id: l.id,
    method: l.method,
    path: l.path,
    statusCode: l.statusCode,
    durationMs: l.durationMs,
    ipAddress: l.ipAddress,
    errorMessage: l.errorMessage,
    createdAt: l.createdAt.toISOString(),
  }));
}
