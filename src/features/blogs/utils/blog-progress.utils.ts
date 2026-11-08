import type { BlogDraftFormState } from '../types/blogs.types';

export function contentProgress(form: BlogDraftFormState): string {
  if (form.references.some((ref) => !ref.label.trim() || !ref.url.trim())) return 'Needs attention: a reference is incomplete';
  if (form.references.some((ref) => !ref.url.startsWith('https://') && !ref.url.startsWith('/'))) return 'Needs attention: check reference URLs';
  if (!form.blocks.length) return 'Incomplete';
  return 'Content present; validation unknown';
}
