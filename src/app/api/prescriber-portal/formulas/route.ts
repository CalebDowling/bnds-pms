import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrescriberFromRequest } from "@/lib/prescriber-auth";
import { getErrorMessage } from "@/lib/errors";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify prescriber authentication
    const prescriber = await getPrescriberFromRequest(request);
    if (!prescriber) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch active formulas with their current version and ingredients
    const formulas = await prisma.formula.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        formulaCode: true,
        category: true,
        dosageForm: true,
        route: true,
        isSterile: true,
        currentVersionId: true,
        versions: {
          where: { id: { equals: undefined } }, // We'll handle version separately
          take: 0,
        },
      },
      orderBy: { name: "asc" },
    });

    // Fetch formula details with current versions
    const formulasWithVersions = await Promise.all(
      formulas.map(async (formula) => {
        const version = formula.currentVersionId
          ? await prisma.formulaVersion.findUnique({
              where: { id: formula.currentVersionId },
              select: {
                id: true,
                versionNumber: true,
                ingredients: {
                  select: {
                    id: true,
                    itemId: true,
                    item: {
                      select: {
                        name: true,
                        strength: true,
                        dosageForm: true,
                      },
                    },
                    quantity: true,
                    unit: true,
                    isActiveIngredient: true,
                  },
                  orderBy: { sortOrder: "asc" },
                },
              },
            })
          : null;

        return {
          id: formula.id,
          name: formula.name,
          formulaCode: formula.formulaCode,
          category: formula.category,
          dosageForm: formula.dosageForm,
          route: formula.route,
          isSterile: formula.isSterile,
          ingredients: version?.ingredients || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      formulas: formulasWithVersions,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Formulas fetch error:", message);

    return NextResponse.json(
      { error: "Failed to fetch formulas" },
      { status: 500 }
    );
  }
}
