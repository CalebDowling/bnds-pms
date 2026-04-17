import { prisma } from "@/lib/prisma";
import { withApiAuth, apiOk, apiError } from "@/lib/api/with-api-auth";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withApiAuth({ resource: "patients", action: "read" }, async (req) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
  if (!UUID_REGEX.test(id)) {
    return apiError("invalid_id", "Patient ID must be a UUID.", 400);
  }

  const p = await prisma.patient.findUnique({
    where: { id },
    include: {
      phoneNumbers: { where: { isPrimary: true }, take: 1 },
      allergies: true,
    },
  });

  if (!p) {
    return apiError("not_found", "Patient not found.", 404);
  }

  return apiOk({
    id: p.id,
    mrn: p.mrn,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth.toISOString().split("T")[0],
    gender: p.gender ?? null,
    email: p.email ?? null,
    phone: p.phoneNumbers[0]?.number ?? null,
    status: p.status,
    allergies: p.allergies.map((a) => ({
      allergen: a.allergen,
      severity: a.severity ?? null,
    })),
    createdAt: p.createdAt.toISOString(),
  });
});
