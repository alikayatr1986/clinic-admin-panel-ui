import { useEffect, useState } from 'react';
import type { TimeframeFormDialogProps } from '../types/settings.types';

export function TimeframeFormDialog({
  isOpen,
  timeframe,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: TimeframeFormDialogProps) {
  const isEditing = timeframe !== null;
  const isReferenced = isEditing && timeframe.referenced_cases_count > 0;

  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [minMonths, setMinMonths] = useState(0);
  const [isOpenEnded, setIsOpenEnded] = useState(false);
  const [maxMonths, setMaxMonths] = useState<number | null>(3);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (timeframe) {
      setCode(timeframe.code);
      setNameEn(timeframe.name_en);
      setNameAr(timeframe.name_ar);
      setMinMonths(timeframe.min_months);
      setIsOpenEnded(timeframe.max_months === null);
      setMaxMonths(timeframe.max_months);
      setDisplayOrder(timeframe.display_order);
    } else {
      setCode('');
      setNameEn('');
      setNameAr('');
      setMinMonths(0);
      setIsOpenEnded(false);
      setMaxMonths(3);
      setDisplayOrder(1);
    }
    setLocalError(null);
  }, [timeframe, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedEn = nameEn.trim();
    const trimmedAr = nameAr.trim();
    if (!trimmedEn) {
      setLocalError('English label is required.');
      return;
    }
    if (!trimmedAr) {
      setLocalError('Arabic label is required.');
      return;
    }

    if (!isEditing) {
      const trimmedCode = code.trim();
      if (!trimmedCode || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(trimmedCode)) {
        setLocalError('Code must be lowercase alphanumeric with hyphens (e.g., 0-3-months).');
        return;
      }
    }

    if (minMonths < 0) {
      setLocalError('Minimum months must be 0 or greater.');
      return;
    }

    if (!isOpenEnded && (maxMonths === null || Number.isNaN(maxMonths))) {
      setLocalError('Maximum months is required when not open-ended.');
      return;
    }

    const resolvedMax = isOpenEnded ? null : maxMonths;
    if (resolvedMax !== null && resolvedMax <= minMonths) {
      setLocalError('Maximum months must be strictly greater than minimum months.');
      return;
    }

    onSubmit({
      code: isEditing ? undefined : code.trim(),
      name_en: trimmedEn,
      name_ar: trimmedAr,
      min_months: minMonths,
      max_months: resolvedMax,
      display_order: displayOrder,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeframe-dialog-title"
    >
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200">
        <h2 id="timeframe-dialog-title" className="text-lg font-semibold text-slate-900 mb-4">
          {isEditing ? 'Edit Timeframe Option' : 'Create Timeframe Option'}
        </h2>

        {(error || localError) && (
          <div role="alert" className="mb-4 rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {localError || error}
          </div>
        )}

        {isReferenced && (
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            Range boundaries are locked because this timeframe is referenced by {timeframe.referenced_cases_count} gallery case(s). To modify the range, retire this option and create a replacement.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tf-code" className="block text-xs font-medium text-slate-700 uppercase tracking-wider">
              Code (slug identifier)
            </label>
            <input
              id="tf-code"
              type="text"
              disabled={isEditing || isSubmitting}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 18-24-months"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-crimson focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tf-name-en" className="block text-xs font-medium text-slate-700 uppercase tracking-wider">
                English Label
              </label>
              <input
                id="tf-name-en"
                type="text"
                disabled={isSubmitting}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. 18–24 Months"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-crimson focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="tf-name-ar" className="block text-xs font-medium text-slate-700 uppercase tracking-wider">
                Arabic Label
              </label>
              <input
                id="tf-name-ar"
                type="text"
                dir="rtl"
                disabled={isSubmitting}
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="e.g. ١٨-٢٤ شهراً"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 font-arabic focus:border-crimson focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Clinical Interval [min, max) Months
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tf-min" className="block text-xs text-slate-600">
                  Min Months (≥ 0)
                </label>
                <input
                  id="tf-min"
                  type="number"
                  min="0"
                  disabled={isReferenced || isSubmitting}
                  value={minMonths}
                  onChange={(e) => setMinMonths(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono text-slate-900 focus:border-crimson focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label htmlFor="tf-max" className="block text-xs text-slate-600">
                  Max Months (&gt; min)
                </label>
                <input
                  id="tf-max"
                  type="number"
                  min={minMonths + 1}
                  disabled={isReferenced || isOpenEnded || isSubmitting}
                  value={isOpenEnded ? '' : (maxMonths ?? '')}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setMaxMonths(Number.isNaN(parsed) ? null : parsed);
                  }}
                  placeholder={isOpenEnded ? '∞ (open-ended)' : 'e.g. 24'}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono text-slate-900 focus:border-crimson focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                id="tf-open-ended"
                type="checkbox"
                disabled={isReferenced || isSubmitting}
                checked={isOpenEnded}
                onChange={(e) => {
                  setIsOpenEnded(e.target.checked);
                  if (e.target.checked) setMaxMonths(null);
                  else setMaxMonths(minMonths + 3);
                }}
                className="h-4 w-4 rounded border-slate-300 text-crimson focus:ring-crimson disabled:opacity-50"
              />
              <label htmlFor="tf-open-ended" className="text-xs text-slate-700">
                Open-ended upper boundary (e.g. &ldquo;12+ months&rdquo; $[min, \infty)$)
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="tf-order" className="block text-xs font-medium text-slate-700 uppercase tracking-wider">
              Display Sort Order
            </label>
            <input
              id="tf-order"
              type="number"
              disabled={isSubmitting}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
              className="mt-1 w-24 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono text-slate-900 focus:border-crimson focus:outline-none"
            />
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
              disabled={isSubmitting}
              className="rounded-md bg-crimson px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : isEditing ? 'Update Timeframe' : 'Create Draft Timeframe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

