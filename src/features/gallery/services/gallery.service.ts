import { adminRequest, adminUpload } from '../../../lib/api';
import type {
  GalleryCase, GalleryContent, GalleryContentUpdate, GalleryEdit, GalleryFilters,
  GalleryList, GalleryOptions, GalleryUploadResult,
} from '../types/gallery.types';

const casePath = (id: string) => `/admin/api/gallery/${encodeURIComponent(id)}` as const;

export const galleryApi = {
  list(filters: GalleryFilters = {}, signal?: AbortSignal) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }
    const suffix = query.size ? `?${query}` : '';
    return adminRequest<GalleryList>(`/admin/api/gallery${suffix}`, { signal });
  },
  get(id: string, signal?: AbortSignal) { return adminRequest<{ data: GalleryCase }>(casePath(id), { signal }); },
  create(displayOrder = 0) {
    return adminRequest<{ data: GalleryCase }>('/admin/api/gallery', {
      method: 'POST', body: JSON.stringify({ display_order: displayOrder }),
    });
  },
  edit(id: string, input: GalleryEdit) {
    return adminRequest<{ data: GalleryCase }>(casePath(id), { method: 'PUT', body: JSON.stringify(input) });
  },
  remove(id: string, expectedRevision: number) {
    return adminRequest<{ data: { deleted: boolean } }>(casePath(id), {
      method: 'DELETE', body: JSON.stringify({ expected_revision: expectedRevision }),
    });
  },
  publish(id: string, expectedRevision: number, published: boolean) {
    return adminRequest<{ data: GalleryCase }>(`${casePath(id)}/publish`, {
      method: 'POST', body: JSON.stringify({ expected_revision: expectedRevision, published }),
    });
  },
  options(signal?: AbortSignal) { return adminRequest<{ data: GalleryOptions }>('/admin/api/gallery-options', { signal }); },
  content(lang: 'en' | 'ar') {
    return adminRequest<{ data: GalleryContent[] }>(`/admin/api/gallery-content?lang=${lang}`);
  },
  updateContent(input: GalleryContentUpdate) {
    return adminRequest<{ data: GalleryContent[] }>('/admin/api/gallery-content', {
      method: 'PUT', body: JSON.stringify(input),
    });
  },
  upload(id: string, file: File, expectedRevision: number, onProgress: (percent: number) => void = () => {}) {
    const body = new FormData();
    body.set('file', file);
    body.set('expected_revision', String(expectedRevision));
    return adminUpload<{ data: GalleryUploadResult }>(`${casePath(id)}/media`, body, onProgress);
  },
  preview(id: string, expectedRevision: number) {
    return adminRequest<{ data: { url: string; expires_at: string } }>(`${casePath(id)}/preview`, {
      method: 'POST', body: JSON.stringify({ expected_revision: expectedRevision }),
    });
  },
  withdrawConsent(id: string) {
    return adminRequest<{ data: { affected_cases: number } }>(`/admin/api/gallery-consents/${encodeURIComponent(id)}/withdraw`, { method: 'POST' });
  },
};
