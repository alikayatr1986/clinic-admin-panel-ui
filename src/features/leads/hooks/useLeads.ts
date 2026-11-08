import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../services/leads.service';
import { getLeadSessionGeneration } from './leadFilters';
import { leadsKeys } from './leads.keys';
import type { LeadFilters, LeadStatusUpdate } from '../types/leads.types';

export function useLeadOptions() {
  return useQuery({ queryKey: leadsKeys.options, queryFn: ({ signal }) => leadsApi.options(signal), retry: false });
}
export function useLeadList(filters: LeadFilters, identity: number, codes: readonly string[], enabled: boolean) {
  return useQuery({ queryKey: leadsKeys.list(identity), queryFn: ({ signal }) => leadsApi.list(filters, codes, signal), enabled, retry: false });
}
export function useLead(id: string) {
  return useQuery({ queryKey: leadsKeys.detail(id), queryFn: ({ signal }) => leadsApi.get(id, signal), enabled: Boolean(id), retry: false });
}
export function useLeadStatus() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, status, revision }: LeadStatusUpdate) => leadsApi.status(id, status, revision), retry: false,
    onMutate: () => getLeadSessionGeneration(),
    onSuccess: (result, { id }, generation) => { if (generation !== getLeadSessionGeneration()) return; client.setQueryData(leadsKeys.detail(id), result); void client.invalidateQueries({ queryKey: leadsKeys.lists }); void client.invalidateQueries({ queryKey: ['dashboard'] }); },
  });
}

export function useLeadExport() {
  return useMutation({ mutationFn: () => leadsApi.export(), retry: false });
}
