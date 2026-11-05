import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { settingsApi } from '../services/settings.service';
import {
  settingsKeys,
  useActivateTimeframeMutation,
  useBlogCategoryActionMutation,
  useCreateProcedureMutation,
  useCreateTimeframeMutation,
  useDeleteTimeframeMutation,
  useProcedureActionMutation,
  useReorderProceduresMutation,
  useReorderTimeframesMutation,
  useRetireTimeframeMutation,
  useSaveBlogCategoryMutation,
  useTimeframeSettingsQuery,
  useUpdateProcedureMutation,
  useUpdateTimeframeMutation,
} from './useSettings';
import type { ProcedureSetting, TimeframeSetting } from '../types/settings.types';

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

  it('create mutation invalidates timeframe and gallery options queries', async () => {
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
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['gallery', 'options'] });
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

  it('typed procedure and blog-category mutations call services and invalidate their caches', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const procedure: ProcedureSetting = {
      id: 'pr-1', code: 'rhino', name_en: 'Rhinoplasty', name_ar: 'تجميل الأنف',
      display_order: 1, status: 'draft', referenced_cases_count: 0, referenced_leads_count: 0,
    };
    const createProcedure = vi.spyOn(settingsApi, 'createProcedure').mockResolvedValue({ data: procedure });
    const updateProcedure = vi.spyOn(settingsApi, 'updateProcedure').mockResolvedValue({ data: procedure });
    const procedureAction = vi.spyOn(settingsApi, 'procedureAction').mockResolvedValue({ data: {} });
    const reorderProcedures = vi.spyOn(settingsApi, 'reorderProcedures').mockResolvedValue({ data: {} });
    const saveCategory = vi.spyOn(settingsApi, 'saveBlogCategory').mockResolvedValue({ data: {} });
    const categoryAction = vi.spyOn(settingsApi, 'blogCategoryAction').mockResolvedValue({ data: {} });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const createHook = renderHook(() => useCreateProcedureMutation(), { wrapper });
    await act(async () => {
      await createHook.result.current.mutateAsync(procedure);
    });
    const updateHook = renderHook(() => useUpdateProcedureMutation(), { wrapper });
    await act(async () => {
      await updateHook.result.current.mutateAsync({ id: 'pr-1', input: { name_en: 'Rhinoplasty', name_ar: 'تجميل الأنف', display_order: 1 } });
    });
    const actionHook = renderHook(() => useProcedureActionMutation(), { wrapper });
    await act(async () => {
      await actionHook.result.current.mutateAsync({ id: 'pr-1', action: 'retire' });
    });
    const reorderHook = renderHook(() => useReorderProceduresMutation(), { wrapper });
    await act(async () => {
      await reorderHook.result.current.mutateAsync({ orderedIds: ['pr-1'] });
    });
    const saveHook = renderHook(() => useSaveBlogCategoryMutation(), { wrapper });
    await act(async () => {
      await saveHook.result.current.mutateAsync({ input: { key: 'nose', name_en: 'Nose', name_ar: 'أنف' } });
    });
    const categoryActionHook = renderHook(() => useBlogCategoryActionMutation(), { wrapper });
    await act(async () => {
      await categoryActionHook.result.current.mutateAsync({ id: 'cat-1', action: 'delete' });
    });

    expect(createProcedure).toHaveBeenCalledWith(procedure);
    expect(updateProcedure).toHaveBeenCalledWith('pr-1', expect.objectContaining({ name_en: 'Rhinoplasty' }));
    expect(procedureAction).toHaveBeenCalledWith('pr-1', 'retire');
    expect(reorderProcedures).toHaveBeenCalledWith(['pr-1']);
    expect(saveCategory).toHaveBeenCalledWith({ key: 'nose', name_en: 'Nose', name_ar: 'أنف' }, undefined);
    expect(categoryAction).toHaveBeenCalledWith('cat-1', 'delete');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: settingsKeys.procedures() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: settingsKeys.blogCategories() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['gallery', 'options'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['blogs', 'options'] });
  });
});

