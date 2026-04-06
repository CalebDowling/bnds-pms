'use client';

import { useState, useTransition } from 'react';
import { recordVaccination, type RecordVaccinationInput } from './actions';

// ---------------------------------------------------------------------------
// Option constants
// ---------------------------------------------------------------------------

const VACCINES = [
  { name: 'Influenza (Flu)', cvx: '141', manufacturer: 'Sanofi Pasteur' },
  { name: 'COVID-19 (Pfizer)', cvx: '213', manufacturer: 'Pfizer-BioNTech' },
  { name: 'COVID-19 (Moderna)', cvx: '213', manufacturer: 'Moderna' },
  { name: 'Shingrix (Zoster)', cvx: '187', manufacturer: 'GlaxoSmithKline' },
  { name: 'Tdap (Boostrix)', cvx: '115', manufacturer: 'GlaxoSmithKline' },
  { name: 'Pneumococcal (PCV20 Prevnar)', cvx: '216', manufacturer: 'Pfizer' },
  { name: 'Pneumococcal (PPSV23 Pneumovax)', cvx: '033', manufacturer: 'Merck' },
  { name: 'Hepatitis A (Havrix)', cvx: '083', manufacturer: 'GlaxoSmithKline' },
  { name: 'Hepatitis B (Engerix-B)', cvx: '045', manufacturer: 'GlaxoSmithKline' },
  { name: 'Hepatitis A+B (Twinrix)', cvx: '104', manufacturer: 'GlaxoSmithKline' },
  { name: 'MMR (M-M-R II)', cvx: '003', manufacturer: 'Merck' },
  { name: 'Varicella (Varivax)', cvx: '021', manufacturer: 'Merck' },
  { name: 'HPV (Gardasil 9)', cvx: '165', manufacturer: 'Merck' },
  { name: 'Meningococcal (Menactra)', cvx: '114', manufacturer: 'Sanofi Pasteur' },
  { name: 'RSV (Abrysvo)', cvx: '310', manufacturer: 'Pfizer' },
] as const;

const SITES = [
  'Left Deltoid',
  'Right Deltoid',
  'Left Thigh',
  'Right Thigh',
] as const;

const ROUTES = [
  { value: 'IM', label: 'Intramuscular (IM)' },
  { value: 'SC', label: 'Subcutaneous (SC)' },
  { value: 'ID', label: 'Intradermal (ID)' },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdministerFormProps {
  patientId: string;
  patientName: string;
  dateOfBirth: string;
  pharmacistName: string;
  onClose: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdministerForm({
  patientId,
  patientName,
  dateOfBirth,
  pharmacistName,
  onClose,
  onSuccess,
}: AdministerFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registryNote, setRegistryNote] = useState<string | null>(null);

  // Form state
  const [selectedVaccine, setSelectedVaccine] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [site, setSite] = useState<string>('Left Deltoid');
  const [route, setRoute] = useState<string>('IM');
  const [visDate, setVisDate] = useState(new Date().toISOString().split('T')[0]);
  const [consent, setConsent] = useState(false);
  const [nextDoseDate, setNextDoseDate] = useState('');
  const [dose, setDose] = useState('1');
  const [series, setSeries] = useState('1');

  const vaccineEntry = VACCINES.find((v) => v.name === selectedVaccine);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedVaccine) {
      setError('Please select a vaccine.');
      return;
    }
    if (!lotNumber.trim()) {
      setError('Lot number is required.');
      return;
    }
    if (!expirationDate) {
      setError('Expiration date is required.');
      return;
    }
    if (!consent) {
      setError('Patient consent is required before administering a vaccine.');
      return;
    }

    const input: RecordVaccinationInput = {
      patientId,
      patientName,
      dateOfBirth,
      vaccineName: selectedVaccine,
      cvxCode: vaccineEntry?.cvx ?? '',
      lotNumber: lotNumber.trim(),
      manufacturer: vaccineEntry?.manufacturer ?? '',
      expirationDate,
      administrationSite: site as RecordVaccinationInput['administrationSite'],
      administrationRoute: route as RecordVaccinationInput['administrationRoute'],
      dose,
      series,
      visDateGiven: visDate,
      nextDoseDate: nextDoseDate || null,
    };

    startTransition(async () => {
      try {
        const result = await recordVaccination(input);
        if (result.success) {
          setSuccess(true);
          if (!result.registryResult.submitted) {
            setRegistryNote(
              result.registryResult.error ??
                'Vaccine recorded locally. Registry submission will be retried.',
            );
          }
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record vaccination.');
      }
    });
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-8 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Vaccination Recorded</h3>
            <p className="mt-1 text-sm text-gray-600">
              {selectedVaccine} administered to {patientName}
            </p>
            {registryNote && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                {registryNote}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Administer Vaccine</h2>
            <p className="text-sm text-gray-500">
              Patient: <span className="font-medium text-gray-700">{patientName}</span>
              {' '}&middot;{' '}
              DOB: <span className="font-medium text-gray-700">{dateOfBirth}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Vaccine Selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Vaccine <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedVaccine}
              onChange={(e) => setSelectedVaccine(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            >
              <option value="">Select a vaccine...</option>
              {VACCINES.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
            {vaccineEntry && (
              <p className="mt-1 text-xs text-gray-500">
                CVX: {vaccineEntry.cvx} &middot; Manufacturer: {vaccineEntry.manufacturer}
              </p>
            )}
          </div>

          {/* Lot / Expiration row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Lot Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. AB1234"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Expiration Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
          </div>

          {/* Administration Site / Route */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Administration Site <span className="text-red-500">*</span>
              </label>
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {SITES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Route <span className="text-red-500">*</span>
              </label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {ROUTES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dose / Series */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Dose Number
              </label>
              <input
                type="text"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Series
              </label>
              <input
                type="text"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder="1 of 2"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* VIS Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              VIS (Vaccine Information Statement) Date Given <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={visDate}
              onChange={(e) => setVisDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Date the Vaccine Information Statement was provided to the patient
            </p>
          </div>

          {/* Pharmacist (read-only) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Administering Pharmacist
            </label>
            <input
              type="text"
              value={pharmacistName}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600"
            />
          </div>

          {/* Next Dose Date (optional) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Next Dose Date (if series vaccine)
            </label>
            <input
              type="date"
              value={nextDoseDate}
              onChange={(e) => setNextDoseDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Consent */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-amber-800">
                <span className="font-medium">Patient Consent:</span> I confirm the patient (or
                authorized representative) has been provided the Vaccine Information Statement,
                has consented to vaccination, and has been screened for contraindications.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !consent}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Recording...
                </span>
              ) : (
                'Record Vaccination'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
