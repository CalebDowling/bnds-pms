# Notifications & Automation System - Setup Instructions

## What Was Implemented

A complete notifications and automation system for the BNDS PMS pharmacy management system, including:

1. **Notification Database Table** - Store user notifications with metadata
2. **Notification API** - REST endpoints for managing notifications
3. **Automation Engine** - Automated checks for pharmacy events
4. **UI Component** - Notification bell with dropdown in dashboard header
5. **Type-Safe Utilities** - TypeScript functions for creating and managing notifications

## Files Created

```
src/
├── lib/
│   ├── notifications.ts          # Notification utilities (9 functions)
│   └── automation.ts             # Automation checks (4 checks + runner)
└── app/
    └── api/
        ├── notifications/
        │   ├── route.ts          # GET/PATCH notifications
        │   └── unread-count/route.ts  # GET unread count
        └── automation/
            └── run/route.ts      # POST run automation checks

components/
└── dashboard/
    └── DashboardHeader.tsx       # Updated with notification bell

prisma/
├── schema.prisma                 # Updated with Notification model
└── migrations/
    └── 20260315_notifications.sql # Database migration

docs/
├── NOTIFICATIONS_AUTOMATION_GUIDE.md  # Comprehensive guide
└── SETUP_INSTRUCTIONS.md         # This file
```

## Database Setup

The database has been automatically synced using `prisma db push`. The `notifications` table was created with:

- UUID primary key with cascade delete
- Foreign key to users table
- JSONB metadata column
- Composite indexes for performance
- Timezone-aware timestamps

No manual database setup is required.

## API Endpoints

All endpoints are authenticated. Available endpoints:

### GET /api/notifications
Fetch paginated notifications for current user.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `unreadOnly` (default: false)

**Example:**
```bash
curl http://localhost:3000/api/notifications?page=1&limit=10&unreadOnly=true \
  -H "Authorization: Bearer YOUR_JWT"
```

### PATCH /api/notifications
Mark notifications as read.

**Request Body:**
```json
{
  "notificationIds": ["uuid1", "uuid2"],
  "markAll": false
}
```

Or to mark all as read:
```json
{
  "markAll": true
}
```

### GET /api/notifications/unread-count
Get unread notification count for current user.

**Response:**
```json
{
  "unreadCount": 5
}
```

### POST /api/automation/run
Run automation checks (admin only).

**Request Body:**
```json
{
  "checks": ["low_stock", "expiring_lots", "refills_due", "rejected_claims"]
}
```

Omit checks array to run all checks.

## Notification Types

The system supports five notification types:

1. **low_stock** - Item falls below reorder point
2. **expiring_lot** - Lot expires within 30 days
3. **refill_due** - Patient refill approaching
4. **claim_rejected** - Insurance claim rejected
5. **batch_expiring** - Reserved for future use

## Using the Notification System

### In Code

```typescript
// Create a notification
import { createNotification } from "@/lib/notifications";

await createNotification(
  userId,
  "low_stock",
  "Stock Alert: Amoxicillin 500mg",
  "Current stock is below reorder point",
  { itemId: "...", itemName: "Amoxicillin 500mg" }
);

// Get unread count
import { getUnreadCount } from "@/lib/notifications";
const count = await getUnreadCount(userId);

// Fetch notifications
import { getNotifications } from "@/lib/notifications";
const { notifications, pagination } = await getNotifications(userId, {
  page: 1,
  limit: 20,
  unreadOnly: true
});

// Mark as read
import { markAsRead, markAllAsRead } from "@/lib/notifications";
await markAsRead(notificationId);
await markAllAsRead(userId);
```

### Run Automation Checks

```typescript
import { runAutomationChecks } from "@/lib/automation";

// Run all checks
const results = await runAutomationChecks();

// Run specific checks
const results = await runAutomationChecks([
  "low_stock",
  "expiring_lots"
]);
```

Or via the API:

```bash
curl -X POST http://localhost:3000/api/automation/run \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"checks": ["low_stock", "expiring_lots"]}'
```

## UI Component

The `DashboardHeader` component now includes:

- **Notification Bell Icon** - Shows unread count badge
- **Dropdown Menu** - Shows 10 recent unread notifications
- **Auto-Refresh** - Updates unread count every 30 seconds
- **Color-Coded Notifications** - Different colors for each type
- **Mark as Read** - Click notification to mark as read
- **View All Link** - Link to full notifications page

## Scheduling Automation Checks

The automation checks can be scheduled using:

### Option 1: External Cron Job
Set up a cron job that calls the automation API:

```bash
# Run every 6 hours
0 */6 * * * curl -X POST http://your-app.com/api/automation/run \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Option 2: Vercel Cron Functions
If deployed on Vercel, create a cron function (see NOTIFICATIONS_AUTOMATION_GUIDE.md)

### Option 3: Task Queue
Use a task queue like Bull, BullMQ, or Trigger.dev

## Recommended Schedule

- **Low Stock Checks**: Every 6 hours
- **Expiring Lots**: Daily at 8:00 AM
- **Refills Due**: Daily at 9:00 AM
- **Rejected Claims**: Every 4 hours

## Testing

### Test Notification Creation
```typescript
import { createNotification } from "@/lib/notifications";

// This will create a test notification
await createNotification(
  "YOUR_USER_ID",
  "low_stock",
  "Test Notification",
  "This is a test notification",
  { test: true }
);
```

### Test API Endpoints
```bash
# Get unread count
curl http://localhost:3000/api/notifications/unread-count

# Get notifications
curl http://localhost:3000/api/notifications

# Mark as read
curl -X PATCH http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{"markAll": true}'

# Run automation checks
curl -X POST http://localhost:3000/api/automation/run
```

## Error Handling

The system is designed with non-blocking error handling:

- **Notification creation failures** don't stop automation checks
- **Individual automation check failures** are captured and returned
- **API errors** return appropriate HTTP status codes

Errors are logged to the console and returned in API responses.

## Security

- All endpoints require authentication (Supabase JWT)
- Automation endpoint requires admin permission
- Notifications are automatically cleaned up when users are deleted
- No sensitive data is stored in notification metadata
- All database queries use parameterized statements

## Performance

- Composite indexes on `(userId, isRead)` for fast queries
- Pagination support to handle large notification lists
- Auto-cleanup of old notifications
- 30-second poll interval for UI updates

## Troubleshooting

### "Notification model not found" errors
Run `npm run db:generate` to regenerate the Prisma client.

### API returns 401 Unauthorized
Ensure you're passing a valid JWT token in the Authorization header.

### API returns 403 Forbidden
The automation endpoint requires admin role. Check user permissions.

### Notifications not appearing
Verify the user exists and has the correct ID. Check logs for errors.

## Next Steps

1. **Schedule automation checks** using your preferred scheduling method
2. **Customize notification templates** if needed
3. **Add email notifications** (future enhancement)
4. **Configure notification preferences** for users (future enhancement)
5. **Monitor notification creation** to tune thresholds

## Support

For detailed information, see `NOTIFICATIONS_AUTOMATION_GUIDE.md`.

For API reference, see endpoint documentation in route files.

## Version

- **Created**: 2026-03-15
- **System**: BNDS PMS Pharmacy Management System
- **Database**: PostgreSQL + Supabase
- **Framework**: Next.js + Prisma + TypeScript
