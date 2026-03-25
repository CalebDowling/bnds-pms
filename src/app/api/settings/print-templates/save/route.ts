import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let storeId = (user as any)?.storeId;
  if (!storeId) {
    const store = await prisma.store.findFirst();
    storeId = store?.id;
  }
  if (!storeId) return NextResponse.json({ error: "No store found" }, { status: 400 });

  const assignments = await request.json();

  await prisma.storeSetting.upsert({
    where: { storeId_settingKey: { storeId, settingKey: "print_template_assignments" } },
    create: {
      storeId,
      settingKey: "print_template_assignments",
      settingValue: JSON.stringify(assignments),
      settingType: "json",
      updatedBy: user.id,
    },
    update: {
      settingValue: JSON.stringify(assignments),
      updatedBy: user.id,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
