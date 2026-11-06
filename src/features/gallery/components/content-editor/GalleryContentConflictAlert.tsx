import type { GalleryContentConflictAlertProps } from '../../types/gallery.content.types';
import { Button } from '@/components/ui/button';

export function GalleryContentConflictAlert({
  recovering,
  onReload,
  onReapply,
}: GalleryContentConflictAlertProps) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
    >
      <p>
        Reload discards your edits. Reapply keeps them; a later save or
        publish overwrites the current server draft.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={recovering}
          onClick={onReload}
        >
          Reload server content
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={recovering}
          onClick={onReapply}
        >
          Reapply my edits
        </Button>
      </div>
    </div>
  );
}

