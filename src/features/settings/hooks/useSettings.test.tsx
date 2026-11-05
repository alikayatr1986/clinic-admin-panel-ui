import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { settingsApi } from '../services/settings.service';
import {
  settingsKeys,
  useActivateTimeframeMutation,
  useCreateTimeframeMutation,
  useDeleteTimeframeMutation,
  useReorderTimeframesMutation,
  useRetireTimeframeMutation,
  useTimeframeSettingsQuery,
  useUpdateTimeframeMutation,
} from './useSettings';
import type { TimeframeSetting } from '../types/settings.types';

afterEach(() => {
  vi.restoreAllMocks();
});

const mockTimeframe: TimeframeSetting = {
  id: 'tf-1',
  code: '0-3-months',
  name_en: '0–3 Months',
  name_ar: '٠-٣ أشهر',
  min_months: 0,
  max_months: 3,
  display_order: 1,
  status: 'draft',
  referenced_cases_count: 0,
  created_at: '2026-11-05T00:00:00Z',
  updated_at: '2026-11-05T00:00:00Z',
};

describe('useSettings hooks', () => {
  it('queries timeframe catalog and caches by status', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    vi.spyOn(settingsApi, 'listTimeframes').mockResolvedValue({
      data: [mockTimeframe],
    });

    const { result } = renderHook(() => useTimeframeSettingsQuery('all'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toEqual([mockTimeframe]);
    expect(client.getQueryData(settingsKeys.timeframesList('all'))).toEqual({
      data: [mockTimeframe],
    });
  });

  it('create mutation invalidates timeframe and gallery-options queries', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    vi.spyOn(settingsApi, 'createTimeframe').mockResolvedValue({
      data: mockTimeframe,
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateTimeframeMutation(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        code: '0-3-months',
        name_en: '0–3 Months',
        name_ar: '٠-٣ أشهر',
        min_months: 0,
        max_months: 3,
        display_order: 1,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: settingsKeys.timeframes() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['gallery-options'] });
  });

  it('update, activate, retire, delete, and reorder mutations trigger invalidations', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    vi.spyOn(settingsApi, 'updateTimeframe').mockResolvedValue({ data: mockTimeframe });
    vi.spyOn(settingsApi, 'activateTimeframe').mockResolvedValue({ data: { ...mockTimeframe, status: 'active' } });
    vi.spyOn(settingsApi, 'retireTimeframe').mockResolvedValue({ data: { ...mockTimeframe, status: 'retired' } });
    vi.spyOn(settingsApi, 'deleteTimeframe').mockResolvedValue({ data: { deleted: true } });
    vi.spyOn(settingsApi, 'reorderTimeframes').mockResolvedValue({ data: { ok: true } });

    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const updateHook = renderHook(() => useUpdateTimeframeMutation(), { wrapper });
    await act(async () => {
      await updateHook.result.current.mutateAsync({
        id: 'tf-1',
        input: { name_en: 'Updated', name_ar: 'محدث', min_months: 0, max_months: 3, display_order: 1 },
      });
    });

    const activateHook = renderHook(() => useActivateTimeframeMutation(), { wrapper });
    await act(async () => {
      await activateHook.result.current.mutateAsync({
        id: 'tf-1',
        input: { approval_attestation: 'Approved' },
      });
    });

    const retireHook = renderHook(() => useRetireTimeframeMutation(), { wrapper });
    await act(async () => {
      await retireHook.result.current.mutateAsync('tf-1');
    });

    const deleteHook = renderHook(() => useDeleteTimeframeMutation(), { wrapper });
    await act(async () => {
      await deleteHook.result.current.mutateAsync('tf-1');
    });

    const reorderHook = renderHook(() => useReorderTimeframesMutation(), { wrapper });
    await act(async () => {
      await reorderHook.result.current.mutateAsync(['tf-1']);
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(10); // 5 mutations * 2 invalidations each
  });
});

