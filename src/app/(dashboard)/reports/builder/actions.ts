"use server";

// Whitelist of allowed fields per data source
const FIELD_WHITELIST: Record<string, string[]> = {
  Patients: [
    "id",
    "mrn",
    "firstName",
    "lastName",
    "dateOfBirth",
    "email",
    "status",
    "createdAt",
  ],
  Prescriptions: [
    "id",
    "rxNumber",
    "status",
    "totalQuantity",
    "daysSupply",
    "createdAt",
    "patient.firstName",
    "patient.lastName",
    "prescriber.firstName",
    "prescriber.lastName",
  ],
  Fills: [
    "id",
    "fillNumber",
    "quantity",
    "status",
    "daysSupply",
    "filledAt",
    "dispensedAt",
    "createdAt",
    "item.name",
  ],
  Inventory: [
    "id",
    "name",
    "ndc",
    "strength",
    "dosageForm",
    "isActive",
    "createdAt",
  ],
  Claims: [
    "id",
    "claimNumber",
    "status",
    "amountBilled",
    "amountPaid",
    "submittedAt",
    "adjudicatedAt",
    "createdAt",
  ],
  Sales: [
    "id",
    "total",
    "paymentMethod",
    "status",
    "createdAt",
  ],
};

const FIELD_TYPES: Record<string, string> = {
  id: "string",
  mrn: "string",
  firstName: "string",
  lastName: "string",
  dateOfBirth: "date",
  email: "string",
  status: "string",
  createdAt: "datetime",
  rxNumber: "string",
  totalQuantity: "decimal",
  daysSupply: "integer",
  fillNumber: "integer",
  quantity: "decimal",
  filledAt: "datetime",
  dispensedAt: "datetime",
  name: "string",
  ndc: "string",
  strength: "string",
  dosageForm: "string",
  isActive: "boolean",
  claimNumber: "string",
  amountBilled: "decimal",
  amountPaid: "decimal",
  submittedAt: "datetime",
  adjudicatedAt: "datetime",
  total: "decimal",
  paymentMethod: "string",
};

export async function getAvailableFields(dataSource: string) {
  const { requireUser } = await import("@/lib/auth");
  await requireUser();

  const fields = FIELD_WHITELIST[dataSource] || [];

  return fields.map((field) => ({
    name: field,
    type: FIELD_TYPES[field.split(".").pop() || ""] || "string",
  }));
}

function isFieldAllowed(dataSource: string, field: string): boolean {
  const allowed = FIELD_WHITELIST[dataSource] || [];
  return allowed.includes(field);
}

