import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/errors";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Sign out the current session
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return NextResponse.json(
        { error: "Failed to sign out" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully signed out",
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Logout error:", message);

    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
