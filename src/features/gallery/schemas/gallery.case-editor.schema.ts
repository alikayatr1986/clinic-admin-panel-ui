import { z } from 'zod';
import type { GalleryEditorForm } from '../types/gallery.case-editor.types';

const captionSchema = z.object({
  altText: z.string(),
  caption: z.string(),
  approved: z.boolean(),
});

const displayOrderSchema = z.string().refine(
  (v) => {
    if (v.trim() === '') return false;
    const n = Number(v);
    return Number.isSafeInteger(n) && n >= -2147483648 && n <= 2147483647;
  },
  { message: 'Enter a whole display order number.' }
);

export const caseEditorSchema = z.object({
  signedConsentID: z.string(),
  consentVerified: z.boolean(),
  procedureTag: z.string(),
  timeframeBadge: z.string(),
  beforePosition: z.enum(['', 'left', 'right']),
  cropAttested: z.boolean(),
  displayOrder: displayOrderSchema,
  captions: z.object({ en: captionSchema, ar: captionSchema }),
});

export const DEFAULT_EDITOR_VALUES: GalleryEditorForm = {
  signedConsentID: '',
  consentVerified: false,
  procedureTag: '',
  timeframeBadge: '',
  beforePosition: '',
  cropAttested: false,
  displayOrder: '0',
  captions: {
    en: { altText: '', caption: '', approved: false },
    ar: { altText: '', caption: '', approved: false },
  },
};
