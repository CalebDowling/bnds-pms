# Notifications & Automation System Guide

This document describes the newly implemented notifications system and automation features for the BNDS PMS pharmacy management system.

## Overview

The system provides:
- **Notifications utility** for managing user notifications
- **Automation checks** that run on a schedule to detect pharmacy events
- **API endpoints** for notification management and automation execution
- **UI component** with notification bell and dropdown for displaying recent notifications

## Prisma Schema Changes

### New Notification Model

```prisma
model Notification {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  type      String   @db.VarChar(30)
  title     String   @db.VarChar(255)
  message   String   @db.Text
  metadata  Json?    @default("{}")
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

### User Model Update

Added `notifications` relation to User model for cascade operations.

## Notification Types

The system supports five notification types:

1. **`low_stock`** - Item quantity falls below reorder point
   - Metadata: `itemId`, `itemName`, `currentQuantity`, `reorderPoint`

2. **`expiring_lot`** - Inventory lot approaching expiration date
   - Metadata: `itemId`, `itemName`, `lotNumber`, `daysUntilExpiry`, `expirationDate`, `quantityOnHand`

3. **`refill_due`** - Patient prescription refill is approaching
   - Metadata: `prescriptionId`, `rxNumber`, `patientId`, `patientName`, `daysUntilDue`, `refillsRemaining`

4. **`claim_rejected`** - Insurance claim was rejected
   - Metadata: `claimNumber`, `claimId`, `patientId`, `patientName`, `rxNumber`, `rejectionCode`, `rejectionMessage`

5. **`batch_expiring`** - Reserved for future batch expiration tracking

## File Structure

```
src/
├── lib/
│   ├── notifications.ts          # Notification utility functions
│   └── automation.ts             # Automation check functions
└── app/
    └── api/
        ├── notifications/
        │   ├── route.ts          # GET/PATCH notifications
        │   └── unread-count/
        │       └── route.ts      # GET unread count
        └── automation/
            └── run/
                └── route.ts      # POST run automation checks

components/
└── dashboard/
    └── DashboardHeader.tsx       # Updated with notification bell & dropdown

prisma/
└── migrations/
    └── 20260315_notifications.sql # Database migration
```

## API Endpoints

### Get Notifications
```http
GET /api/notifications?page=1&limit=20&unreadOnly=false
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "low_stock",
      "title": "Low Stock Alert: Amoxicillin 500mg",
      "message": "...",
      "metadata": { ... },
      "isRead": false,
      "createdAt": "2026-03-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```

### Mark Notifications as Read
```http
PATCH /api/notifications
Content-Type: application/json

{
  "notificationIds": ["uuid1", "uuid2"],
  "markAll": false
}
```

Or mark all as read:
```json
{
  "markAll": true
}
```

### Get Unread Count
```http
GET /api/notifications/unread-count
```

**Response:**
```json
{
  "unreadCount": 5
}
```

### Run Automation Checks
```http
POST /api/automation/run
Content-Type: application/json

{
  "checks": ["low_stock", "expiring_lots", "refills_due", "rejected_claims"]
}
```

**Response:**
```json
{
  "totalChecks": 4,
  "totalAlertsGenerated": 12,
  "totalItemsProcessed": 156,
  "totalErrors": 0,
  "details": [
    {
      "checkName": "checkLowStock",
      "alertsGenerated": 3,
      "itemsProcessed": 48,
      "errors": []
    }
  ]
}
```

## Notification Utility Functions

### Create Notification
```typescript
import { createNotification } from "@/lib/notifications";

await createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: NotificationMetadata
);
```

### Get Unread Notifications
```typescript
import { getUnreadNotifications } from "@/lib/notifications";

const notifications = await getUnreadNotifications(userId, limit = 20);
```

### Get Unread Count
```typescript
import { getUnreadCount } from "@/lib/notifications";

const count = await getUnreadCount(userId);
```

### Get Paginated Notifications
```typescript
import { getNotifications } from "@/lib/notifications";

const result = await getNotifications(userId, {
  page: 1,
  limit: 20,
  unreadOnly: false
});
```

### Mark as Read
```typescript
import { markAsRead, markManyAsRead, markAllAsRead } from "@/lib/notifications";

// Single notification
await markAsRead(notificationId);

// Multiple notifications
await markManyAsRead([notificationId1, notificationId2]);

// All for a user
await markAllAsRead(userId);
```

### Delete Notifications
```typescript
import { deleteNotification, deleteOldNotifications } from "@/lib/notifications";

// Delete specific notification
await deleteNotification(notificationId);

// Delete old unread notifications
await deleteOldNotifications(olderThanDays = 30);
```

## Automation Functions

