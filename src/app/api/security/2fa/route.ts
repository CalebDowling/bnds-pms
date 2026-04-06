import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userRecord = (await prisma.user.findUnique({
      where: { id: user.id },
    })) as { metadata: any; id: string } | null;

    if (!userRecord) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const metadata = (userRecord.metadata as any) || {};
    const has2FA = !!metadata.totpSecret;

    return NextResponse.json({
      enabled: has2FA,
      userId: user.id,
    });
  } catch (error) {
    console.error("GET /api/security/2fa error:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token } = body;

    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");
    const {
      generateSecret,
      generateRecoveryCodes,
      verifyTOTP,
    } = await import("@/lib/security/totp");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userRecord = (await prisma.user.findUnique({
      where: { id: user.id },
    })) as { metadata: any; id: string } | null;

    if (!userRecord) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const metadata = (userRecord.metadata as any) || {};

    // Handle setup action
    if (action === "setup") {
      const secret = await generateSecret();
      return NextResponse.json({
        secret,
        userId: user.id,
      });
    }

    // Handle save_secret action
    if (action === "save_secret") {
      if (!token) {
        return NextResponse.json(
          { error: "Secret is required" },
          { status: 400 }
        );
      }

      const newMetadata = {
        ...metadata,
        tempTotpSecret: token,
      };

      await prisma.user.update({
        where: { id: user.id },
        data: { metadata: newMetadata as any } as any,
      });

      return NextResponse.json({ success: true });
    }

    // Handle verify action
    if (action === "verify") {
      if (!token || token.length !== 6) {
        return NextResponse.json(
          { error: "Invalid token format" },
          { status: 400 }
        );
      }

      const tempSecret = metadata.tempTotpSecret;

      if (!tempSecret) {
        return NextResponse.json(
          { error: "No 2FA setup in progress" },
          { status: 400 }
        );
      }

      // Verify the token
      const isValid = await verifyTOTP(tempSecret, token);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
      }

      // Generate recovery codes
      const recoveryCodes = generateRecoveryCodes(10);

      // Save 2FA to user metadata
      const newMetadata = {
        ...metadata,
        totpSecret: tempSecret,
        tempTotpSecret: undefined,
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

      return NextResponse.json({
        success: true,
        recoveryCodes,
      });
    }

    // Handle disable action
    if (action === "disable") {
      if (!token || token.length !== 6) {
        return NextResponse.json(
          { error: "Invalid token format" },
          { status: 400 }
        );
      }

      const secret = metadata.totpSecret;

      if (!secret) {
        return NextResponse.json(
          { error: "2FA is not enabled" },
          { status: 400 }
        );
      }

      // Verify the token before disabling
      const isValid = await verifyTOTP(secret, token);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
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

      return NextResponse.json({ success: true });
    }

    // Handle recovery_codes action
    if (action === "recovery_codes") {
      const hasSecret = !!metadata.totpSecret;

      if (!hasSecret) {
        return NextResponse.json(
          { error: "2FA is not enabled" },
          { status: 400 }
        );
      }

      // Generate new recovery codes
      const newRecoveryCodes = generateRecoveryCodes(10);

      const newMetadata = {
        ...metadata,
        recoveryCodes: newRecoveryCodes.map((code) => ({
          code,
          used: false,
          usedAt: null,
        })),
      };

      await prisma.user.update({
        where: { id: user.id },
        data: { metadata: newMetadata as any } as any,
      });

      return NextResponse.json({
        recoveryCodes: newRecoveryCodes,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/security/2fa error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