export async function executeCustomReport(
  dataSource: string,
  columns: string[],
  filters: Array<{ field: string; operator: string; value: string }>,
  sort?: { field: string; direction: "asc" | "desc" },
  limit: number = 100
) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  // Validate all columns and filters are whitelisted
  const allowedFields = FIELD_WHITELIST[dataSource] || [];
  for (const col of columns) {
    if (!isFieldAllowed(dataSource, col)) {
      throw new Error(`Field '${col}' not allowed for ${dataSource}`);
    }
  }

  for (const filter of filters) {
    if (!isFieldAllowed(dataSource, filter.field)) {
      throw new Error(`Field '${filter.field}' not allowed for ${dataSource}`);
    }
  }

  if (sort && !isFieldAllowed(dataSource, sort.field)) {
    throw new Error(`Field '${sort.field}' not allowed for ${dataSource}`);
  }

  // Build where clause from filters
  const whereClause: any = {};
  for (const filter of filters) {
    if (!filter.field || !filter.value) continue;

    const value = filter.value;
    switch (filter.operator) {
      case "=":
        whereClause[filter.field] = value;
        break;
      case "!=":
        whereClause[filter.field] = { not: value };
        break;
      case ">":
        whereClause[filter.field] = { gt: isNaN(Number(value)) ? value : Number(value) };
        break;
      case "<":
        whereClause[filter.field] = { lt: isNaN(Number(value)) ? value : Number(value) };
        break;
      case ">=":
        whereClause[filter.field] = { gte: isNaN(Number(value)) ? value : Number(value) };
        break;
      case "<=":
        whereClause[filter.field] = { lte: isNaN(Number(value)) ? value : Number(value) };
        break;
      case "contains":
        whereClause[filter.field] = { contains: value, mode: "insensitive" };
        break;
      case "startsWith":
        whereClause[filter.field] = { startsWith: value, mode: "insensitive" };
        break;
    }
  }

  // Build order clause
  const orderBy: any = sort ? { [sort.field]: sort.direction } : undefined;

  let results: any[] = [];

  try {
    switch (dataSource) {
      case "Patients":
        results = await prisma.patient.findMany({
          where: whereClause,
          select: columns.reduce(
            (acc, col) => ({ ...acc, [col]: true }),
            {}
          ),
          orderBy,
          take: limit,
        });
        break;

      case "Prescriptions":
        results = await prisma.prescription.findMany({
          where: whereClause,
          include: {
            patient: { select: { firstName: true, lastName: true } },
            prescriber: { select: { firstName: true, lastName: true } },
          },
          orderBy,
          take: limit,
        });
        // Project to requested columns
        results = results.map((r) => {
          const row: any = {};
          for (const col of columns) {
            if (col.includes(".")) {
              const [relation, field] = col.split(".");
              row[col] = r[relation as keyof typeof r]?.[field as any];
            } else {
              row[col] = r[col as keyof typeof r];
            }
          }
          return row;
        });
        break;

      case "Fills":
        results = await prisma.prescriptionFill.findMany({
          where: whereClause,
          include: { item: { select: { name: true } } },
          orderBy,
          take: limit,
        });
        results = results.map((r) => {
          const row: any = {};
          for (const col of columns) {
            if (col.includes(".")) {
              const [relation, field] = col.split(".");
              row[col] = r[relation as keyof typeof r]?.[field as any];
            } else {
              row[col] = r[col as keyof typeof r];
            }
          }
          return row;
        });
        break;

      case "Inventory":
        results = await prisma.item.findMany({
          where: whereClause,
          select: columns.reduce(
            (acc, col) => ({ ...acc, [col]: true }),
            {}
          ),
          orderBy,
          take: limit,
        });
        break;

      case "Claims":
        results = await prisma.claim.findMany({
          where: whereClause,
          select: columns.reduce(
            (acc, col) => ({ ...acc, [col]: true }),
            {}
          ),
          orderBy,
          take: limit,
        });
        break;

      case "Sales":
        results = await prisma.posTransaction.findMany({
          where: whereClause,
          select: columns.reduce(
            (acc, col) => ({ ...acc, [col]: true }),
            {}
          ),
          orderBy,
          take: limit,
        });
        break;
    }
  } catch (error) {
    console.error("Report execution error:", error);
    throw new Error("Failed to execute report");
  }

  return results;
}

export async function saveCustomReport(name: string, config: any) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  // Store in StoreSetting as JSON
  const store = await prisma.store.findFirst();
  if (!store) throw new Error("No store found");

  await prisma.storeSetting.create({
    data: {
      storeId: store.id,
      settingKey: `custom_report_${Date.now()}`,
      settingValue: JSON.stringify({
        name,
        config,
        createdAt: new Date().toISOString(),
      }),
      settingType: "json",
    },
  });
}

export async function getSavedReports() {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const store = await prisma.store.findFirst();
  if (!store) return [];

  const settings = await prisma.storeSetting.findMany({
    where: {
      storeId: store.id,
      settingKey: {
        startsWith: "custom_report_",
      },
    },
  });

  return settings.map((s) => {
    try {
      const data = JSON.parse(s.settingValue);
      return {
        id: s.id,
        name: data.name,
        createdAt: data.createdAt,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export async function loadReport(reportId: string) {
  const { requireUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  await requireUser();

  const setting = await prisma.storeSetting.findUnique({
    where: { id: reportId },
  });

  if (!setting) throw new Error("Report not found");

  const data = JSON.parse(setting.settingValue);
  return data.config;
}
