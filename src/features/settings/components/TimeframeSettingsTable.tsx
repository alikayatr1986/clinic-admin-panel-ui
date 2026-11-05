import type { TimeframeSetting, TimeframeSettingsTableProps } from '../types/settings.types';

function formatRange(min: number, max: number | null): string {
  if (max === null) {
    return `${min}+ months [${min}, ∞)`;
  }
  return `${min}–${max} months [${min}, ${max})`;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'retired':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'draft':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

export function TimeframeSettingsTable({
  timeframes,
  role,
  isLoading,
  onEdit,
  onActivate,
  onRetire,
  onDelete,
  onMoveUp,
  onMoveDown,
}: TimeframeSettingsTableProps) {
  const isAdmin = role === 'admin';
  const staffDisabledTitle = !isAdmin ? 'Staff read-only' : undefined;

  if (isLoading) {
    return (
      <div className="py-8 text-center text-slate-500" role="status">
        Loading timeframes…
      </div>
    );
  }

  if (timeframes.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        No timeframes configured yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm text-slate-700" aria-label="Timeframes list">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
          <tr>
            <th scope="col" className="px-4 py-3 text-center">Order</th>
            <th scope="col" className="px-4 py-3">Code</th>
            <th scope="col" className="px-4 py-3">English Label</th>
            <th scope="col" className="px-4 py-3">Arabic Label</th>
            <th scope="col" className="px-4 py-3">Clinical Range</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3 text-center">Cases</th>
            <th scope="col" className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {timeframes.map((tf: TimeframeSetting, index: number) => {
            const hasReferences = tf.referenced_cases_count > 0;
            const canDelete = isAdmin && !hasReferences;

            return (
              <tr key={tf.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-center font-mono">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="w-5 text-slate-500">{tf.display_order}</span>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label={`Move ${tf.code} up`}
                        disabled={!isAdmin || index === 0}
                        title={staffDisabledTitle ?? (index === 0 ? 'Already at top' : 'Move up')}
                        onClick={() => onMoveUp(index)}
                        className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${tf.code} down`}
                        disabled={!isAdmin || index === timeframes.length - 1}
                        title={staffDisabledTitle ?? (index === timeframes.length - 1 ? 'Already at bottom' : 'Move down')}
                        onClick={() => onMoveDown(index)}
                        className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 font-mono font-medium text-slate-900">
                  {tf.code}
                </td>

                <td className="px-4 py-3">{tf.name_en}</td>

                <td className="px-4 py-3 font-arabic" dir="rtl">
                  {tf.name_ar}
                </td>

                <td className="px-4 py-3 font-mono text-xs">
                  {formatRange(tf.min_months, tf.max_months)}
                </td>

                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(tf.status)}`}>
                    {tf.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded ${hasReferences ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-400'}`}>
                    {tf.referenced_cases_count}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      disabled={!isAdmin}
                      title={staffDisabledTitle}
                      onClick={() => onEdit(tf)}
                      className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>

                    {tf.status === 'draft' && (
                      <button
                        type="button"
                        disabled={!isAdmin}
                        title={staffDisabledTitle}
                        onClick={() => onActivate(tf)}
                        className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Activate
                      </button>
                    )}

                    {tf.status === 'active' && (
                      <button
                        type="button"
                        disabled={!isAdmin}
                        title={staffDisabledTitle}
                        onClick={() => onRetire(tf)}
                        className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Retire
                      </button>
                    )}

                    {tf.status !== 'active' && (
                      <button
                        type="button"
                        disabled={!canDelete}
                        title={!isAdmin ? 'Staff read-only' : hasReferences ? 'Cannot delete referenced timeframe' : 'Delete draft timeframe'}
                        onClick={() => onDelete(tf)}
                        className="rounded border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

