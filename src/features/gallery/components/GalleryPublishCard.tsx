import type { GalleryPublishCardProps } from '../types/gallery.case-editor.types';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function GalleryPublishCard({ item, busy, dirty: _dirty, preview, onPreview, onSetPublished }: GalleryPublishCardProps) {
  return (
    <Card className="p-6">
      <CardTitle className="text-xl">Preview and publication</CardTitle>
      <CardDescription className="mt-2">
        Save all changes before previewing or changing publication. The Go server checks consent, media, language review, and current revision.
      </CardDescription>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null}
          onClick={onPreview}
        >
          {busy === 'preview' ? 'Preparing preview…' : 'Generate preview link'}
        </Button>
        <Button
          type="button"
          variant={item.published ? 'destructive' : 'default'}
          disabled={busy !== null}
          onClick={() => onSetPublished(!item.published)}
        >
          {busy === 'publish' ? 'Updating…' : item.published ? 'Unpublish case' : 'Publish case'}
        </Button>
      </div>
      {preview && (
        <p className="mt-4 rounded-md bg-slate-100 p-4">
          <Button asChild variant="link" className="p-0 h-auto font-medium">
            <a href={preview.url} target="_blank" rel="noopener noreferrer">
              Open private preview
            </a>
          </Button>
          <span className="ml-2 text-sm text-slate-600">
            Expires {new Date(preview.expires_at).toLocaleString('en')}
          </span>
        </p>
      )}
    </Card>
  );
}
