import { vi } from 'vitest';

export const getCurrentUser = vi.fn().mockResolvedValue({
  id: 'test-user-id',
  supabaseId: 'test-supabase-id',
  email: 'test@bndsrx.com',
  firstName: 'Test',
  lastName: 'User',
  isPharmacist: false,
  isAdmin: false,
  roles: ['technician'],
  lastLogin: new Date(),
  createdAt: new Date(),
});

export const requireUser = vi.fn().mockResolvedValue({
  id: 'test-user-id',
  supabaseId: 'test-supabase-id',
  email: 'test@bndsrx.com',
  firstName: 'Test',
  lastName: 'User',
  isPharmacist: false,
  isAdmin: false,
  roles: ['technician'],
  lastLogin: new Date(),
  createdAt: new Date(),
});
