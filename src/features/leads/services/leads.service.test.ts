import { afterEach, describe, expect, it, vi } from 'vitest';
import { leadsApi } from './leads.service';

afterEach(() => { vi.restoreAllMocks(); document.cookie = 'admin_csrf=; Max-Age=0; Path=/'; });
describe('lead transport', () => {
  it('uses same-origin no-store and sends CSRF and revision for status', async () => {
    document.cookie = 'admin_csrf=token; Path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    await leadsApi.status('opaque', 'closed', 7);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/admin/api/leads/opaque/status');
    expect(init?.credentials).toBe('same-origin'); expect(init?.cache).toBe('no-store');
    expect(new Headers(init?.headers).get('X-CSRF-Token')).toBe('token');
    expect(JSON.parse(String(init?.body))).toEqual({ status: 'closed', expected_revision: 7 });
  });
  it('rejects an arbitrary procedure before making a request', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    expect(() => leadsApi.list({ page: 1, page_size: 20, status: '', preferred_contact: '', procedure: 'person@example.com' }, ['rhinoplasty'])).toThrow('Invalid procedure filter');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends a historical procedure in the protected request body, never the URL', async () => {
    document.cookie = 'admin_csrf=token; Path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({data: [], meta: {page: 1, page_size: 20, total: 0}}), {status: 200}));
    const procedure = 'old person@example.com';
    await leadsApi.list({page: 1, page_size: 20, status: '', preferred_contact: '', procedure}, [procedure]);
    expect(fetch.mock.calls[0][0]).toBe('/admin/api/leads/search');
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).procedure).toBe(procedure);
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get('X-CSRF-Token')).toBe('token');
  });
  it('rejects status changes without CSRF before network access', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    await expect(leadsApi.status('opaque', 'closed', 7)).rejects.toMatchObject({ code: 'CSRF_MISSING' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
