import { adminRequest, adminUpload } from '../../../lib/api';
import type { BlogDetail, BlogFilters, BlogGenerationBrief, BlogGenerationJob, BlogHomeSettings, BlogList, BlogLocale, BlogMediaResult, BlogOptions, BlogPreviewDetail, BlogReviewKind, BlogSaveInput, BlogSaveResult } from '../types/blogs.types';

const postPath = (id: string) => `/admin/api/blogs/${encodeURIComponent(id)}` as const;

export const blogsApi = {
  list(filters: BlogFilters = {}, signal?: AbortSignal) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
    return adminRequest<BlogList>(`/admin/api/blogs${query.size ? `?${query}` : ''}`, { signal });
  },
  options: (signal?: AbortSignal) => adminRequest<{ data: BlogOptions }>('/admin/api/blog-options', { signal }),
  get: (id: string, signal?: AbortSignal) => adminRequest<{ data: BlogDetail }>(postPath(id), { signal }),
  preview: (id: string, lang: BlogLocale, revision: number, signal?: AbortSignal) => adminRequest<{ data: BlogPreviewDetail }>(`${postPath(id)}/preview?${new URLSearchParams({ lang, revision: String(revision) })}`, { signal }),
  review: (id: string, revisionID: string, kind: BlogReviewKind, reference?: string) => adminRequest<{ data: { id: string; revision_id: string; review_kind: BlogReviewKind; created_at: string } }>(`${postPath(id)}/reviews`, { method: 'POST', body: JSON.stringify({ revision_id: revisionID, review_kind: kind, ...(reference ? { private_reference: reference } : {}) }) }),
  publish: (id: string, input: { expected_aggregate_revision: number; category_id: string; en_revision_id: string; ar_revision_id: string }) => adminRequest<{ data: { publication_id: string; aggregate_revision: number; first_published_at: string; last_published_at: string } }>(`${postPath(id)}/publish`, { method: 'POST', body: JSON.stringify(input) }),
  unpublish: (id: string, revision: number) => adminRequest<{ data: { id: string; aggregate_revision: number; unpublished: boolean } }>(`${postPath(id)}/unpublish`, { method: 'POST', body: JSON.stringify({ expected_revision: revision }) }),
  delete: (id: string) => adminRequest<{ data: { id: string; deleted: boolean } }>(postPath(id), { method: 'DELETE' }),
  home: () => adminRequest<{ data: BlogHomeSettings }>('/admin/api/blog-home'),
  feature: (revision: number, postID: string | null) => adminRequest<{ data: BlogHomeSettings }>('/admin/api/blog-home', { method: 'PUT', body: JSON.stringify({ expected_revision: revision, featured_post_id: postID }) }),
  create(categoryID: string, slug: string, key: string, title = '') {
    return adminRequest<{ data: { id: string; aggregate_revision: number } }>('/admin/api/blogs', {
      method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ category_id: categoryID, ...(slug.trim() ? { slug: slug.trim() } : {}), ...(title.trim() ? { title: title.trim() } : {}) }),
    });
  },
  save: (id: string, input: BlogSaveInput) => adminRequest<{ data: BlogSaveResult }>(postPath(id), { method: 'PUT', body: JSON.stringify(input) }),
  upload(id: string, file: File, expectedRevision: number, rights: string, focalX: number, focalY: number, progress = (_percent: number) => {}) {
    const body = new FormData(); body.set('file', file); body.set('expected_revision', String(expectedRevision));
    body.set('rights_source_record', rights); body.set('focal_x', String(focalX)); body.set('focal_y', String(focalY));
    return adminUpload<{ data: BlogMediaResult }>(`${postPath(id)}/media`, body, progress);
  },
  queueGeneration(id: string, input: { lang: BlogLocale; idempotency_key: string; base_revision: number; brief: BlogGenerationBrief }) {
    return adminRequest<{ data: BlogGenerationJob }>(`${postPath(id)}/generation-jobs`, { method: 'POST', body: JSON.stringify(input) });
  },
  getGeneration: (id: string, jobID: string) =>
    adminRequest<{ data: BlogGenerationJob }>(`${postPath(id)}/generation-jobs/${encodeURIComponent(jobID)}`),
  cancelGeneration: (id: string, jobID: string) =>
    adminRequest<{ data: unknown }>(`${postPath(id)}/generation-jobs/${encodeURIComponent(jobID)}/cancel`, { method: 'POST', body: '{}' }),
  discardGeneration: (id: string, jobID: string) =>
    adminRequest<{ data: unknown }>(`${postPath(id)}/generation-jobs/${encodeURIComponent(jobID)}/discard`, { method: 'POST', body: '{}' }),
  applyGeneration: (id: string, jobID: string, selectedFields: string[]) =>
    adminRequest<{ data: unknown }>(`${postPath(id)}/generation-jobs/${encodeURIComponent(jobID)}/apply`, { method: 'POST', body: JSON.stringify({ selected_fields: selectedFields }) }),
};
