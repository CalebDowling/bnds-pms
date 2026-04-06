# CSV/Excel Export Functionality Guide

## Overview
Complete implementation of CSV/Excel export functionality for the Boudreaux's Pharmacy Management System. All major data resources (patients, prescriptions, inventory, billing) and reports (daily fills, inventory, batch log) can be exported.

## Architecture

### Data Flow
1. **User clicks Export button** → UI component opens dropdown
2. **User selects CSV or Excel** → Client-side hook fetches data from API
3. **API route authenticates & validates permissions** → Queries database
4. **Data is formatted and returned as JSON** → Client-side download triggered
5. **File downloads to user's computer**

### Key Components

#### 1. Export Utility (`src/lib/export.ts`)
Core functions for CSV/Excel generation:
- `downloadCSV(data, filename)` - Generates and downloads CSV
- `downloadExcel(data, filename, sheetName)` - Generates and downloads Excel
- `convertToCSV(data, filename)` - Converts array to CSV string
- Formatting helpers for dates, phones, currency

#### 2. ExportButton Component (`src/components/ui/ExportButton.tsx`)
Reusable dropdown button component:
```tsx
<ExportButton
  endpoint="/api/export/patients"
  filename="patients_2026-03-14"
  sheetName="Patients"
  params={{ status: "active", search: "" }}
/>
```

Properties:
- `endpoint` (required) - API route to fetch data from
- `filename` (required) - Name for downloaded file (without extension)
- `sheetName` (optional) - Sheet name for Excel exports (default: "Sheet1")
- `params` (optional) - Query parameters for API filtering

#### 3. ReportsExportButton Component (`src/components/dashboard/ReportsExportButton.tsx`)
Specialized component for reports with date range handling:
```tsx
<ReportsExportButton
  tab="fills"
  date="2026-03-14"
/>
```

#### 4. useExport Hook (`src/hooks/useExport.ts`)
Custom hook for managing export state:
```tsx
const { isLoading, error, exportToCSV, exportToExcel } = useExport();
```

## API Routes

All routes require authentication and check permissions.

### Export Endpoints

#### `GET /api/export/patients`
**Permissions**: `patients:read`

Query Parameters:
- `status` - Filter: "active", "inactive", "all"
- `search` - Search term for name, MRN, phone, email

Response Fields:
- Patient ID, Last Name, First Name, Suffix, MRN
- Date of Birth, Email, Primary Phone
- Status, Created Date

#### `GET /api/export/prescriptions`
**Permissions**: `prescriptions:read`

Query Parameters:
- `status` - Filter by status
- `search` - Search by Rx#, patient, MRN

Response Fields:
- Rx Number, Patient, MRN, Prescriber Name
- Medication, Strength, Quantity Dispensed, Unit
- Status, Created Date, Filled Date

#### `GET /api/export/inventory`
**Permissions**: `inventory:read`

Query Parameters:
- `category` - Filter: "all", "compound_ingredient", "controlled", "refrigerated"
- `search` - Search by name, NDC, manufacturer

Response Fields:
- Item ID, Item Name, Generic Name, NDC, Strength
- Manufacturer, On Hand, Unit of Measure, Reorder Point
- Low Stock (Yes/No), Compound Ingredient, Refrigerated, DEA Schedule
- Earliest Expiry, Lot Count, Created Date

#### `GET /api/export/billing`
**Permissions**: `billing:read`

Query Parameters:
- `status` - Filter by claim status
- `startDate`, `endDate` - Date range for service date

Response Fields:
- Claim ID, Patient, MRN, Insurance Plan
- Service Date, Amount Billed, Amount Paid
- Patient Responsibility, Status
- Submitted Date, Processed Date, Denial Reason

#### `GET /api/export/reports/fills`
**Permissions**: `reports:read`

Query Parameters:
- `date` - Required. Format: YYYY-MM-DD

Response Fields:
- Time, Rx Number, Patient, Drug/Formula
- Strength, Quantity, Lot/Batch, Fill Number
- Fill Type (Original/Refill), Status, Created Date

#### `GET /api/export/reports/inventory`
**Permissions**: `reports:read`

Response Fields:
- Item, Generic Name, NDC, Strength, Manufacturer
- On Hand, Unit of Measure, Reorder Point
- Low Stock, Expiring Soon, Compound Ingredient
- Refrigerated, DEA Schedule, Earliest Expiry, Lot Count

