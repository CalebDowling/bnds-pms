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

// Mock both auditLog.create and user.upsert. user.upsert is exercised
// by the system-actor remap path in logAudit — when the userId arg
// isn't a UUID, audit.ts lazily upserts a "System" user row to satisfy
// the AuditLog.userId FK. Real-UUID test cases never hit user.upsert,
// but we stub it anyway so the test isolation is complete.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
    },
  },
}));

// Use a real UUID for the "logged-in user" fixture. logAudit's
// resolveActor() lets a UUID pass through verbatim, so the original
// test intent (that userId propagates to auditLog.create) is
// preserved. Non-UUID strings get rerouted to the System user — see
// the dedicated "system actor remap" tests below.
const TEST_USER_UUID = '11111111-1111-1111-1111-111111111111';

describe('audit logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logAudit', () => {
    it('creates an audit log with all fields', async () => {
      const mockAuditLog = makeAuditLog({
        userId: TEST_USER_UUID,
        action: 'CREATE',
        tableName: 'patients',
        recordId: 'patient-456',
      });

      vi.mocked(prisma.auditLog.create).mockResolvedValue(mockAuditLog as any);

      await logAudit({
        userId: TEST_USER_UUID,
        action: 'CREATE',
        resource: 'patients',
        resourceId: 'patient-456',
        newValues: { firstName: 'John' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: TEST_USER_UUID,
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
        userId: TEST_USER_UUID,
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
        userId: TEST_USER_UUID,
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
        userId: TEST_USER_UUID,
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
        userId: TEST_USER_UUID,
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
          userId: TEST_USER_UUID,
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
        userId: TEST_USER_UUID,
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

  // ─── System-actor remap (regression) ────────────────────────────
  // AuditLog.userId is `@db.Uuid` with an FK to users.id. Webhook
  // and cron callers historically passed string actor names like
  // "system-keragon" — those failed UUID parse and the row was
  // dropped silently because logAudit swallows errors. The remap
  // routes any non-UUID actor to a single "System" user row
  // (lazily upserted) and stamps the original actor name onto
  // newValues._actor for downstream attribution.
  describe('system actor remap', () => {
    const SYSTEM_USER_UUID = '00000000-0000-0000-0000-000000000001';

    it('routes non-UUID actors to the System user UUID', async () => {
      vi.mocked(prisma.user.upsert).mockResolvedValue({ id: SYSTEM_USER_UUID } as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logAudit({
        userId: 'system-keragon',
        action: 'CREATE',
        resource: 'intake_queue',
        resourceId: 'intake-001',
        newValues: { source: 'fax' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: SYSTEM_USER_UUID,
            // Original actor name preserved on the row so downstream
            // queries can still tell which automated actor wrote it.
            newValues: expect.objectContaining({
              source: 'fax',
              _actor: 'system-keragon',
            }),
          }),
        })
      );
    });

    it('passes real UUID actors through without remapping', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logAudit({
        userId: TEST_USER_UUID,
        action: 'CREATE',
        resource: 'patients',
        resourceId: 'patient-001',
        newValues: { firstName: 'Jane' },
      });

      // user.upsert must NOT be called for a real UUID actor.
      expect(prisma.user.upsert).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_UUID,
            // No _actor stamp — the actor IS a real user.
            newValues: { firstName: 'Jane' },
          }),
        })
      );
    });
  });

  describe('logCreate', () => {
    it('logs CREATE action with newValues', async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue(makeAuditLog() as any);

      await logCreate(
        TEST_USER_UUID,
        'patients',
        'patient-456',
        { firstName: 'John', lastName: 'Doe' },
        '192.168.1.1'
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_UUID,
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
        TEST_USER_UUID,
        'patients',
        'patient-456',
        { firstName: 'John' },
        { firstName: 'Johnny' },
        '192.168.1.1'
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_UUID,
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
        TEST_USER_UUID,
        'patients',
        'patient-456',
        { firstName: 'John', lastName: 'Doe' },
        '192.168.1.1'
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_UUID,
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

      await logLogin(TEST_USER_UUID, '192.168.1.1', 'Mozilla/5.0');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_UUID,
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

      await logLogout(TEST_USER_UUID, '192.168.1.1', 'Mozilla/5.0');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_UUID,
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

      await logExport(TEST_USER_UUID, 'prescriptions', { count: 100 }, '192.168.1.1');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_UUID,
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
