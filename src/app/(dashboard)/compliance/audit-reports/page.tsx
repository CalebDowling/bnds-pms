import { Suspense } from "react";
import { PageCard, PageHeader } from "@/components/ui/PageCard";
import ExportButton from "@/components/ui/ExportButton";
import { formatDate } from "@/lib/utils";
import {
  getDispensingLog,
  getControlledSubstanceReport,
  getPharmacistVerificationLog,
  getCompoundingLog,
  getAuditSummaryStats,
} from "./actions";

export const dynamic = "force-dynamic";

async function AuditReportsContent({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const startDate = params.startDate || thirtyDaysAgo.toISOString().split("T")[0];
  const endDate = params.endDate || today.toISOString().split("T")[0];

  const stats = await getAuditSummaryStats(startDate, endDate);

  return (
    <div>
      <PageHeader
        title="Board of Pharmacy Audit Reports"
        description="Compliance reports for regulatory inspections and audits"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <PageCard accent="#40721d">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Total Rxs Dispensed
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.totalRxsDispensed}
            </p>
            <p className="text-xs text-gray-500 mt-1">Period: {startDate} to {endDate}</p>
          </div>
        </PageCard>

        <PageCard accent="#a855f7">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Controlled Substances
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.controlledSubstancePercentage}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Of total dispensed</p>
          </div>
        </PageCard>

        <PageCard accent="#f59e0b">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Error Rate
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.errorRate.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Flagged discrepancies</p>
          </div>
        </PageCard>

        <PageCard accent="#3b82f6">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Avg Verification
            </p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.avgVerificationTimeMinutes}
            </p>
            <p className="text-xs text-gray-500 mt-1">Minutes to verify</p>
          </div>
        </PageCard>
      </div>

      {/* Date Range Filter */}
      <PageCard className="mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Start Date
              </label>
              <input
                type="date"
                defaultValue={startDate}
                onChange={(e) => {
                  const params = new URLSearchParams();
                  params.set("startDate", e.target.value);
                  params.set("endDate", endDate);
                  window.location.search = params.toString();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                End Date
              </label>
              <input
                type="date"
                defaultValue={endDate}
                onChange={(e) => {
                  const params = new URLSearchParams();
                  params.set("startDate", startDate);
                  params.set("endDate", e.target.value);
                  window.location.search = params.toString();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </PageCard>

      {/* Report Cards */}
      <div className="space-y-6">
        {/* Dispensing Log Report */}
        <ReportCard
          title="Dispensing Log"
          description="Complete record of all dispensed fills"
          accent="#3b82f6"
          startDate={startDate}
          endDate={endDate}
          reportType="dispensing"
        />

        {/* Controlled Substance Report */}
        <ReportCard
          title="Controlled Substance Report"
          description="Schedule II-V substances with inventory tracking"
          accent="#a855f7"
          startDate={startDate}
          endDate={endDate}
          reportType="controlled"
        />

        {/* Pharmacist Verification Log */}
        <ReportCard
          title="Pharmacist Verification Log"
          description="Who verified what and when"
          accent="#f59e0b"
          startDate={startDate}
          endDate={endDate}
          reportType="verification"
        />

        {/* Compounding Log */}
        <ReportCard
          title="Compounding Log"
          description="All compounded batches with formulas and lot numbers"
          accent="#f43f5e"
          startDate={startDate}
          endDate={endDate}
          reportType="compounding"
        />

        {/* Prescription Error Log */}
        <ReportCard
          title="Prescription Error Log"
          description="Flagged discrepancies and error documentation"
          accent="#dc2626"
          startDate={startDate}
          endDate={endDate}
          reportType="errors"
        />

        {/* Patient Counseling Log */}
        <ReportCard
          title="Patient Counseling Log"
          description="Counseling session documentation"
          accent="#10b981"
          startDate={startDate}
          endDate={endDate}
          reportType="counseling"
        />
      </div>
    </div>
  );
}

function ReportCard({
  title,
  description,
  accent,
  startDate,
  endDate,
  reportType,
}: {
  title: string;
  description: string;
  accent: string;
  startDate: string;
  endDate: string;
  reportType: string;
}) {
  return (
    <PageCard accent={accent}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${accent}20 0%, ${accent}10 100%)`,
            }}
          >
            <div
              style={{ color: accent }}
              className="text-lg font-semibold"
            >
              📋
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <ExportButton
            endpoint={`/api/export/${reportType}`}
            filename={`${reportType}-report-${startDate}-to-${endDate}`}
            params={{
              startDate,
              endDate,
            }}
          />
          <button
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Generate PDF
          </button>
        </div>
      </div>
    </PageCard>
  );
}

export default function AuditReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-gray-100 rounded-xl border border-gray-200"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <AuditReportsContent searchParams={searchParams} />
    </Suspense>
  );
}
