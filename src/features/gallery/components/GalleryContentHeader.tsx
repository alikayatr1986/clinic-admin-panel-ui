import type { GalleryContentHeaderProps } from '../types/gallery.content.types';
import { Button } from '@/components/ui/button';

export function GalleryContentHeader({ onBack }: GalleryContentHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">Gallery section content</h2>
        <p className="mt-1 text-sm text-slate-600">
          Edit the landing gallery copy as a draft.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={onBack}>
        Back to gallery
      </Button>
    </div>
  );
}

