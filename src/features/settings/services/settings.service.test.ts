import { afterEach, describe, expect, it, vi } from 'vitest';
import { settingsApi } from './settings.service';

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = 'admin_csrf=; Max-Age=0; Path=/';
});

describe('settings service transport', () => {
  it('fetches timeframe list with optional status filter', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    await settingsApi.listTimeframes('active');
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/admin/api/settings/timeframes?status=active');
    expect(init?.credentials).toBe('same-origin');
    expect(init?.cache).toBe('no-store');
  });

  it('creates timeframe sending POST with CSRF token and payload', async () => {
    document.cookie = 'admin_csrf=test-csrf; Path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'tf-1', code: '0-3-months' } }), { status: 201 })
    );

    const input = {
      code: '0-3-months',
      name_en: '0–3 Months',
      name_ar: '٠-٣ أشهر',
      min_months: 0,
      max_months: 3,
      display_order: 1,
    };
    await settingsApi.createTimeframe(input);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/admin/api/settings/timeframes');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('X-CSRF-Token')).toBe('test-csrf');
    expect(JSON.parse(String(init?.body))).toEqual(input);
  });

  it('updates timeframe sending PUT to canonical id path', async () => {
    document.cookie = 'admin_csrf=test-csrf; Path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'tf-1' } }), { status: 200 })
    );

    const input = {
      name_en: '0–3 Months Updated',
      name_ar: '٠-٣ أشهر',
      min_months: 0,
      max_months: 3,
      display_order: 1,
    };
    await settingsApi.updateTimeframe('tf-1', input);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/admin/api/settings/timeframes/tf-1');
    expect(init?.method).toBe('PUT');
    expect(new Headers(init?.headers).get('X-CSRF-Token')).toBe('test-csrf');
  });

  it('activates timeframe sending POST with approval attestation', async () => {
    document.cookie = 'admin_csrf=test-csrf; Path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'tf-1', status: 'active' } }), { status: 200 })
    );

    await settingsApi.activateTimeframe('tf-1', {
      approval_attestation: 'Signed off by Medical Director',
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/admin/api/settings/timeframes/tf-1/activate');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      approval_attestation: 'Signed off by Medical Director',
    });
  });

  it('retires timeframe sending POST to retire endpoint', async () => {
    document.cookie = 'admin_csrf=test-csrf; Path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'tf-1', status: 'retired' } }), { status: 200 })
    );

    await settingsApi.retireTimeframe('tf-1');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/admin/api/settings/timeframes/tf-1/retire');
    expect(init?.method).toBe('POST');
  });

  it('deletes timeframe sending DELETE', async () => {
    document.cookie = 'admin_csrf=test-csrf; Path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { deleted: true } }), { status: 200 })
    );

    await settingsApi.deleteTimeframe('tf-1');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/admin/api/settings/timeframes/tf-1');
    expect(init?.method).toBe('DELETE');
  });

  it('reorders timeframes sending PUT with ordered_ids array', async () => {
    document.cookie = 'admin_csrf=test-csrf; Path=/';
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), { status: 200 })
    );

    await settingsApi.reorderTimeframes(['id-2', 'id-1']);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/admin/api/settings/timeframes/reorder');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ ordered_ids: ['id-2', 'id-1'] });
  });

  it('rejects mutation when CSRF token is missing', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    await expect(settingsApi.retireTimeframe('tf-1')).rejects.toMatchObject({
      code: 'CSRF_MISSING',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