#### `GET /api/export/reports/batches`
**Permissions**: `reports:read`

Query Parameters:
- `startDate`, `endDate` - Date range. Format: YYYY-MM-DD

Response Fields:
- Batch Number, Formula, Formula Code
- Quantity Prepared, Unit, BUD Date
- Compounder, QA Reviews, Fills
- Status, Created Date, Created Time

## Usage Examples

### Adding Export to a New Page

1. Import the component:
```tsx
import ExportButton from "@/components/ui/ExportButton";
```

2. Add to your page layout (typically in header):
```tsx
<ExportButton
  endpoint="/api/export/patients"
  filename={`patients_${new Date().toISOString().split("T")[0]}`}
  sheetName="Patients"
  params={{
    status: filterStatus,
    search: searchTerm,
  }}
/>
```

### Creating a New Export API Route

1. Create route file: `src/app/api/export/[resource]/route.ts`

2. Template:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check permission
    await requirePermission("resource", "read");

    // Get query params
    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get("filter");

    // Fetch data
    const data = await prisma.model.findMany({
      where: { /* filters */ },
    });

    // Format and return
    const exportData = data.map(item => ({
      "Column 1": item.field1,
      "Column 2": item.field2,
    }));

    return NextResponse.json(exportData);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Permission denied")) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
```

## Data Formatting

All data uses consistent formatting:

### Dates
Format: `MM/DD/YYYY`
```typescript
formatDate(date).toLocaleDateString("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
})
```

### Phone Numbers
Format: `(XXX) XXX-XXXX`
```typescript
formatPhoneForExport(phone)
```

### Currency
Format: `$XXX.XX`
```typescript
formatCurrencyForExport(amount)
```

### Null/Undefined Values
Displayed as empty string in CSV/Excel

### Special Characters
In CSV, quotes and special characters are properly escaped

## Security & Permissions

### Authentication
All API routes require an authenticated session. Users without valid credentials get 401 errors.

### Authorization
Each API route checks specific permissions:
- `patients:read` - Required for patient export
- `prescriptions:read` - Required for prescription export
- `inventory:read` - Required for inventory export
- `billing:read` - Required for billing export
- `reports:read` - Required for all report exports

Users without required permissions get 403 (Forbidden) responses.

### Filtered Exports
Exports respect current page filters:
- Patients page respects status and search filters
- Prescriptions page respects status and search filters
- Inventory page respects category and search filters
- Reports export current tab with applied date ranges

## Performance Considerations

### Large Datasets
- API routes fetch all matching records
- CSV generation is done client-side
- No pagination is applied to exports
- For very large datasets (10k+ records), consider adding server-side pagination

### Recommended Limits
- Patients: ~5,000 records
- Prescriptions: ~10,000 records
- Inventory: ~2,000 records

### Optimization Tips
1. Filter data on the page before exporting
2. Use date ranges for reports
3. Search/filter by patient MRN for prescriptions

## Browser Compatibility

- **CSV Export**: Works in all modern browsers
- **Excel Export**: Requires:
  - Modern browser with Blob support
  - `xlsx` npm package installed
  - JavaScript enabled

## Installation & Setup

### Prerequisites
```bash
# Install xlsx for Excel export (optional)
npm install xlsx --legacy-peer-deps
```

### Dependencies
- `next` - 16.x
- `@prisma/client` - 5.x
- `react` - 19.x

No other external dependencies required for CSV export.

## Troubleshooting

### Export Button Not Showing
- Check that component is imported correctly
- Verify endpoint prop is set to valid API route
- Check browser console for errors

### Export Fails with Permission Error
- User's role may not have required permissions
- Contact administrator to grant permissions
- Check RBAC_IMPLEMENTATION.md for role setup

### Excel Export Not Working
- Install xlsx: `npm install xlsx --legacy-peer-deps`
- Check that xlsx is in node_modules
- Try CSV export first to verify API works

### Date Formatting Wrong
- Check that dates are being passed correctly to export API
- Verify `formatDate()` function is being used

### Missing Data in Export
- Check filter parameters are being passed to API
- Verify API is receiving query parameters correctly
- Check that API endpoint matches table data source

## Future Enhancements

Possible improvements:
1. Scheduled automated exports
2. Export templates/presets
3. Custom column selection
4. Advanced filtering in export dialog
5. Large dataset streaming (chunked downloads)
6. PDF export support
7. Email export directly
8. Export history/audit log
