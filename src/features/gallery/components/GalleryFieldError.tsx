import type { GalleryFieldErrorProps } from '../types/gallery.case-editor.types';

export function FieldError({ name, errors, clientError }: GalleryFieldErrorProps) {
  const message = clientError || (name && errors ? errors[name] : undefined);
  return message ? <p className="mt-1 text-sm text-red-800">{message}</p> : null;
}
