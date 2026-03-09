import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ userId: null }, { status: 401 });
  return NextResponse.json({
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    isPharmacist: user.isPharmacist,
  });
}
