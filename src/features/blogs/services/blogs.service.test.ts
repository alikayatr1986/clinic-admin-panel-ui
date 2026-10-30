import { afterEach, describe, expect, it, vi } from 'vitest';
import { blogsApi } from './blogs.service';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.cookie = 'admin_csrf=; Max-Age=0; Path=/';
});

const response = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

describe('blogsApi transport', () => {
  it('uses exact preview and lifecycle payloads with cookie/CSRF and no-store transport', async () => {
    document.cookie = 'admin_csrf=token; Path=/';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response({ data: {} }));
    await blogsApi.preview('post/1', 'ar', 17);
    expect(fetchMock.mock.calls[0][0]).toBe('/admin/api/blogs/post%2F1/preview?lang=ar&revision=17');
    await blogsApi.review('p', 'revision-uuid', 'medical', 'Reference');
    await blogsApi.publish('p', { expected_aggregate_revision: 12, category_id: 'cat', en_revision_id: 'en-uuid', ar_revision_id: 'ar-uuid' });
    await blogsApi.unpublish('p', 13); await blogsApi.delete('p'); await blogsApi.home(); await blogsApi.feature(9, null);
    const paths = fetchMock.mock.calls.map(([path]) => path);
    expect(paths.slice(1)).toEqual(['/admin/api/blogs/p/reviews', '/admin/api/blogs/p/publish', '/admin/api/blogs/p/unpublish', '/admin/api/blogs/p', '/admin/api/blog-home', '/admin/api/blog-home']);
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({ revision_id: 'revision-uuid', review_kind: 'medical', private_reference: 'Reference' });
    expect(JSON.parse(fetchMock.mock.calls[2][1]!.body as string)).toEqual({ expected_aggregate_revision: 12, category_id: 'cat', en_revision_id: 'en-uuid', ar_revision_id: 'ar-uuid' });
    expect(JSON.parse(fetchMock.mock.calls[3][1]!.body as string)).toEqual({ expected_revision: 13 });
    expect(fetchMock.mock.calls[4][1]?.method).toBe('DELETE'); expect(fetchMock.mock.calls[4][1]?.body).toBeUndefined();
    expect(JSON.parse(fetchMock.mock.calls[6][1]!.body as string)).toEqual({ expected_revision: 9, featured_post_id: null });
    fetchMock.mock.calls.forEach(([, init]) => { expect(init?.cache).toBe('no-store'); expect(init?.credentials).toBe('same-origin'); if (!['GET'].includes(init?.method ?? 'GET')) expect(new Headers(init?.headers).get('X-CSRF-Token')).toBe('token'); });
  });
  it('constructs list, create, detail, and save requests', async () => {
    document.cookie = 'admin_csrf=token; Path=/';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => response({ data: { id: 'post-1' }, page: 2, page_size: 12, total: 0 }));
    await blogsApi.list({ page: 2, page_size: 12, status: 'draft', category: 'ent-health', q: 'nose' });
    expect(fetchMock.mock.calls[0][0]).toBe('/admin/api/blogs?page=2&page_size=12&status=draft&category=ent-health&q=nose');

    await blogsApi.create('cat-1', 'my-post', 'create-key');
    const [, create] = fetchMock.mock.calls[1];
    expect(create?.method).toBe('POST');
    expect(new Headers(create?.headers).get('Idempotency-Key')).toBe('create-key');
    expect(create?.body).toBe(JSON.stringify({ category_id: 'cat-1', slug: 'my-post' }));

    await blogsApi.get('post-1');
    expect(fetchMock.mock.calls[2][0]).toBe('/admin/api/blogs/post-1');

    const input = { expected_revision: 3, lang: 'en' as const, title: 'Title', excerpt: 'Excerpt', body: { schema_version: 1 as const, blocks: [] }, cover_media_id: null, cover_alt: '', author_name: 'Doctor', reviewer_attribution: null, seo_title: 'SEO', seo_description: 'Description', references: [] };
    await blogsApi.save('post-1', input);
    const [, save] = fetchMock.mock.calls[3];
    expect(save?.method).toBe('PUT');
    expect(save?.body).toBe(JSON.stringify(input));
  });

  it('constructs the cover multipart contract', async () => {
    document.cookie = 'admin_csrf=token; Path=/';
    let request!: FakeRequest;
    class FakeRequest {
      upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
      onerror: (() => void) | null = null; onabort: (() => void) | null = null; ontimeout: (() => void) | null = null; onload: (() => void) | null = null;
      status = 200; responseText = JSON.stringify({ data: { media_id: 'media-1', aggregate_revision: 4, width: 1, height: 1, focal_x: .25, focal_y: .75 } });
      withCredentials = false; path = ''; body: FormData | null = null;
      constructor() { request = this; }
      open(method: string, path: string) { expect(method).toBe('POST'); this.path = path; }
      setRequestHeader() {}
      send(body: FormData) { this.body = body; this.onload?.(); }
    }
    vi.stubGlobal('XMLHttpRequest', FakeRequest);
    const file = new File(['image'], 'cover.png', { type: 'image/png' });
    await blogsApi.upload('post-1', file, 3, 'Licensed', .25, .75);
    expect(request.path).toBe('/admin/api/blogs/post-1/media');
    expect(request.body?.get('file')).toBe(file);
    expect(request.body?.get('expected_revision')).toBe('3');
    expect(request.body?.get('rights_source_record')).toBe('Licensed');
    expect(request.body?.get('focal_x')).toBe('0.25');
    expect(request.body?.get('focal_y')).toBe('0.75');
  });
});
