import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = (user as any)?.storeId;
  if (!storeId) return NextResponse.json({ error: "No store assigned" }, { status: 400 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing template id" }, { status: 400 });

  const key = `print_template_${id}`;

  const setting = await prisma.storeSetting.findUnique({
    where: { storeId_settingKey: { storeId, settingKey: key } },
  });

  if (!setting) {
    return NextResponse.json({ template: null });
  }

  try {
    const template = JSON.parse(setting.settingValue);
    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ template: null });
  }
}
