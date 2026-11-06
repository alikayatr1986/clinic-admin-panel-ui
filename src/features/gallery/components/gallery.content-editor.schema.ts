import { z } from 'zod';
import type { GalleryContentForm } from '../types/gallery.content.types';

const requiredText = (limit: number) =>
  z
    .string()
    .refine((v) => v.trim().length > 0, {
      message: 'This field is required.',
    })
    .refine((v) => Array.from(v.trim()).length <= limit, {
      message: `Use at most ${limit} characters.`,
    });

export const statisticSchema = z.object({
  key: requiredText(50),
  value: requiredText(50),
  label: requiredText(100),
});

export const galleryContentFormSchema = z
  .object({
    eyebrow: requiredText(160),
    heading: requiredText(300),
    introduction: requiredText(2000),
    statistics: z
      .array(statisticSchema)
      .max(3, 'Use at most three statistics.'),
  })
  .superRefine((data, ctx) => {
    const keys = new Set<string>();
    data.statistics.forEach((stat, idx) => {
      const key = stat.key?.trim();
      if (key) {
        if (keys.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Statistic keys must be unique.',
            path: ['statistics', idx, 'key'],
          });
        }
        keys.add(key);
      }
    });
  });

export const DEFAULT_CONTENT_FORM: GalleryContentForm = {
  eyebrow: '',
  heading: '',
  introduction: '',
  statistics: [],
};

