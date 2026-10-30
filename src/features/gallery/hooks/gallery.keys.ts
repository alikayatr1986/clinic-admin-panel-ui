import type { GalleryFilters } from '../types/gallery.types';

export const galleryKeys = {
  all: ['gallery'] as const,
  list: (filters: GalleryFilters) => ['gallery', 'list', filters] as const,
  detail: (id: string) => ['gallery', 'detail', id] as const,
};
