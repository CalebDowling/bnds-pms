import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface PatientAuthContext {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
}

/**
 * Verify Supabase Auth session from Bearer token
 * Returns null if no valid session
 */
export async function getSupabaseAuth(
  request: NextRequest
): Promise<PatientAuthContext | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const supabase = await createClient();

    // Verify the token and get user
    const {
      data: { user },
      error,
    } = await supabase.auth.admin.getUserById(token);

    if (error || !user) {
      return null;
    }

    // Check if user has patient role
    if (user.user_metadata?.role !== "patient") {
      return null;
    }

    return {
      userId: user.id,
      email: user.email || "",
      firstName: user.user_metadata?.firstName || "",
      lastName: user.user_metadata?.lastName || "",
      phone: user.user_metadata?.phone || "",
      role: "patient",
    };
  } catch (error) {
    console.error("Supabase auth error:", error);
    return null;
  }
}

/**
 * Get the current session from Bearer token (alternative method)
 * Uses getSession which works with access tokens
 */
export async function getSupabaseSession(
  request: NextRequest
): Promise<PatientAuthContext | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const supabase = await createClient();

    // Set the token and get session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Check if user has patient role
    if (user.user_metadata?.role !== "patient") {
      return null;
    }

    return {
      userId: user.id,
      email: user.email || "",
      firstName: user.user_metadata?.firstName || "",
      lastName: user.user_metadata?.lastName || "",
      phone: user.user_metadata?.phone || "",
      role: "patient",
    };
  } catch (error) {
    console.error("Supabase session error:", error);
    return null;
  }
}
