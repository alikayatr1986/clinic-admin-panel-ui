import { useEffect, useState } from 'react';
import type { ActivationAttestationDialogProps } from '../types/settings.types';

export function ActivationAttestationDialog({
  isOpen,
  timeframe,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ActivationAttestationDialogProps) {
  const [attestation, setAttestation] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setAttestation('');
    setLocalError(null);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !timeframe) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);
    const trimmed = attestation.trim();
    if (!trimmed) {
      setLocalError('Clinical approval attestation cannot be empty.');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-dialog-title"
    >
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200">
        <h2 id="activation-dialog-title" className="text-lg font-semibold text-slate-900 mb-2">
          Clinical Activation Approval
        </h2>

        <p className="text-xs text-slate-600 mb-4">
          Activating this timeframe makes it eligible for case publication in the production gallery. This action requires explicit verification and approval by an authorized clinic representative.
        </p>

        <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
          <div className="font-semibold text-slate-800">
            {timeframe.name_en} · <span className="font-arabic" dir="rtl">{timeframe.name_ar}</span> ({timeframe.code})
          </div>
          <div className="font-mono text-slate-600">
            Interval: [{timeframe.min_months}, {timeframe.max_months === null ? '∞' : timeframe.max_months}) months
          </div>
        </div>

        {(error || localError) && (
          <div role="alert" className="mb-4 rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="attestation-input" className="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
              Clinic Representative Approval Attestation
            </label>
            <textarea
              id="attestation-input"
              rows={3}
              disabled={isSubmitting}
              value={attestation}
              onChange={(e) => setAttestation(e.target.value)}
              placeholder="e.g. Approved by Dr. Naserzadeh on 2026-11-05 for clinical post-op tracking"
              className="w-full rounded-md border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-crimson focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              This statement is permanently recorded in the settings audit log alongside your administrator identity.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !attestation.trim()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Activating…' : 'Confirm Clinical Activation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

