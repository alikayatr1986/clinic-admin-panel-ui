import { useEffect } from 'react';
import { ApiError } from '../../../lib/api';
import { useGalleryList } from '../../gallery/hooks/useGallery';
import { describeError } from '../../auth/utils/auth.utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DashboardPageProps } from '../types/dashboard.types';

export function DashboardPage({ onExpired }: DashboardPageProps) {
  const { data, isLoading, isFetching, error, refetch } = useGalleryList({ page: 1, page_size: 1 });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onExpired();
  }, [error, onExpired]);

  const totalGalleryCases = data?.total;

  return (
    <section aria-label="Gallery overview" className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle asChild className="text-xl">
            <h2>Gallery cases</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p role="status" className="text-muted-foreground">
              Loading gallery…
            </p>
          ) : error ? (
            <div>
              <p role="alert" className="text-destructive">
                {describeError(error)}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={isFetching}
                onClick={() => void refetch()}
                className="mt-4"
              >
                {isFetching ? 'Retrying…' : 'Retry'}
              </Button>
            </div>
          ) : totalGalleryCases == null || totalGalleryCases === 0 ? (
            <p className="text-muted-foreground">No gallery cases yet.</p>
          ) : (
            <p className="text-muted-foreground">
              {totalGalleryCases} gallery{' '}
              {totalGalleryCases === 1 ? 'case' : 'cases'} available.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

