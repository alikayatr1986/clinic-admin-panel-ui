import type { GalleryEditorHeaderProps } from '../../types/gallery.case-editor.types';
import { Button } from '@/components/ui/button';

export function GalleryEditorHeader({
  item,
  isDirty,
  dirty,
  error,
  notice,
  onBack,
}: GalleryEditorHeaderProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="break-all text-sm text-slate-600">
          Case {item.id} · Revision {item.revision} · {item.published ? 'Published' : 'Unpublished'}
        </p>
        <Button type="button" variant="outline" onClick={onBack}>
          Back to gallery
        </Button>
      </div>
      {item.published && isDirty && (
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Saving clinical details or descriptions will unpublish this case and reset relevant approvals.
        </p>
      )}
      {dirty && <p role="status" className="text-sm font-medium text-amber-900">You have unsaved changes.</p>}
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
          <p>{error}</p>
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-green-900">
          {notice}
        </p>
      )}
    </>
  );
}
