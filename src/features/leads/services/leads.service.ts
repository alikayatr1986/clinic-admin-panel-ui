import { adminRequest } from '../../../lib/api';
import type { Lead, LeadFilters, LeadListResponse, LeadStatus } from '../types/leads.types';

const path = (id: string) => `/admin/api/leads/${encodeURIComponent(id)}` as const;
export const leadsApi = {
  options: () => adminRequest<{ data: string[] }>('/admin/api/lead-procedures'),
  list(filters: LeadFilters, procedureCodes: readonly string[] = []) {
    if (filters.procedure && !procedureCodes.includes(filters.procedure)) throw new Error('Invalid procedure filter');
    return adminRequest<LeadListResponse>('/admin/api/leads/search', { method: 'POST', body: JSON.stringify(filters) });
  },
  get: (id: string) => adminRequest<{ data: Lead }>(path(id)),
  status: (id: string, status: LeadStatus, revision: number) => adminRequest<{ data: Lead }>(`${path(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, expected_revision: revision }) }),
};
