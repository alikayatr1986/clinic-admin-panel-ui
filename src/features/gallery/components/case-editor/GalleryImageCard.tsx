import type { GalleryImageCardProps } from '../../types/gallery.case-editor.types';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';

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
  const altText = item.captions.find((c) => c.lang === 'en')?.alt_text || 'Combined before and after clinical image';

  return (
    <Card aria-label="Combined image" className="p-6">
      <CardTitle className="text-xl">Combined before/after image</CardTitle>
      <CardDescription className="mt-2">
        Select one combined JPEG, PNG, or WebP image. The clinic server validates and prepares it without splitting the original composition.
      </CardDescription>
      <div className="mt-5">
        <ImageUpload
          id="combined-image"
          label="Combined image file"
          file={pendingFile}
          onFileChange={onFileChange}
          previewUrl={item.media_ready && !imageBroken ? item.url : null}
          previewAlt={altText}
          onImageError={pendingFile ? undefined : onImageError}
          disabled={busy !== null && busy !== 'upload'}
          isUploading={busy === 'upload'}
          progress={progress}
          onUpload={onUpload}
          uploadButtonText={busy === 'upload' ? 'Uploading…' : 'Upload image'}
          uploadButtonDisabled={!pendingFile}
        >
          {beforePosition && (
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-sm font-semibold text-white">
              <span>{beforePosition === 'left' ? 'Before' : 'After'}</span>
              <span>{beforePosition === 'right' ? 'Before' : 'After'}</span>
            </div>
          )}
        </ImageUpload>
        {imageBroken && !pendingFile && <p className="mt-2 text-sm text-slate-600">Image preview unavailable.</p>}
      </div>
    </Card>
  );
}