### Check Low Stock
```typescript
import { checkLowStock } from "@/lib/automation";

const result = await checkLowStock();
```

Queries items with `reorderPoint` set and calculates total `quantityOnHand` from available lots. Creates notifications for inventory managers and admins when stock falls below reorder point.

### Check Expiring Lots
```typescript
import { checkExpiringLots } from "@/lib/automation";

const result = await checkExpiringLots();
```

Queries lots expiring within 30 days, grouped by urgency:
- **This week** (7 days): Creates "URGENT" notifications
- **This month** (7-30 days): Creates standard notifications

### Check Refills Due
```typescript
import { checkRefillsDue } from "@/lib/automation";

const result = await checkRefillsDue();
```

Queries prescriptions with remaining refills where the last fill + daysSupply is within 7 days. Notifies pharmacy staff.

### Check Rejected Claims
```typescript
import { checkRejectedClaims } from "@/lib/automation";

const result = await checkRejectedClaims();
```

Queries claims rejected in the last 24 hours and notifies billing specialists, pharmacists, and admins.

### Run All Checks
```typescript
import { runAutomationChecks } from "@/lib/automation";

// Run all checks
const results = await runAutomationChecks();

// Run specific checks
const results = await runAutomationChecks([
  "low_stock",
  "expiring_lots",
  "refills_due",
  "rejected_claims"
]);
```

## Error Handling

All automation functions and notification operations are designed to be non-blocking:

- **Notification creation errors** are logged but don't stop the automation check
- **Automation check errors** are captured in the `errors` array and returned in the result summary
- **API errors** return appropriate HTTP status codes (401, 403, 500) with error messages

## Security

- **Authentication required** for all notification API endpoints
- **Permission checks** enforce admin role for automation endpoints
- **Cascade deletion** ensures notifications are cleaned up when users are deleted
- **Rate limiting** (via automation route permissions) prevents abuse

## Scheduling Integration

For scheduled execution of automation checks, you can:

1. **Use a cron job** to call the `/api/automation/run` endpoint periodically
2. **Use Vercel Cron Functions** if deployed to Vercel:
   ```typescript
   // src/app/api/automation/schedule/route.ts
   export const runtime = 'nodejs';

   export async function GET(req: Request) {
     if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
       return new Response('Unauthorized', { status: 401 });
     }

     return fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/automation/run`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```

3. **Use a task queue** like Bull, BullMQ, or Trigger.dev for more sophisticated scheduling

## UI Components

### DashboardHeader Notification Bell

The `DashboardHeader` component has been updated with:

- **Notification bell icon** with unread count badge
- **Dropdown menu** showing recent unread notifications
- **Mark as read** functionality (individual and bulk)
- **Auto-refresh** of unread count every 30 seconds
- **Color-coded notification types**:
  - Low stock: Orange (📦)
  - Expiring lot: Red (⏰)
  - Refill due: Green (💊)
  - Claim rejected: Red (❌)

### Example Implementation

The component automatically:
1. Fetches unread count on mount
2. Polls for updates every 30 seconds
3. Opens dropdown on click
4. Shows loading state while fetching
5. Displays empty state when no notifications
6. Closes dropdown when clicking outside

## Future Enhancements

1. **Batch expiring check** - Monitor batch compounding expiration dates
2. **Notification preferences** - Allow users to configure which notifications they receive
3. **Notification templates** - Create reusable notification templates
4. **Email notifications** - Send important notifications via email
5. **Real-time updates** - Use WebSockets for instant notification delivery
6. **Notification history** - Archive old notifications for audit trail
7. **Notification actions** - Add action buttons to notifications (e.g., "Review Claim", "Reorder Item")
8. **Smart grouping** - Automatically group similar notifications (e.g., multiple low stock alerts)

## Testing

To test the system:

1. **Create a notification manually:**
   ```typescript
   import { createNotification } from "@/lib/notifications";

   await createNotification(
     "user-id",
     "low_stock",
     "Test Notification",
     "This is a test",
     { testData: true }
   );
   ```

2. **Run automation checks:**
   ```bash
   curl -X POST http://localhost:3000/api/automation/run \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{"checks": ["low_stock"]}'
   ```

3. **Fetch notifications:**
   ```bash
   curl http://localhost:3000/api/notifications \
     -H "Authorization: Bearer YOUR_JWT"
   ```

## Database Schema

The notifications table includes:
- **UUID primary key** for distributed system compatibility
- **Foreign key to users** with cascade delete
- **Composite indexes** for efficient querying by user and read status
- **JSONB metadata** for flexible notification payload storage
- **Timestamptz** for timezone-aware timestamps

This ensures reliable, performant, and scalable notification storage.
