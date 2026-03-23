# Role-Based Access Control (RBAC) Implementation

This document describes the RBAC implementation for the Boudreaux's Pharmacy PMS dashboard routes.

## Overview

The RBAC system provides comprehensive access control across all dashboard routes by:
1. Checking user permissions server-side before rendering pages
2. Hiding navigation links based on user roles
3. Providing a clean access denied UI when permissions are denied

## Files Created/Modified

### New Files

1. **`src/lib/route-permissions.ts`**
   - Maps each dashboard route to required permissions
   - Exports `ROUTE_PERMISSIONS` object with resource/action pairs
   - Provides `getRoutePermission()` function for route lookups

2. **`src/components/auth/PermissionGuard.tsx`**
   - Server component that wraps page content
   - Checks `canAccess(resource, action)` server-side
   - Shows access denied message if permission denied
   - Supports custom fallback UI via props

3. **`src/components/providers/PermissionsProvider.tsx`**
   - Client context provider for permission data
   - Exposes `usePermissions()` hook for client components
   - Merges permissions from all user roles
   - Handles admin wildcard ("all" resource)

4. **`src/app/(dashboard)/access-denied/page.tsx`**
   - Standalone access denied page
   - Provides link back to dashboard

### Modified Files

1. **`src/app/(dashboard)/layout.tsx`**
   - Now a server component (was client)
   - Fetches user permissions on first render
   - Merges permissions from all user roles
   - Wraps children with `PermissionsProvider`

2. **`src/components/dashboard/DashboardHeader.tsx`**
   - Added `usePermissions()` hook usage
   - Conditionally shows "Reports" and "Settings" nav links
   - Conditionally shows "New Prescription" button
   - Checks `canAccess("prescriptions", "write")`

3. **All Dashboard Pages**
   - `src/app/(dashboard)/patients/page.tsx` → patients:read
   - `src/app/(dashboard)/prescriptions/page.tsx` → prescriptions:read
   - `src/app/(dashboard)/compounding/page.tsx` → compounding:read
   - `src/app/(dashboard)/inventory/page.tsx` → inventory:read
   - `src/app/(dashboard)/billing/page.tsx` → billing:read
   - `src/app/(dashboard)/insurance/page.tsx` → insurance:read
   - `src/app/(dashboard)/shipping/page.tsx` → shipping:read
   - `src/app/(dashboard)/pos/page.tsx` → pos:read
   - `src/app/(dashboard)/reports/page.tsx` → reports:read
   - `src/app/(dashboard)/settings/page.tsx` → settings:read
   - `src/app/(dashboard)/users/page.tsx` → users:read

4. **All Sub-Pages (Create/Edit)**
   - `/patients/new` → patients:write
   - `/patients/[id]/edit` → patients:write
   - `/prescriptions/new` → prescriptions:write
   - `/prescriptions/[id]` → prescriptions:read
   - `/compounding/batches/new` → compounding:write
   - `/inventory/new` → inventory:write
   - `/shipping/new` → shipping:write
   - `/users/new` → users:write
   - And all other sub-pages

## How It Works

### Server-Side Access Control

1. **Layout Loads Permissions**
   ```
   Dashboard Layout (server)
   ├─ getCurrentUser()
   ├─ Fetch user roles from DB
   ├─ Merge all role permissions
   └─ Pass to PermissionsProvider
   ```

2. **PermissionGuard Checks Access**
   ```
   PermissionGuard (async server component)
   ├─ Call canAccess(resource, action)
   ├─ If true: render children
   └─ If false: show access denied UI
   ```

3. **Pages Are Wrapped**
   ```typescript
   // Example: /patients page
   async function PatientsPageContent() { ... }

   export default function PatientsPage() {
     return (
       <PermissionGuard resource="patients" action="read">
         <PatientsPageContent />
       </PermissionGuard>
     );
   }
   ```

### Client-Side Navigation Control

1. **PermissionsProvider Context**
   - Available to all client components under dashboard layout
   - Exports `usePermissions()` hook

2. **Conditional Navigation**
   ```typescript
   const { canAccess } = usePermissions();

   {canAccess("prescriptions", "write") && (
     <Link href="/prescriptions/new">New Prescription</Link>
   )}
   ```

## Permission Model

Permissions are stored in the `Role.permissions` JSON field:

```typescript
// Admin role (all access)
{
  "all": ["read", "write", "admin"]
}

// Pharmacist role (common pharmacy operations)
{
  "prescriptions": ["read", "write", "verify", "dispense"],
  "patients": ["read", "write"],
  "inventory": ["read", "write"],
  "compounding": ["read", "write", "verify"],
  "billing": ["read", "write"],
  "reports": ["read"],
  ...
}

// Cashier role (limited to POS)
{
  "pos": ["read", "write"],
  "patients": ["read"],
  "prescriptions": ["read"]
}
```

## Access Denied Behavior

When a user lacks required permissions:

1. **Server-Side Routes**: PermissionGuard renders inline message
2. **Standalone Page**: Shows dedicated `/access-denied` page
3. **Navigation**: Buttons/links simply don't render (no broken links)

The access denied UI includes:
- Lock icon
- "Access Denied" message
- "Contact your administrator" guidance
- "Back to Dashboard" button

## Testing

To test RBAC:

1. **Restrict User Permissions**
   - In database, modify `Role.permissions` for a test user
   - Log in as that user

2. **Verify Denial**
   - Try accessing a protected route
   - Should see access denied message
   - Navigation link should be hidden

3. **Verify Admin Access**
   - Log in as admin user
   - All routes should be accessible
   - All navigation should be visible

## Architecture Benefits

1. **Server-Side Enforcement**: No bypassing via client-side tricks
2. **Composable**: `PermissionGuard` can wrap any component
3. **Consistent**: Same permission model across all routes
4. **Performant**: Permissions loaded once at layout render
5. **User-Friendly**: Clear messaging when access denied
6. **Extensible**: New pages just need one `PermissionGuard` wrapper

## Notes

- The `canAccess()` utility already exists in `src/lib/permissions.ts`
- It queries the database for user roles and checks permissions
- Admin role wildcard ("all": ["admin"]) grants all access
- The dashboard layout is now server-side (required for permission fetching)
- Client-side permission checks use React Context (no additional DB queries)
