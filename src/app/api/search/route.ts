import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [patients, prescriptions, items, formulas, prescribers] = await Promise.all([
    prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { mrn: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true },
      take: 5,
    }),
    prisma.prescription.findMany({
      where: {
        OR: [
          { rxNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true, rxNumber: true, status: true,
        patient: { select: { firstName: true, lastName: true } },
        item: { select: { name: true } },
        formula: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.item.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { genericName: { contains: q, mode: "insensitive" } },
          { ndc: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, strength: true, ndc: true },
      take: 5,
    }),
    prisma.formula.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { formulaCode: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, formulaCode: true },
      take: 5,
    }),
    prisma.prescriber.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { npi: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, npi: true, suffix: true },
      take: 3,
    }),
  ]);

  const results = [
    ...patients.map(p => ({ type: "patient" as const, id: p.id, title: `${p.lastName}, ${p.firstName}`, subtitle: p.mrn, href: `/patients/${p.id}` })),
    ...prescriptions.map(rx => ({ type: "prescription" as const, id: rx.id, title: `Rx# ${rx.rxNumber}`, subtitle: `${rx.patient.lastName}, ${rx.patient.firstName} — ${rx.item?.name || rx.formula?.name || ""}`, href: `/prescriptions/${rx.id}` })),
    ...items.map(i => ({ type: "item" as const, id: i.id, title: i.name, subtitle: `${i.strength || ""} ${i.ndc ? `NDC: ${i.ndc}` : ""}`.trim(), href: `/inventory/${i.id}` })),
    ...formulas.map(f => ({ type: "formula" as const, id: f.id, title: f.name, subtitle: f.formulaCode, href: `/compounding/formulas/${f.id}` })),
    ...prescribers.map(d => ({ type: "prescriber" as const, id: d.id, title: `Dr. ${d.lastName}, ${d.firstName}${d.suffix ? ` ${d.suffix}` : ""}`, subtitle: `NPI: ${d.npi}`, href: `/prescriptions` })),
  ];

  return NextResponse.json({ results });
}
