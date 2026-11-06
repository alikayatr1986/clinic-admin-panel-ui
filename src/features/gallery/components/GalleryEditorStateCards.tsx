import type { GalleryEditorStateCardsProps } from '../types/gallery.case-editor.types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function GalleryEditorStateCards({
  loading,
  loadError,
  onRetry,
  caseID,
  item,
  busy,
  error,
  onCreateDraft,
}: GalleryEditorStateCardsProps) {
  if (loading) {
    return <p role="status" className="mt-8">Loading case editor…</p>;
  }

  if (loadError) {
    return (
      <Card className="mt-8 p-6">
        <p role="alert">{loadError}</p>
        <Button type="button" variant="outline" onClick={onRetry} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  if (caseID === 'new') {
    return (
      <Card className="mt-8 p-6">
        <p className="text-xl font-semibold">Create a draft case</p>
        <p className="mt-2 text-sm text-slate-600">
          A draft stays private until the clinic reviews and publishes it.
        </p>
        {error && <p role="alert" className="mt-4 text-red-800">{error}</p>}
        <Button
          type="button"
          variant="default"
          disabled={busy !== null}
          onClick={onCreateDraft}
          className="mt-5"
        >
          {busy === 'create' ? 'Creating…' : 'Create draft'}
        </Button>
      </Card>
    );
  }

  if (!item) {
    return <p role="alert" className="mt-8">Case data is unavailable.</p>;
  }

  return null;
}
