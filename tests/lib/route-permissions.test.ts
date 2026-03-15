import { describe, it, expect } from 'vitest';
import {
  getRoutePermission,
  ROUTE_PERMISSIONS,
  type RoutePermission,
} from '@/lib/route-permissions';

describe('route-permissions', () => {
  describe('ROUTE_PERMISSIONS map', () => {
    it('includes all main section routes', () => {
      expect(ROUTE_PERMISSIONS['/dashboard']).toEqual({
        resource: 'all',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/patients']).toEqual({
        resource: 'patients',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/prescriptions']).toEqual({
        resource: 'prescriptions',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/compounding']).toEqual({
        resource: 'compounding',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/inventory']).toEqual({
        resource: 'inventory',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/billing']).toEqual({
        resource: 'billing',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/insurance']).toEqual({
        resource: 'insurance',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/shipping']).toEqual({
        resource: 'shipping',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/pos']).toEqual({
        resource: 'pos',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/reports']).toEqual({
        resource: 'reports',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/settings']).toEqual({
        resource: 'settings',
        action: 'read',
      });
      expect(ROUTE_PERMISSIONS['/users']).toEqual({
        resource: 'users',
        action: 'read',
      });
    });

    it('includes write routes for patients', () => {
      expect(ROUTE_PERMISSIONS['/patients/new']).toEqual({
        resource: 'patients',
        action: 'write',
      });
      expect(ROUTE_PERMISSIONS['/patients/[id]/edit']).toEqual({
        resource: 'patients',
        action: 'write',
      });
    });

    it('includes write routes for prescriptions', () => {
      expect(ROUTE_PERMISSIONS['/prescriptions/new']).toEqual({
        resource: 'prescriptions',
        action: 'write',
      });
      expect(ROUTE_PERMISSIONS['/prescriptions/[id]']).toEqual({
        resource: 'prescriptions',
        action: 'write',
      });
      expect(ROUTE_PERMISSIONS['/prescriptions/prescribers/new']).toEqual({
        resource: 'prescriptions',
        action: 'write',
      });
    });

    it('includes write routes for compounding', () => {
      expect(ROUTE_PERMISSIONS['/compounding/batches/new']).toEqual({
        resource: 'compounding',
        action: 'write',
      });
      expect(ROUTE_PERMISSIONS['/compounding/batches/[id]']).toEqual({
        resource: 'compounding',
        action: 'write',
      });
      expect(ROUTE_PERMISSIONS['/compounding/formulas/new']).toEqual({
        resource: 'compounding',
        action: 'write',
      });
      expect(ROUTE_PERMISSIONS['/compounding/formulas/[id]']).toEqual({
        resource: 'compounding',
        action: 'write',
      });
    });

    it('includes write routes for inventory', () => {
      expect(ROUTE_PERMISSIONS['/inventory/new']).toEqual({
        resource: 'inventory',
        action: 'write',
      });
      expect(ROUTE_PERMISSIONS['/inventory/[id]']).toEqual({
        resource: 'inventory',
        action: 'write',
      });
    });

    it('includes write routes for insurance', () => {
      expect(ROUTE_PERMISSIONS['/insurance/plans/new']).toEqual({
        resource: 'insurance',
        action: 'write',
      });
    });

    it('includes write routes for shipping', () => {
      expect(ROUTE_PERMISSIONS['/shipping/new']).toEqual({
        resource: 'shipping',
        action: 'write',
      });
      expect(ROUTE_PERMISSIONS['/shipping/[id]']).toEqual({
        resource: 'shipping',
        action: 'write',
      });
    });

    it('includes write routes for users', () => {
      expect(ROUTE_PERMISSIONS['/users/new']).toEqual({
        resource: 'users',
        action: 'write',
      });
      expect(ROUTE_PERMISSIONS['/users/[id]']).toEqual({
        resource: 'users',
        action: 'write',
      });
    });
  });

  describe('getRoutePermission', () => {
    it('returns permission for exact match', () => {
      const perm = getRoutePermission('/patients');
      expect(perm).toEqual({ resource: 'patients', action: 'read' });
    });

    it('returns permission for nested exact match', () => {
      const perm = getRoutePermission('/patients/new');
      expect(perm).toEqual({ resource: 'patients', action: 'write' });
    });

    it('resolves [id] route pattern for patients edit', () => {
      const perm = getRoutePermission('/patients/abc-123-def-456/edit');
      expect(perm).toEqual({ resource: 'patients', action: 'write' });
    });

    it('does not match /patients/[id] without edit suffix', () => {
      const perm = getRoutePermission('/patients/abc-123');
      expect(perm).toBeNull();
    });

    it('resolves [id] route pattern for prescriptions', () => {
      const perm = getRoutePermission('/prescriptions/rx-789');
      expect(perm).toEqual({ resource: 'prescriptions', action: 'write' });
    });

    it('resolves [id] route pattern for inventory', () => {
      const perm = getRoutePermission('/inventory/item-456');
      expect(perm).toEqual({ resource: 'inventory', action: 'write' });
    });

    it('resolves [id] route pattern for compounding batches', () => {
      const perm = getRoutePermission('/compounding/batches/batch-123');
      expect(perm).toEqual({ resource: 'compounding', action: 'write' });
    });

    it('resolves [id] route pattern for compounding formulas', () => {
      const perm = getRoutePermission('/compounding/formulas/formula-456');
      expect(perm).toEqual({ resource: 'compounding', action: 'write' });
    });

    it('resolves [id] route pattern for shipping', () => {
      const perm = getRoutePermission('/shipping/ship-789');
      expect(perm).toEqual({ resource: 'shipping', action: 'write' });
    });

    it('resolves [id] route pattern for users', () => {
      const perm = getRoutePermission('/users/user-123');
      expect(perm).toEqual({ resource: 'users', action: 'write' });
    });

    it('returns null for unknown route', () => {
      const perm = getRoutePermission('/unknown-route');
      expect(perm).toBeNull();
    });

    it('returns null for route that is too deep', () => {
      const perm = getRoutePermission('/patients/123/edit/something-else');
      expect(perm).toBeNull();
    });

    it('does not match [id] pattern with empty id', () => {
      // Should not match /patients//edit
      const perm = getRoutePermission('/patients//edit');
      expect(perm).toBeNull();
    });

    it('handles UUID-format ids correctly', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const perm = getRoutePermission(`/patients/${uuid}/edit`);
      expect(perm).toEqual({ resource: 'patients', action: 'write' });
    });

    it('handles numeric ids correctly', () => {
      const perm = getRoutePermission('/patients/12345/edit');
      expect(perm).toEqual({ resource: 'patients', action: 'write' });
    });

    it('handles slugs as ids correctly', () => {
      const perm = getRoutePermission('/patients/john-doe-123/edit');
      expect(perm).toEqual({ resource: 'patients', action: 'write' });
    });

    it('prioritizes exact matches over patterns', () => {
      // /patients/new is an exact match and should take priority
      const exactMatch = getRoutePermission('/patients/new');
      expect(exactMatch).toEqual({ resource: 'patients', action: 'write' });
    });

    it('handles case-sensitive route matching', () => {
      // Routes should be case-sensitive
      const perm = getRoutePermission('/Patients');
      expect(perm).toBeNull();
    });

    it('handles trailing slashes', () => {
      const perm = getRoutePermission('/patients/');
      expect(perm).toBeNull();
    });

    it('handles multiple [id] placeholders in nested routes', () => {
      // Should match /compounding/batches/[id]
      const perm = getRoutePermission('/compounding/batches/batch-123');
      expect(perm).toEqual({ resource: 'compounding', action: 'write' });
    });
  });

  describe('route pattern matching edge cases', () => {
    it('distinguishes between similar routes', () => {
      const patientsPerm = getRoutePermission('/patients/123/edit');
      const prescriptionsPerm = getRoutePermission('/prescriptions/123');

      expect(patientsPerm?.resource).toBe('patients');
      expect(prescriptionsPerm?.resource).toBe('prescriptions');
    });

    it('matches nested [id] routes correctly', () => {
      const batchPerm = getRoutePermission('/compounding/batches/batch-001');
      const formulaPerm = getRoutePermission('/compounding/formulas/formula-001');

      expect(batchPerm?.resource).toBe('compounding');
      expect(formulaPerm?.resource).toBe('compounding');
      expect(batchPerm?.action).toBe('write');
      expect(formulaPerm?.action).toBe('write');
    });

    it('does not confuse static routes with dynamic routes', () => {
      const newPerm = getRoutePermission('/patients/new');
      const dynamicPerm = getRoutePermission('/patients/abc123/edit');

      // Both should match but exactly
      expect(newPerm).toEqual({ resource: 'patients', action: 'write' });
      expect(dynamicPerm).toEqual({ resource: 'patients', action: 'write' });
    });
  });
});
