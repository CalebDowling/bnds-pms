"use server";

import {
  generateSecret,
  generateTOTP,
  verifyTOTP,
  generateRecoveryCodes,
} from "@/lib/security/totp";

export async function get2FAStatus() {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const userRecord = (await prisma.user.findUnique({
    where: { id: user.id },
  })) as { metadata: any; id: string } | null;

  if (!userRecord) throw new Error("User not found");

  // Check if 2FA secret exists in metadata
  const metadata = (userRecord.metadata as any) || {};
  const has2FA = !!metadata.totpSecret;

  return {
    enabled: has2FA,
    userId: user.id,
  };
}

export async function setup2FA() {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Generate a new secret
  const secret = await generateSecret();

  return {
    secret,
    userId: user.id,
  };
}

export async function verify2FA(token: string) {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  if (!token || token.length !== 6) {
    throw new Error("Invalid token format");
  }

  // Get the user record to access the temporary secret
  const userRecord = (await prisma.user.findUnique({
    where: { id: user.id },
  })) as { metadata: any; id: string } | null;

  if (!userRecord) throw new Error("User not found");

  const metadata = (userRecord.metadata as any) || {};
  const tempSecret = metadata.tempTotpSecret;

  if (!tempSecret) {
    throw new Error("No 2FA setup in progress");
  }

  // Verify the token
  const isValid = await verifyTOTP(tempSecret, token);
  if (!isValid) {
    throw new Error("Invalid verification code");
  }

  // Generate recovery codes
  const recoveryCodes = generateRecoveryCodes(10);

  // Save 2FA to user metadata
  const newMetadata = {
    ...metadata,
    totpSecret: tempSecret,
    tempTotpSecret: undefined, // Clear temp secret
    recoveryCodes: recoveryCodes.map((code) => ({
      code,
      used: false,
      usedAt: null,
    })),
    twoFAEnabledAt: new Date().toISOString(),
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { metadata: newMetadata as any } as any,
  });

  // Log the auth event
  const { logAuthEvent } = await import("@/lib/security/hipaa-audit");
  await logAuthEvent(user.id, "2fa_enable");

  return {
    success: true,
    recoveryCodes,
  };
}

export async function disable2FA(token: string) {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  if (!token || token.length !== 6) {
    throw new Error("Invalid token format");
  }

  const userRecord = (await prisma.user.findUnique({
    where: { id: user.id },
  })) as { metadata: any; id: string } | null;

  if (!userRecord) throw new Error("User not found");

  const metadata = (userRecord.metadata as any) || {};
  const secret = metadata.totpSecret;

  if (!secret) {
    throw new Error("2FA is not enabled");
  }

  // Verify the token before disabling
  const isValid = await verifyTOTP(secret, token);
  if (!isValid) {
    throw new Error("Invalid verification code");
  }

  // Remove 2FA
  const newMetadata = {
    ...metadata,
    totpSecret: undefined,
    recoveryCodes: undefined,
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { metadata: newMetadata as any } as any,
  });

  // Log the auth event
  const { logAuthEvent } = await import("@/lib/security/hipaa-audit");
  await logAuthEvent(user.id, "2fa_disable");

  return { success: true };
}

export async function generateRecoveryCodesNew() {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const userRecord = (await prisma.user.findUnique({
    where: { id: user.id },
  })) as { metadata: any; id: string } | null;

  if (!userRecord) throw new Error("User not found");

  const metadata = (userRecord.metadata as any) || {};
  const hasSecret = !!metadata.totpSecret;

  if (!hasSecret) {
    throw new Error("2FA is not enabled");
  }

  // Generate new recovery codes
  const recoveryCodes = generateRecoveryCodes(10);

  const newMetadata = {
    ...metadata,
    recoveryCodes: recoveryCodes.map((code) => ({
      code,
      used: false,
      usedAt: null,
    })),
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { metadata: newMetadata as any } as any,
  });

  return {
    recoveryCodes,
  };
}

export async function saveTempTOTPSecret(secret: string) {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const userRecord = (await prisma.user.findUnique({
    where: { id: user.id },
  })) as { metadata: any; id: string } | null;

  if (!userRecord) throw new Error("User not found");

  const metadata = (userRecord.metadata as any) || {};

  // Store temp secret
  const newMetadata = {
    ...metadata,
    tempTotpSecret: secret,
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { metadata: newMetadata as any } as any,
  });

  return { success: true };
}
