import type { GalleryContentStateCardsProps } from '../../types/gallery.content.types';
import { Button } from '@/components/ui/button';

export function GalleryContentStateCards({
  loading,
  error,
  onRetry,
}: GalleryContentStateCardsProps) {
  if (loading) {
    return <p role="status">Loading content…</p>;
  }
  if (error) {
    return (
      <div role="alert">
        <p>
          {error instanceof Error ? error.message : 'Content could not be loaded.'}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="mt-3"
        >
          Retry
        </Button>
      </div>
    );
  }
  return null;
}

