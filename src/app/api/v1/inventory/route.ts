import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withApiAuth, apiOk, apiError } from "@/lib/api/with-api-auth";

export const dynamic = "force-dynamic";

const ListQuerySchema = z.object({
  search: z.string().optional(),
  category: z.enum(["all", "compound_ingredient", "controlled", "refrigerated"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const GET = withApiAuth({ resource: "inventory", action: "read" }, async (req) => {
  const url = new URL(req.url);
  const parsed = ListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return apiError("invalid_query", parsed.error.issues.map((i) => i.message).join("; "), 400);
  }
  const { search, category, page, pageSize } = parsed.data;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (category === "compound_ingredient") where.isCompoundIngredient = true;
  if (category === "controlled") where.deaSchedule = { not: null };
  if (category === "refrigerated") where.isRefrigerated = true;
  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { ndc: { contains: s, mode: "insensitive" } },
      { manufacturer: { contains: s, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.item.findMany({
      where,
      include: { lots: { where: { expirationDate: { gte: new Date() } }, select: { quantityOnHand: true } } },
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
    prisma.item.count({ where }),
  ]);

  const data = rows.map((it) => {
    const onHand = it.lots.reduce((sum, l) => sum + Number(l.quantityOnHand ?? 0), 0);
    const reorderPoint = it.reorderPoint ? Number(it.reorderPoint) : null;
    return {
      id: it.id,
      ndc: it.ndc ?? null,
      name: it.name,
      strength: it.strength ?? null,
      manufacturer: it.manufacturer ?? null,
      onHand,
      reorderPoint,
      isLow: reorderPoint != null && onHand <= reorderPoint,
      isCompoundIngredient: !!it.isCompoundIngredient,
      deaSchedule: it.deaSchedule ?? null,
    };
  });

  return apiOk(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});
