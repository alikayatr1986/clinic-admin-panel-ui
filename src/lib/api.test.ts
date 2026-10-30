import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminRequest, adminUpload, ApiError } from './api';
import { authApi } from '../features/auth/services/auth.service';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.cookie = 'admin_csrf=; Max-Age=0; Path=/';
});

describe('admin transport', () => {
  it('sends JSON credentials without a CSRF header and keeps cookies same origin', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { session_id: 'id' } }), { status: 200 }));
    await authApi.login('staff', 'secret');
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/admin/api/login');
    expect(init?.credentials).toBe('same-origin');
    expect(init?.body).toBe(JSON.stringify({ username: 'staff', password: 'secret' }));
    expect(new Headers(init?.headers).get('X-CSRF-Token')).toBeNull();
  });

  it('echoes the readable CSRF cookie for mutations', async () => {
    document.cookie = 'admin_csrf=test-token; Path=/';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }));
    await authApi.logout();
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('X-CSRF-Token')).toBe('test-token');
  });

  it('refuses mutation when the CSRF cookie is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(authApi.logout()).rejects.toMatchObject({ status: 403, code: 'CSRF_MISSING' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves API status and fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'VALIDATION', message: 'Invalid', fields: { title: 'Required' } } }), { status: 400 }));
    await expect(adminRequest('/admin/api/gallery')).rejects.toEqual(new ApiError(400, 'VALIDATION', 'Invalid', { title: 'Required' }));
  });

  it('reports network failures without exposing transport details', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('private host'));
    await expect(authApi.session()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('sends a multipart upload with CSRF and reports byte progress', async () => {
    document.cookie = 'admin_csrf=test-token; Path=/';
    let request!: FakeUploadRequest;
    class FakeUploadRequest {
      upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
      onerror: (() => void) | null = null;
      onabort: (() => void) | null = null;
      ontimeout: (() => void) | null = null;
      onload: (() => void) | null = null;
      withCredentials = false;
      status = 200;
      responseText = JSON.stringify({ data: { revision: 2 } });
      path = '';
      headers = new Map<string, string>();
      body: FormData | null = null;
      constructor() { request = this; }
      open(method: string, path: string) { expect(method).toBe('POST'); this.path = path; }
      setRequestHeader(name: string, value: string) { this.headers.set(name, value); }
      send(body: FormData) {
        this.body = body;
        this.upload.onprogress?.(new ProgressEvent('progress', { lengthComputable: true, loaded: 50, total: 100 }));
        this.onload?.();
      }
    }
    vi.stubGlobal('XMLHttpRequest', FakeUploadRequest);
    const body = new FormData();
    body.set('expected_revision', '1');
    const progress = vi.fn();
    await expect(adminUpload<{ data: { revision: number } }>('/admin/api/gallery/example/media', body, progress)).resolves.toEqual({ data: { revision: 2 } });
    expect(request.path).toBe('/admin/api/gallery/example/media');
    expect(request.withCredentials).toBe(true);
    expect(request.headers.get('X-CSRF-Token')).toBe('test-token');
    expect(request.body).toBe(body);
    expect(progress).toHaveBeenCalledWith(50);
  });
});
