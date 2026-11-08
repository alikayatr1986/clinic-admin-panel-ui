import { adminBinaryRequest, adminRequest, ApiError } from '../../../lib/api';
import type { Lead, LeadFilters, LeadListResponse, LeadStatus } from '../types/leads.types';

const path = (id: string) => `/admin/api/leads/${encodeURIComponent(id)}` as const;
export const leadsApi = {
  async export() {
    const response = await adminBinaryRequest('/admin/api/leads/export', { method: 'POST', body: '{}', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
    const count = response.headers.get('X-Lead-Count');
    if (count === null || !/^\d+$/.test(count)) throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server sent an unexpected response. Try again.');
    return { count: Number(count), blob: await response.blob() };
  },
  options: (signal?: AbortSignal) => adminRequest<{ data: string[] }>('/admin/api/lead-procedures', { signal }),
  list(filters: LeadFilters, procedureCodes: readonly string[] = [], signal?: AbortSignal) {
    if (filters.procedure && !procedureCodes.includes(filters.procedure)) throw new Error('Invalid procedure filter');
    return adminRequest<LeadListResponse>('/admin/api/leads/search', { method: 'POST', body: JSON.stringify(filters), signal });
  },
  get: (id: string, signal?: AbortSignal) => adminRequest<{ data: Lead }>(path(id), { signal }),
  status: (id: string, status: LeadStatus, revision: number) => adminRequest<{ data: Lead }>(`${path(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, expected_revision: revision }) }),
};
