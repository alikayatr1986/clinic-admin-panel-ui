import { z } from 'zod';
import type { BlogDraftFormState, BlogLocale } from '../types/blogs.types';

// Drafts may be incomplete; the server validates supplied content on save.
export const blogEditorSchema = z.object({
  forms: z.custom<Record<BlogLocale, BlogDraftFormState>>().nullable(),
});
