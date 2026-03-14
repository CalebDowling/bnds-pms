/**
 * Client-side utilities for exporting data to CSV and Excel formats
 */

/**
 * Convert data to CSV string
 */
export function convertToCSV(
  data: Record<string, any>[],
  filename: string
): string {
  if (data.length === 0) return "";

  // Get headers from first row
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    // Header row
    headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Handle different types
          if (value === null || value === undefined) {
            return '""';
          }
          const str = String(value);
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return `"${str}"`;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(
  data: Record<string, any>[],
  filename: string
): void {
  const csvContent = convertToCSV(data, filename);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download Excel file using xlsx library
 * This requires xlsx to be installed
 */
export async function downloadExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName: string = "Sheet1"
): Promise<void> {
  try {
    const XLSX = await import("xlsx");

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Write file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error("Failed to export to Excel:", error);
    throw new Error("Excel export requires xlsx library to be installed");
  }
}

/**
 * Format date for export (MM/DD/YYYY)
 */
export function formatDateForExport(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Format phone number for export
 */
export function formatPhoneForExport(phone: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number | null): string {
  if (amount === null || amount === undefined) return "";
  return `$${Number(amount).toFixed(2)}`;
}

/**
 * Prepare patient data for export
 */
export function formatPatientForExport(patient: any): Record<string, any> {
  const primaryPhone = patient.phoneNumbers?.find(
    (p: any) => p.isPrimary
  ) || patient.phoneNumbers?.[0];

  return {
    "Patient ID": patient.id,
    "Last Name": patient.lastName,
    "First Name": patient.firstName,
    Suffix: patient.suffix || "",
    MRN: patient.mrn,
    "Date of Birth": formatDateForExport(patient.dateOfBirth),
    Email: patient.email || "",
    "Primary Phone": primaryPhone
      ? formatPhoneForExport(primaryPhone.number)
      : "",
    Status: patient.status,
    "Created Date": formatDateForExport(patient.createdAt),
  };
}

/**
 * Prepare prescription data for export
 */
export function formatPrescriptionForExport(rx: any): Record<string, any> {
  return {
    "Rx Number": rx.rxNumber,
    Patient: rx.patientName,
    MRN: rx.patientMrn,
    "Prescriber Name": rx.prescriberName,
    Medication: rx.medication,
    Strength: rx.strength || "",
    "Quantity Dispensed": rx.quantityDispensed || "",
    Status: rx.status,
    "Created Date": formatDateForExport(rx.createdAt),
    "Date Filled": rx.dateFilled ? formatDateForExport(rx.dateFilled) : "",
  };
}

/**
 * Prepare inventory item for export
 */
export function formatInventoryForExport(item: any): Record<string, any> {
  const isLowStock = item.reorderPoint && item.totalOnHand <= Number(item.reorderPoint);

  return {
    "Item ID": item.id,
    "Item Name": item.name,
    "Generic Name": item.genericName || "",
    NDC: item.ndc || "",
    Strength: item.strength || "",
    Manufacturer: item.manufacturer || "",
    "On Hand": item.totalOnHand,
    "Unit of Measure": item.unitOfMeasure || "",
    "Reorder Point": item.reorderPoint || "",
    "Low Stock": isLowStock ? "Yes" : "No",
    "Compound Ingredient": item.isCompoundIngredient ? "Yes" : "No",
    Refrigerated: item.isRefrigerated ? "Yes" : "No",
    "DEA Schedule": item.deaSchedule || "",
    "Earliest Expiry": item.earliestExpiry
      ? formatDateForExport(item.earliestExpiry)
      : "",
    "Lot Count": item.lotCount || 0,
  };
}

/**
 * Prepare billing/claims data for export
 */
export function formatBillingForExport(claim: any): Record<string, any> {
  return {
    "Claim ID": claim.id,
    "Claim Number": claim.claimNumber || "",
    "Amount Billed": formatCurrencyForExport(claim.amountBilled),
    "Amount Allowed": formatCurrencyForExport(claim.amountAllowed),
    "Amount Paid": formatCurrencyForExport(claim.amountPaid),
    "Patient Copay": formatCurrencyForExport(claim.patientCopay),
    Status: claim.status,
    "Submitted Date": claim.submittedAt
      ? formatDateForExport(claim.submittedAt)
      : "",
    "Adjudicated Date": claim.adjudicatedAt
      ? formatDateForExport(claim.adjudicatedAt)
      : "",
    "Paid Date": claim.paidAt
      ? formatDateForExport(claim.paidAt)
      : "",
  };
}

/**
 * Prepare audit log entries for export
 */
export function formatAuditLogForExport(logs: any[]): Record<string, any>[] {
  return logs.map((log) => ({
    Timestamp: formatDateForExport(log.createdAt),
    User: `${log.user.firstName} ${log.user.lastName}`,
    Email: log.user.email,
    Action: log.action,
    Resource: log.tableName,
    "Resource ID": log.recordId || "",
    "IP Address": log.ipAddress || "",
    "Old Values": log.oldValues ? JSON.stringify(log.oldValues) : "",
    "New Values": log.newValues ? JSON.stringify(log.newValues) : "",
  }));
}
