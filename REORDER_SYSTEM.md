# Inventory Reorder Automation System

## Overview

This system automates inventory reordering by monitoring stock levels and generating purchase orders when items fall below configurable reorder points.

## Architecture

### Database Models

**PurchaseOrder**
- Tracks purchase orders from suppliers
- Status: draft → approved → submitted → received
- Links to supplier and items
- Tracks creator, approver, and timestamps

**PurchaseOrderItem**
- Line items within a PurchaseOrder
- Quantity and unit cost per item
- Cascading delete with parent PO

**Item** (enhanced)
- `reorderPoint`: Threshold below which reorder is triggered
- `reorderQuantity`: Suggested order quantity
- `poItems`: Relation to purchase order items

**Supplier** (enhanced)
- `orders`: Relation to purchase orders
- `leadTimeDays`: Used to calculate estimated arrival

### Key Features

1. **Reorder Alerts**: Real-time detection of items below reorder point
2. **Smart Grouping**: Automatically groups items by supplier when generating orders
3. **Urgency Scoring**: Prioritizes items that are furthest below threshold
4. **Draft POs**: Orders created in draft status for review before approval
5. **Audit Trail**: Tracks creation and approval by users with timestamps

## API & Actions

### Server Actions (`src/app/(dashboard)/inventory/reorder/actions.ts`)

#### getReorderAlerts()
Returns items currently below reorder point with urgency scores.

```typescript
const alerts = await getReorderAlerts();
// Returns: ReorderAlert[]
// {
//   itemId, itemName, ndc, currentStock, reorderPoint,
//   suggestedQuantity, urgencyScore, ...
// }
```

#### generatePurchaseOrder(items: PurchaseOrderData[])
Creates a draft purchase order for specified items. Automatically groups by supplier.

```typescript
const poId = await generatePurchaseOrder([
  { itemId: "item-1", quantity: 100 },
  { itemId: "item-2", quantity: 50 }
]);
```

#### autoGenerateReorders()
Scans all items below reorder point and auto-creates draft POs grouped by supplier.

```typescript
const { createdOrders, itemsProcessed } = await autoGenerateReorders();
```

#### getReorderHistory(limit = 10)
Fetches recent purchase orders with status and metadata.

```typescript
const history = await getReorderHistory(20);
```

#### approveOrder(orderId: string)
Marks a PO as approved and sets estimated arrival (7 days default).

```typescript
await approveOrder("po-id");
```

#### getReorderSettings()
Returns reorder configuration (auto-reorder enabled, lead time buffer, etc.).

```typescript
const settings = await getReorderSettings();
```

### REST API (`src/app/api/inventory/reorder/route.ts`)

#### GET /api/inventory/reorder
Returns items below reorder threshold. Used by external integrations or cron jobs.

**Response:**
```json
{
  "success": true,
  "itemsBelowThreshold": 5,
  "items": [
    {
      "itemId": "uuid",
      "itemName": "Amoxicillin 250mg",
      "currentStock": 10,
      "reorderPoint": 100,
      "suggestedQuantity": 200,
      "urgencyScore": 90
    }
  ],
  "timestamp": "2026-03-19T10:00:00Z"
}
```

#### POST /api/inventory/reorder
Triggers automatic reorder generation.

**Request:**
```json
{
  "action": "auto-generate"
}
```

**Response:**
```json
{
  "success": true,
  "createdOrders": 3,
  "itemsProcessed": 12,
  "timestamp": "2026-03-19T10:00:00Z"
}
```

## UI Pages

### Reorder Dashboard (`/inventory/reorder`)

**Features:**
- Stats panel: Items below threshold, draft POs, pending orders, auto-reorder toggle
- Interactive table: Select items to add to PO, bulk selection
- Suggested quantities: Calculated based on reorder point and quantity
- Recent orders sidebar: Shows PO history with status badges
- Auto-generate button: Creates all pending reorders at once

