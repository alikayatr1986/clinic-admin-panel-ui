import { adminRequest } from '../../../lib/api';
import type { Lead, LeadFilters, LeadListResponse, LeadStatus } from '../types/leads.types';

const path = (id: string) => `/admin/api/leads/${encodeURIComponent(id)}` as const;
export const leadsApi = {
  options: (signal?: AbortSignal) => adminRequest<{ data: string[] }>('/admin/api/lead-procedures', { signal }),
  list(filters: LeadFilters, procedureCodes: readonly string[] = [], signal?: AbortSignal) {
    if (filters.procedure && !procedureCodes.includes(filters.procedure)) throw new Error('Invalid procedure filter');
    return adminRequest<LeadListResponse>('/admin/api/leads/search', { method: 'POST', body: JSON.stringify(filters), signal });
  },
  get: (id: string, signal?: AbortSignal) => adminRequest<{ data: Lead }>(path(id), { signal }),
  status: (id: string, status: LeadStatus, revision: number) => adminRequest<{ data: Lead }>(`${path(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, expected_revision: revision }) }),
};
