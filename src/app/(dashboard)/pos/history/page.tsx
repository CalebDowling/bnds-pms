/**
 * /pos/history — Transaction history (real data).
 */
import { getTransactions, getSessions } from "../actions";
import { formatPatientName, formatDateTime } from "@/lib/utils/formatters";
import PosHistoryClient, { type PosTxRow, type PosSessionRow } from "./PosHistoryClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{ q?: string; search?: string; page?: string }>;
}

export default async function PosHistoryPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const search = (sp.q ?? sp.search ?? "").trim();
  const page = Number(sp.page ?? 1);

  const [{ transactions, total: txTotal, pages: txPages }, { sessions }] = await Promise.all([
    getTransactions({ search, page, limit: 50 }),
    getSessions({ limit: 25 }),
  ]);

  const txRows: PosTxRow[] = transactions.map((t: any) => ({
    id: t.id.slice(0, 8),
    date: formatDateTime(t.processedAt),
    patient: t.patient ? formatPatientName(t.patient) : "Walk-in",
    type: (() => {
      const hasRx = t.lineItems?.some((li: any) => li.fill);
      const hasOtc = t.lineItems?.some((li: any) => !li.fill);
      if (hasRx && hasOtc) return "Rx + OTC";
      if (hasRx) return "Rx";
      if (hasOtc) return "OTC";
      return "—";
    })(),
    items: t._count?.lineItems ?? 0,
    total: Number(t.total ?? 0),
    payment: t.paymentMethod ?? "—",
    cardLast4: t.cardLastFour ?? null,
    cashier: t.cashier ? formatPatientName(t.cashier) : "—",
  }));

  const sessionRows: PosSessionRow[] = sessions.map((s: any) => ({
    id: s.id.slice(0, 8),
    openedAt: s.openedAt ? formatDateTime(s.openedAt) : "—",
    closedAt: s.closedAt ? formatDateTime(s.closedAt) : null,
    opener: s.opener ? formatPatientName(s.opener) : "—",
    closer: s.closer ? formatPatientName(s.closer) : null,
    txCount: s._count?.transactions ?? 0,
    status: s.status as "open" | "closed",
  }));

  return (
    <PosHistoryClient
      txRows={txRows}
      sessionRows={sessionRows}
      txTotal={txTotal}
      txPage={page}
      txTotalPages={txPages}
      search={search}
    />
  );
}
