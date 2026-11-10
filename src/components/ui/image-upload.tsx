import * as React from 'react';
import { ImageUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Label } from './label';
import type { ImageUploadProps } from '@/types/image-upload.types';

export const ImageUpload = React.forwardRef<HTMLInputElement, ImageUploadProps>(function ImageUpload(
  {
    id, label = 'Image', description = 'JPEG, PNG, or WebP supported.',
    accept = 'image/jpeg,image/png,image/webp', disabled = false, file = null,
    onFileChange, previewUrl = null, previewAlt = 'Uploaded image preview',
    isUploading = false, progress = 0, onUpload, uploadButtonText,
    uploadButtonDisabled, error = null, onImageError, className, children,
  },
  ref
) {
  const generatedId = React.useId();
  const inputId = id ?? `image-upload-${generatedId}`;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileError, setFileError] = React.useState('');
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const unavailable = disabled || isUploading;

  const setRefs = React.useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  React.useEffect(() => {
    if (!file) {
      setLocalPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (typeof URL.createObjectURL !== 'function') return;
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(selected: File | null) {
    if (!selected) return;
    const accepted = accept.split(',').some((entry) => {
      const value = entry.trim().toLowerCase();
      return value.startsWith('.') ? selected.name.toLowerCase().endsWith(value)
        : value.endsWith('/*') ? selected.type.toLowerCase().startsWith(value.slice(0, -1))
          : selected.type.toLowerCase() === value;
    });
    if (!accepted) {
      setFileError(`Unsupported file type. ${description}`);
      if (inputRef.current) inputRef.current.value = '';
      onFileChange(null);
      return;
    }
    setFileError('');
    onFileChange(selected);
  }

  const displayUrl = file ? localPreview : previewUrl;
  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1">
        <Label htmlFor={inputId} className="text-sm font-semibold">{label}</Label>
        <p id={`${inputId}-description`} className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div
        onClick={(event) => {
          if (!unavailable && !(event.target as HTMLElement).closest('button, input, a')) inputRef.current?.click();
        }}
        onDragOver={(event) => { event.preventDefault(); if (!unavailable) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!unavailable) selectFile(event.dataTransfer.files[0] ?? null);
        }}
        className={cn(
          'rounded-xl border-2 border-dashed p-4 transition-colors sm:p-6',
          !unavailable && 'cursor-pointer',
          isDragging ? 'border-primary bg-primary/5' : 'border-primary/60 bg-slate-50/70',
          unavailable && 'opacity-60'
        )}
      >
        <input
          id={inputId} ref={setRefs} type="file" accept={accept} disabled={unavailable}
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          tabIndex={-1} aria-invalid={Boolean(fileError || error)}
          aria-describedby={`${inputId}-description${fileError || error ? ` ${inputId}-error` : ''}`}
          className="sr-only"
        />
        {displayUrl ? (
          <div className="relative overflow-hidden rounded-lg bg-slate-100">
            <img src={displayUrl} alt={previewAlt} onError={onImageError} className="max-h-72 w-full object-contain" />
            {children}
          </div>
        ) : (
          <div className="py-5 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ImageUp aria-hidden="true" className="size-6" />
            </div>
            <p className="text-base font-semibold text-foreground">Choose an image to get started</p>
            <p className="mt-1 text-sm text-muted-foreground">Drag and drop an image here, or browse your files.</p>
          </div>
        )}
        {file && (
          <p className="mt-3 break-all text-sm text-foreground">
            <span className="font-medium">Selected: {file.name}</span> <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" disabled={unavailable} onClick={() => inputRef.current?.click()}>
            {displayUrl || file ? 'Change image' : 'Browse files'}
          </Button>
          {file && (
            <Button type="button" variant="ghost" disabled={unavailable} onClick={() => { setFileError(''); onFileChange(null); }}>
              Remove selection
            </Button>
          )}
        </div>
      </div>
      {(fileError || error) && <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">{fileError || error}</p>}
      {isUploading && (
        <div className="space-y-2" aria-live="polite">
          <Label htmlFor={`${inputId}-progress`} className="text-sm">Uploading image: {progress}%</Label>
          <progress id={`${inputId}-progress`} max="100" value={progress} className="h-2 w-full accent-primary" />
        </div>
      )}
      {onUpload && (
        <Button type="button" disabled={unavailable || uploadButtonDisabled} onClick={onUpload}>
          {uploadButtonText ?? (isUploading ? `Uploading ${progress}%…` : 'Upload image')}
        </Button>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';
