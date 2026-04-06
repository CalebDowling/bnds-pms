import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMRN } from '@/lib/utils/mrn';
import { prisma } from '@/lib/prisma';
import { makePatient } from '../helpers';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findFirst: vi.fn(),
    },
  },
}));

describe('MRN generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMRN', () => {
    it('generates first MRN as BNDS-0000001 when no patients exist', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

      const mrn = await generateMRN();

      expect(mrn).toBe('BNDS-0000001');
    });

    it('increments MRN correctly from existing patient', async () => {
      const lastPatient = makePatient({ mrn: 'BNDS-0000001' });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(lastPatient as any);

      const mrn = await generateMRN();

      expect(mrn).toBe('BNDS-0000002');
    });

    it('increments high numbers correctly', async () => {
      const lastPatient = makePatient({ mrn: 'BNDS-0001234' });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(lastPatient as any);

      const mrn = await generateMRN();

      expect(mrn).toBe('BNDS-0001235');
    });

    it('handles large sequence numbers', async () => {
      const lastPatient = makePatient({ mrn: 'BNDS-9999999' });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(lastPatient as any);

      const mrn = await generateMRN();

      expect(mrn).toBe('BNDS-10000000');
    });

    it('pads number with leading zeros', async () => {
      const lastPatient = makePatient({ mrn: 'BNDS-0000010' });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(lastPatient as any);

      const mrn = await generateMRN();

      expect(mrn).toBe('BNDS-0000011');
    });

    it('queries database with correct parameters', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

      await generateMRN();

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        orderBy: { mrn: 'desc' },
        select: { mrn: true },
      });
    });

    it('handles MRN with non-standard format gracefully', async () => {
      const lastPatient = makePatient({ mrn: 'INVALID-FORMAT' });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(lastPatient as any);

      const mrn = await generateMRN();

      // Should default to 1 if format doesn't match pattern
      expect(mrn).toBe('BNDS-0000001');
    });

    it('extracts numeric part correctly from standard format', async () => {
      const lastPatient = makePatient({ mrn: 'BNDS-0005000' });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(lastPatient as any);

      const mrn = await generateMRN();

      expect(mrn).toBe('BNDS-0005001');
    });

    it('maintains 7-digit padding for sequential numbers', async () => {
      const mrns = [];
      for (let i = 1; i <= 5; i++) {
        const patient = makePatient({
          mrn: `BNDS-${String(i - 1).padStart(7, '0')}`,
        });
        vi.mocked(prisma.patient.findFirst).mockResolvedValueOnce(patient as any);

        const mrn = await generateMRN();
        mrns.push(mrn);
      }

      // Each call starts with a different last MRN, so generates the next one
      expect(mrns).toEqual([
        'BNDS-0000001', // From MRN-0
        'BNDS-0000002', // From MRN-1
        'BNDS-0000003', // From MRN-2
        'BNDS-0000004', // From MRN-3
        'BNDS-0000005', // From MRN-4
      ]);
    });

    it('generates correct MRN after sequence of increments', async () => {
      const sequence = ['BNDS-0000001', 'BNDS-0000010', 'BNDS-0000100'];

      for (let i = 0; i < sequence.length; i++) {
        const patient = makePatient({ mrn: sequence[i] });
        vi.mocked(prisma.patient.findFirst).mockResolvedValue(patient as any);

        const mrn = await generateMRN();
        const expectedNumber = parseInt(sequence[i].match(/\d+/)![0]) + 1;
        const expected = `BNDS-${String(expectedNumber).padStart(7, '0')}`;

        expect(mrn).toBe(expected);
        vi.clearAllMocks();
      }
    });

    it('handles null mrn field gracefully', async () => {
      const lastPatient = makePatient({ mrn: null as any });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(lastPatient as any);

      const mrn = await generateMRN();

      // Should treat as no existing MRN and start at 1
      expect(mrn).toBe('BNDS-0000001');
    });

    it('handles undefined mrn field gracefully', async () => {
      const lastPatient = makePatient();
      delete (lastPatient as any).mrn;
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(lastPatient as any);

      const mrn = await generateMRN();

      expect(mrn).toBe('BNDS-0000001');
    });

    it('correctly parses MRN with different digit lengths', async () => {
      const testCases = [
        { input: 'BNDS-1', expected: 'BNDS-0000002' },
        { input: 'BNDS-99', expected: 'BNDS-0000100' },
        { input: 'BNDS-999', expected: 'BNDS-0001000' },
        { input: 'BNDS-1000000', expected: 'BNDS-1000001' },
      ];

      for (const testCase of testCases) {
        const patient = makePatient({ mrn: testCase.input });
        vi.mocked(prisma.patient.findFirst).mockResolvedValue(patient as any);

        const mrn = await generateMRN();
        expect(mrn).toBe(testCase.expected);

        vi.clearAllMocks();
      }
    });

    it('returns a string in correct format', async () => {
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

      const mrn = await generateMRN();

      expect(typeof mrn).toBe('string');
      expect(mrn).toMatch(/^BNDS-\d{7}$/);
    });

    it('has 7 digits after BNDS- for numbers up to 9999999', async () => {
      const testCases = ['BNDS-0000001', 'BNDS-0000999', 'BNDS-9999998'];

      for (const testMrn of testCases) {
        const patient = makePatient({ mrn: testMrn });
        vi.mocked(prisma.patient.findFirst).mockResolvedValue(patient as any);

        const mrn = await generateMRN();
        const digits = mrn.split('-')[1];

        expect(digits.length).toBeGreaterThanOrEqual(7);
        expect(/^\d+$/.test(digits)).toBe(true);

        vi.clearAllMocks();
      }
    });

    it('handles overflow beyond 7 digits', async () => {
      const patient = makePatient({ mrn: 'BNDS-9999999' });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(patient as any);

      const mrn = await generateMRN();
      const digits = mrn.split('-')[1];

      // Should be 8 digits when it exceeds 9999999
      expect(digits).toBe('10000000');
    });
  });

  describe('MRN uniqueness', () => {
    it('generates different MRNs for different sequences', async () => {
      const patient1 = makePatient({ mrn: 'BNDS-0000100' });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(patient1 as any);
      const mrn1 = await generateMRN();

      vi.clearAllMocks();

      const patient2 = makePatient({ mrn: 'BNDS-0001000' });
      vi.mocked(prisma.patient.findFirst).mockResolvedValue(patient2 as any);
      const mrn2 = await generateMRN();

      expect(mrn1).not.toBe(mrn2);
    });
  });
});
