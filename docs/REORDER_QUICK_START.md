# Inventory Reorder System - Quick Start Guide

## What It Does

Automatically monitors inventory and creates purchase orders when stock falls below set thresholds.

## Where to Access

- Dashboard: http://localhost:3000/inventory/reorder
- Sidebar: Click "Reorder" (🔄 icon)

## How to Use

### 1. Set Up Items with Reorder Points
In Inventory, edit each item and set:
- **Reorder Point**: When to trigger reordering (e.g., 100 units)
- **Reorder Quantity**: How much to order (e.g., 500 units)

### 2. View Dashboard
Visit `/inventory/reorder` to see:
- **Red stat**: Items below threshold
- **Amber stat**: Draft purchase orders waiting approval
- **Blue stat**: Orders in progress
- **Green toggle**: Auto-reorder setting

### 3. Generate Orders

#### Option A: Auto-Generate All
Click "Generate All POs" button → System creates draft POs for all below-threshold items

#### Option B: Select Specific Items
1. Check items in the table
2. Click "Add X to PO"
3. Review draft PO

### 4. Approve Orders
- Review draft PO details
- Mark as "Approved"
- System sets 7-day estimated arrival

### 5. Track Orders
- View in "Recent Orders" sidebar
- Status: draft → approved → submitted → received

## Key Stats

| Card | Meaning |
|------|---------|
| Red | Items needing immediate reorder |
| Amber | Draft orders awaiting approval |
| Blue | Orders submitted to suppliers |
| Green | Auto-reorder on/off toggle |

## Keyboard Shortcuts

- Select all items: Click checkbox in table header
- Deselect all: Click again

## API Endpoints

### Check Items Below Threshold
```bash
curl http://localhost:3000/api/inventory/reorder \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Auto-Generate Orders
```bash
curl -X POST http://localhost:3000/api/inventory/reorder \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"auto-generate"}'
```

## Common Tasks

### View Items Needing Reorder
1. Go to `/inventory/reorder`
2. Look at the red stat card
3. Scroll down to see the table

### Create a Purchase Order for Specific Items
1. Check boxes next to items
2. Click "Add X to PO"
3. Order is created in draft status
4. Review in sidebar

### Approve a Draft Order
1. Find order in "Recent Orders" sidebar
2. Click to open details
3. Click "Approve"
4. Set any notes or adjust quantities
5. Confirm

### Check Order History
- View in sidebar under "Recent Orders"
- Status shows current state
- Date shows when created

### Set Up Auto-Reorder
1. Enable toggle in green stat card
2. Adjust settings (if available)
3. System will auto-generate POs daily/on schedule

## Troubleshooting

### "No items below threshold"
- Check that items have reorder points set
- Verify current stock is actually below the reorder point
- Ensure items are marked as "Active"

### "No supplier found for item"
- Item needs at least one lot with a supplier assigned
- Add a lot to the item in Inventory module
- Set supplier when receiving the lot

### "Can't see Reorder in sidebar"
- May not have "manage inventory" permission
- Contact admin to grant access

### API returns 401 Unauthorized
- Check that your authentication token is valid
- Ensure token includes inventory management permission

## Performance Tips

- Review recent orders regularly (sidebar shows last 10)
- Set reorder points based on actual usage rates
- Use suggested quantities but adjust if needed
- Batch order approval at certain times (e.g., morning)

## Settings

Coming in future versions:
- Customize lead time buffer (days added to ETA)
- Enable/disable auto-reorder globally
- Set approval workflows
- Configure email notifications

## Support

For issues or questions:
1. Check REORDER_SYSTEM.md for detailed documentation
2. See IMPLEMENTATION_SUMMARY.md for technical details
3. Contact your system administrator

---

**Current Version:** 1.0
**Last Updated:** 2026-03-19
**Status:** Production Ready
