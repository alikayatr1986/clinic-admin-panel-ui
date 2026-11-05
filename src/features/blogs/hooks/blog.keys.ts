import type { BlogFilters, BlogLocale } from '../types/blogs.types';

export const blogKeys = {
  all: ['blogs'] as const,
  lists: () => ['blogs', 'list'] as const,
  list: (filters: BlogFilters) => ['blogs', 'list', filters] as const,
  detail: (id: string) => ['blogs', 'detail', id] as const,
  preview: (id: string, locale: BlogLocale, revision: number) => ['blogs', 'preview', id, locale, revision] as const,
  options: () => ['blogs', 'options'] as const,
  home: () => ['blogs', 'home'] as const,
  generation: (id: string, jobID: string) => ['blogs', 'generation', id, jobID] as const,
};
