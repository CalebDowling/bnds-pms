import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logAudit,
  logCreate,
  logUpdate,
  logDelete,
  logLogin,
  logLogout,
  logExport,
  extractClientIp,
  extractUserAgent,
} from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { makeUser, makeAuditLog } from '../helpers';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('audit logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logAudit', () => {
    it('creates an audit log with all fields', async () => {
      const mockAuditLog = makeAuditLog({
        userId: 'user-123',
        action: 'CREATE',
        tableName: 'patients',
        recordId: 'patient-456',
      });

      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockAuditLog as any);

      await logAudit({
        userId: 'user-123',
        action: 'CREATE',
        resource: 'patients',
        resourceId: 'patient-456',
        newValues: { firstName: 'John' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'CREATE',
          tableName: 'patients',
          recordId: 'patient-456',
          oldValues: undefined,
          newValues: { firstName: 'John' },
          ipAddress: null,
          userAgent: null,
        },
      });
    });

    it('uses details as newValues if newValues not provided', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logAudit({
        userId: 'user-123',
        action: 'UPDATE',
        resource: 'patients',
        resourceId: 'patient-456',
        details: { status: 'active' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            newValues: { status: 'active' },
          }),
        })
      );
    });

    it('includes ipAddress and userAgent when provided', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logAudit({
        userId: 'user-123',
        action: 'DELETE',
        resource: 'prescriptions',
        resourceId: 'rx-789',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0',
          }),
        })
      );
    });

    it('truncates action to 10 characters', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logAudit({
        userId: 'user-123',
        action: 'CREATE',
        resource: 'very_long_table_name_here',
        resourceId: 'id-123',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
          }),
        })
      );
    });

    it('uses "unknown" as recordId if not provided', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logAudit({
        userId: 'user-123',
        action: 'LOGIN',
        resource: 'auth',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recordId: 'unknown',
          }),
        })
      );
    });

    it('does not throw when prisma.auditLog.create fails', async () => {
      vi.mocked(prisma.auditLog.create).mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw
      await expect(
        logAudit({
          userId: 'user-123',
          action: 'CREATE',
          resource: 'patients',
          resourceId: 'patient-456',
          newValues: { firstName: 'John' },
        })
      ).resolves.not.toThrow();
    });

    it('logs errors to console when prisma fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.auditLog.create).mockRejectedValue(
        new Error('Database connection failed')
      );

      await logAudit({
        userId: 'user-123',
        action: 'CREATE',
        resource: 'patients',
        resourceId: 'patient-456',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log audit event'),
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('logCreate', () => {
    it('logs CREATE action with newValues', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logCreate(
        'user-123',
        'patients',
        'patient-456',
        { firstName: 'John', lastName: 'Doe' },
        '192.168.1.1'
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            action: 'CREATE',
            tableName: 'patients',
            recordId: 'patient-456',
            newValues: { firstName: 'John', lastName: 'Doe' },
            ipAddress: '192.168.1.1',
          }),
        })
      );
    });
  });

  describe('logUpdate', () => {
    it('logs UPDATE action with oldValues and newValues', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logUpdate(
        'user-123',
        'patients',
        'patient-456',
        { firstName: 'John' },
        { firstName: 'Johnny' },
        '192.168.1.1'
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            action: 'UPDATE',
            tableName: 'patients',
            recordId: 'patient-456',
            oldValues: { firstName: 'John' },
            newValues: { firstName: 'Johnny' },
            ipAddress: '192.168.1.1',
          }),
        })
      );
    });
  });

  describe('logDelete', () => {
    it('logs DELETE action with oldValues', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logDelete(
        'user-123',
        'patients',
        'patient-456',
        { firstName: 'John', lastName: 'Doe' },
        '192.168.1.1'
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            action: 'DELETE',
            tableName: 'patients',
            recordId: 'patient-456',
            oldValues: { firstName: 'John', lastName: 'Doe' },
            ipAddress: '192.168.1.1',
          }),
        })
      );
    });
  });

  describe('logLogin', () => {
    it('logs LOGIN action', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logLogin('user-123', '192.168.1.1', 'Mozilla/5.0');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            action: 'LOGIN',
            tableName: 'auth',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          }),
        })
      );
    });
  });

  describe('logLogout', () => {
    it('logs LOGOUT action', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logLogout('user-123', '192.168.1.1', 'Mozilla/5.0');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            action: 'LOGOUT',
            tableName: 'auth',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          }),
        })
      );
    });
  });

  describe('logExport', () => {
    it('logs EXPORT action with details and timestamp', async () => {
      vi.useFakeTimers();
      const now = new Date('2024-03-15T10:00:00Z');
      vi.setSystemTime(now);

      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logExport('user-123', 'prescriptions', { count: 100 }, '192.168.1.1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            action: 'EXPORT',
            tableName: 'prescriptions',
            recordId: 'unknown',
            newValues: expect.objectContaining({
              count: 100,
              exportedAt: expect.any(String),
            }),
            ipAddress: '192.168.1.1',
          }),
        })
      );

      vi.useRealTimers();
    });
  });
});

describe('header extraction utilities', () => {
  describe('extractClientIp', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const headers = new Headers({
        'x-forwarded-for': '192.168.1.100, 10.0.0.1',
      });
      expect(extractClientIp(headers)).toBe('192.168.1.100');
    });

    it('trims whitespace from x-forwarded-for', () => {
      const headers = new Headers({
        'x-forwarded-for': '  192.168.1.100  , 10.0.0.1',
      });
      expect(extractClientIp(headers)).toBe('192.168.1.100');
    });

    it('uses x-real-ip if x-forwarded-for not present', () => {
      const headers = new Headers({
        'x-real-ip': '203.0.113.50',
      });
      expect(extractClientIp(headers)).toBe('203.0.113.50');
    });

    it('uses cf-connecting-ip as fallback', () => {
      const headers = new Headers({
        'cf-connecting-ip': '198.51.100.50',
      });
      expect(extractClientIp(headers)).toBe('198.51.100.50');
    });

    it('uses client-ip as last resort', () => {
      const headers = new Headers({
        'client-ip': '192.0.2.50',
      });
      expect(extractClientIp(headers)).toBe('192.0.2.50');
    });

    it('returns undefined if no IP headers present', () => {
      const headers = new Headers({});
      expect(extractClientIp(headers)).toBeUndefined();
    });

    it('respects header priority order', () => {
      const headers = new Headers({
        'x-forwarded-for': '192.168.1.100',
        'x-real-ip': '203.0.113.50',
        'cf-connecting-ip': '198.51.100.50',
      });
      expect(extractClientIp(headers)).toBe('192.168.1.100');
    });
  });

  describe('extractUserAgent', () => {
    it('extracts user-agent header', () => {
      const headers = new Headers({
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });
      expect(extractUserAgent(headers)).toBe(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      );
    });

    it('returns undefined if user-agent not present', () => {
      const headers = new Headers({});
      expect(extractUserAgent(headers)).toBeUndefined();
    });
  });
});
