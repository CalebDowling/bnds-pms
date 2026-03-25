import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = (user as any)?.storeId;
  if (!storeId) return NextResponse.json({ error: "No store assigned" }, { status: 400 });

  const template = await request.json();
  const key = `print_template_${template.id}`;

  await prisma.storeSetting.upsert({
    where: { storeId_settingKey: { storeId, settingKey: key } },
    create: {
      storeId,
      settingKey: key,
      settingValue: JSON.stringify(template),
      settingType: "json",
      updatedBy: user.id,
    },
    update: {
      settingValue: JSON.stringify(template),
      updatedBy: user.id,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
