import type { BlogFilters, BlogLocale } from '../types/blogs.types';

export const blogKeys = {
  all: ['blogs'] as const,
  list: (filters: BlogFilters) => ['blogs', 'list', filters] as const,
  detail: (id: string) => ['blogs', 'detail', id] as const,
  preview: (id: string, locale: BlogLocale) => ['blogs', 'preview', id, locale] as const,
  options: () => ['blogs', 'options'] as const,
};
