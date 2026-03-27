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

  const body = await request.json();

  // If body has a 'layout' field, save as a layout customization (separate from template)
  if (body.layout) {
    const key = `print_template_layout_${body.id}`;
    await prisma.storeSetting.upsert({
      where: { storeId_settingKey: { storeId, settingKey: key } },
      create: {
        storeId,
        settingKey: key,
        settingValue: JSON.stringify({
          layout: body.layout,
          fieldValues: body.fieldValues,
          savedAt: body.savedAt,
        }),
        settingType: "json",
        updatedBy: user.id,
      },
      update: {
        settingValue: JSON.stringify({
          layout: body.layout,
          fieldValues: body.fieldValues,
          savedAt: body.savedAt,
        }),
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true });
  }

  // Otherwise save as full template data
  const key = `print_template_${body.id}`;
  await prisma.storeSetting.upsert({
    where: { storeId_settingKey: { storeId, settingKey: key } },
    create: {
      storeId,
      settingKey: key,
      settingValue: JSON.stringify(body),
      settingType: "json",
      updatedBy: user.id,
    },
    update: {
      settingValue: JSON.stringify(body),
      updatedBy: user.id,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
