import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { leadsApi } from '../services/leads.service';
import { clearLeadFilters } from './leadFilters';
import { leadsKeys } from './leads.keys';
import { useLeadList, useLeadStatus } from './useLeads';
import type { Lead } from '../types/leads.types';

afterEach(() => vi.restoreAllMocks());
it('keeps private filters out of query keys and updates cached detail and list after a status change', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const filters = { page: 1, page_size: 20, status: 'qualified', preferred_contact: 'email', procedure: 'private-procedure' };
  vi.spyOn(leadsApi, 'list').mockResolvedValue({ data: [], meta: { page: 1, page_size: 20, total: 0 } });
  const list = renderHook(() => useLeadList(filters, 42, ['private-procedure'], true), { wrapper });
  await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
  expect(JSON.stringify(client.getQueryCache().getAll().map((query) => query.queryKey))).not.toContain('private-procedure');
  const lead = { id: 'opaque', status: 'contacted', revision: 2 } as Lead;
  vi.spyOn(leadsApi, 'status').mockResolvedValue({ data: lead });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const mutation = renderHook(() => useLeadStatus(), { wrapper });
  await act(async () => { await mutation.result.current.mutateAsync({ id: 'opaque', status: 'contacted', revision: 1 }); });
  expect(client.getQueryData(leadsKeys.detail('opaque'))).toEqual({ data: lead });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: leadsKeys.lists });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
});

it('does not restore private cache when a pending mutation finishes after session change', async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  let finish!: (value: { data: Lead }) => void;
  vi.spyOn(leadsApi, 'status').mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const mutation = renderHook(() => useLeadStatus(), { wrapper });
  let pending!: Promise<unknown>;
  await act(async () => { pending = mutation.result.current.mutateAsync({ id: 'opaque', status: 'contacted', revision: 1 }); await Promise.resolve(); });
  clearLeadFilters();
  client.clear();
  await act(async () => { finish({ data: { id: 'opaque', status: 'contacted', revision: 2 } as Lead }); await pending; });
  expect(client.getQueryData(leadsKeys.detail('opaque'))).toBeUndefined();
  expect(invalidate).not.toHaveBeenCalled();
});