**Workflow:**
1. View items below threshold
2. Select items to order (or auto-generate)
3. System creates draft PO grouped by supplier
4. User reviews and approves
5. Order status tracked through fulfillment

## Database Schema

### purchase_orders
```sql
- id (UUID): Primary key
- po_number (VARCHAR): Unique purchase order number
- supplier_id (UUID): Foreign key to suppliers
- status (VARCHAR): draft, approved, submitted, received
- estimated_arrival (TIMESTAMPTZ): Expected delivery date
- notes (TEXT): Order notes
- created_by (UUID): User who created the order
- created_at (TIMESTAMPTZ): Creation timestamp
- approved_by (UUID): User who approved
- approved_at (TIMESTAMPTZ): Approval timestamp
- received_at (TIMESTAMPTZ): Receipt timestamp
```

### purchase_order_items
```sql
- id (UUID): Primary key
- purchase_order_id (UUID): Foreign key to purchase_orders
- item_id (UUID): Foreign key to items
- quantity (NUMERIC): Quantity ordered
- unit_cost (NUMERIC): Cost per unit
- notes (TEXT): Item-specific notes
```

## Migration

The migration `20260319_purchase_order_system.sql` creates all necessary tables and indexes.

To apply:
```bash
npx prisma migrate deploy
```

Or manually run the SQL in your database.

## Security

- All actions require `getCurrentUser()` authentication
- PermissionGuard on UI: requires `inventory` resource with `manage` action
- API endpoints check authentication
- Audit trail: creator and approver tracked with timestamps

## Future Enhancements

1. **Settings UI**: Configure auto-reorder enabled, lead time buffer
2. **Notifications**: Alert when orders are below threshold
3. **Supplier Integration**: EDI/API integration for automated ordering
4. **Receiving**: Mark orders received, update inventory from PO
5. **Analytics**: Reorder history, supplier performance metrics
6. **Workflows**: Approval chains, email notifications
7. **Bulk Actions**: Cancel, reschedule, split orders
8. **Cost Analysis**: Track total spend per supplier, variances

## Example Workflow

1. **Admin sets reorder points** on items:
   - Amoxicillin 250mg: reorderPoint=100, reorderQuantity=500
   - Lisinopril 10mg: reorderPoint=50, reorderQuantity=300

2. **Stock drops below threshold**:
   - Amoxicillin on-hand = 45 (below 100)
   - Lisinopril on-hand = 20 (below 50)

3. **Pharmacist views /inventory/reorder**:
   - Sees 2 items below threshold
   - Clicks "Generate All POs"
   - System creates 2 draft POs (one per supplier)

4. **Manager reviews and approves**:
   - Sees draft POs with suggested quantities
   - Approves PO-2026031901
   - System updates status to "approved" with 7-day ETA

5. **Order received**:
   - Status updated to "received"
   - Inventory increased via receiving module

## Testing

To test locally:

1. Add items to inventory with reorder points
2. Reduce stock levels to trigger alerts
3. Visit `/inventory/reorder` dashboard
4. Use "Generate All POs" to create draft orders
5. Check API: `curl http://localhost:3000/api/inventory/reorder`

## Integration Examples

### Cron Job (via external service)
```javascript
// Daily 5am check for low stock
const response = await fetch('https://yourapp.com/api/inventory/reorder', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ action: 'auto-generate' })
});
```

### External Dashboard
```javascript
// Get current reorder status
const response = await fetch('https://yourapp.com/api/inventory/reorder', {
  headers: { 'Authorization': `Bearer ${TOKEN}` }
});
const data = await response.json();
console.log(`${data.itemsBelowThreshold} items need reordering`);
```

## File Structure

```
src/app/(dashboard)/inventory/reorder/
├── actions.ts          # Server actions for reorder logic
└── page.tsx           # Dashboard UI component

src/app/api/inventory/
└── reorder/
    └── route.ts       # REST API endpoints

prisma/
├── schema.prisma      # Updated with PurchaseOrder models
└── migrations/
    └── 20260319_purchase_order_system.sql
```
