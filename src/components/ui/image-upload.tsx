import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Label } from './label';
import type { ImageUploadProps } from '@/types/image-upload.types';

export const ImageUpload = React.forwardRef<HTMLInputElement, ImageUploadProps>(function ImageUpload(
  {
    id = 'image-upload',
    label = 'Image',
    description = 'JPEG, PNG, or WebP supported.',
    accept = 'image/jpeg,image/png,image/webp',
    disabled = false,
    file = null,
    onFileChange,
    previewUrl = null,
    previewAlt = 'Uploaded image preview',
    isUploading = false,
    progress = 0,
    onUpload,
    uploadButtonText,
    uploadButtonDisabled,
    error = null,
    onImageError,
    className,
    children,
  },
  ref
) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [ref]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) onFileChange(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(e.target.files?.[0] ?? null);
  };

  const displayUrl = React.useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return previewUrl;
  }, [file, previewUrl]);

  React.useEffect(() => {
    return () => {
      if (file && displayUrl?.startsWith('blob:')) URL.revokeObjectURL(displayUrl);
    };
  }, [file, displayUrl]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {file && (
          <span className="text-xs text-muted-foreground">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </span>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !isUploading) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        tabIndex={disabled || isUploading ? -1 : 0}
        role="button"
        aria-label={`Select ${label.toLowerCase()}`}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50',
          (disabled || isUploading) && 'pointer-events-none opacity-60'
        )}
      >
        <input
          id={id}
          ref={setRefs}
          type="file"
          accept={accept}
          disabled={disabled || isUploading}
          onChange={handleFileChange}
          className="sr-only"
        />

        {displayUrl && !error ? (
          <div className="relative max-h-72 w-full overflow-hidden rounded-lg bg-slate-100">
            <img
              src={displayUrl}
              alt={previewAlt}
              onError={onImageError}
              className="max-h-72 w-full object-contain"
            />
            {children}
          </div>
        ) : (
          <div className="space-y-2 py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">
              Click to browse or drag and drop image here
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading image: {progress}%</span>
          </div>
          <progress id="upload-progress" max="100" value={progress} className="h-2 w-full rounded bg-slate-200" />
        </div>
      )}

      {onUpload && (
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading || uploadButtonDisabled}
          onClick={onUpload}
        >
          {uploadButtonText ?? (isUploading ? `Uploading ${progress}%…` : 'Upload')}
        </Button>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';
