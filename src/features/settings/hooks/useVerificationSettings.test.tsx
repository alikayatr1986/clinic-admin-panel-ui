import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSaveVerificationMutation, useVerificationSettingsQuery } from './useVerificationSettings';
import type { VerificationInput } from '../types/verification.types';

afterEach(() => { vi.restoreAllMocks(); document.cookie = 'admin_csrf=; max-age=0'; });
it('loads and saves a method through the real transport and updates the query cache', async () => {
  document.cookie = 'admin_csrf=test-token';
  const input: VerificationInput = { enabled: false, provider: 'twilio', expiry_minutes: 10, resend_cooldown_seconds: 60, max_sends: 3, max_checks: 5, lockout_minutes: 15, retention_days: 30, fallback_to_sms: false, account_sid: 'AC-test', service_sid: '', sender: '', template_id: '', secret: '' };
  const setting = { ...input, method: 'email', secret_configured: true, adapter_available: false, generation: 0 };
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ data: [setting] }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ data: { ...setting, account_sid: 'AC-new' } }), { status: 200 }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => ({ query: useVerificationSettingsQuery(), save: useSaveVerificationMutation() }), { wrapper });
  await waitFor(() => expect(result.current.query.data?.data[0].account_sid).toBe('AC-test'));
  expect(fetchMock.mock.calls[0][0]).toBe('/admin/api/settings/verification');
  await result.current.save.mutateAsync({ method: 'email', input: { ...input, account_sid: 'AC-new' } });
  expect(fetchMock.mock.calls[1][0]).toBe('/admin/api/settings/verification/email');
  expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT');
  expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({ ...input, account_sid: 'AC-new' });
  expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('X-CSRF-Token')).toBe('test-token');
  await waitFor(() => expect(result.current.query.data?.data[0].account_sid).toBe('AC-new'));
});
