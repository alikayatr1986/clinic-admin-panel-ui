import { useDashboardOverview } from '../hooks/useDashboardOverview';
import { describeError } from '../../auth/utils/auth.utils';
import type { DashboardPageProps } from '../types/dashboard.types';

export function DashboardPage({ onExpired }: DashboardPageProps) {
  const { data, isLoading, isFetching, error, refetch } = useDashboardOverview(onExpired);

  return (
    <section
      className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-label="Gallery overview"
    >
      <h2 className="text-xl font-semibold">Gallery cases</h2>
      {isLoading ? (
        <p role="status" className="mt-3 text-slate-600">
          Loading gallery…
        </p>
      ) : error ? (
        <div className="mt-3">
          <p role="alert" className="text-red-800">
            {describeError(error)}
          </p>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => void refetch()}
            className="mt-4 rounded-md bg-crimson px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : data?.totalGalleryCases == null || data.totalGalleryCases === 0 ? (
        <p className="mt-3 text-slate-600">No gallery cases yet.</p>
      ) : (
        <p className="mt-3 text-slate-600">
          {data.totalGalleryCases} gallery{' '}
          {data.totalGalleryCases === 1 ? 'case' : 'cases'} available.
        </p>
      )}
    </section>
  );
}
