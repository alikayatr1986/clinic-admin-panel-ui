import { useEffect, useRef } from 'react';
import type { GalleryImageCardProps } from '../types/gallery.case-editor.types';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function GalleryImageCard({
  item,
  pendingFile,
  busy,
  progress,
  imageBroken,
  beforePosition,
  onFileChange,
  onUpload,
  onImageError,
}: GalleryImageCardProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const altText = item.captions.find((c) => c.lang === 'en')?.alt_text || 'Combined before and after clinical image';

  useEffect(() => {
    if (!pendingFile && fileInput.current) {
      fileInput.current.value = '';
    }
  }, [pendingFile]);

  return (
    <Card aria-label="Combined image" className="p-6">
      <CardTitle className="text-xl">Combined before/after image</CardTitle>
      <CardDescription className="mt-2">
        Select one combined JPEG, PNG, or WebP image. The clinic server validates and prepares it without splitting the original composition.
      </CardDescription>
      {item.media_ready && item.url && !imageBroken ? (
        <div className="relative mt-5 overflow-hidden rounded-lg bg-slate-100">
          <img
            src={item.url}
            alt={altText}
            width={item.width || undefined}
            height={item.height || undefined}
            onError={onImageError}
            className="max-h-[36rem] w-full object-contain"
          />
          {beforePosition && (
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-sm font-semibold text-white">
              <span>{beforePosition === 'left' ? 'Before' : 'After'}</span>
              <span>{beforePosition === 'right' ? 'Before' : 'After'}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-100 p-6 text-center text-slate-600">
          {imageBroken ? 'Image preview unavailable.' : 'No image uploaded yet.'}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor="combined-image" className="block text-sm font-medium">Combined image file</Label>
          <input
            ref={fileInput}
            id="combined-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy !== null}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            className="mt-2 block max-w-full text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null || !pendingFile}
          onClick={onUpload}
        >
          {busy === 'upload' ? 'Uploading…' : pendingFile ? 'Upload image' : 'Choose an image'}
        </Button>
      </div>
      {pendingFile && <p className="mt-2 text-sm">Selected: {pendingFile.name}</p>}
      {busy === 'upload' && (
        <div className="mt-4">
          <Label htmlFor="upload-progress" className="block text-sm">Uploading image: {progress}%</Label>
          <progress id="upload-progress" max="100" value={progress} className="mt-2 w-full" />
        </div>
      )}
    </Card>
  );
}
