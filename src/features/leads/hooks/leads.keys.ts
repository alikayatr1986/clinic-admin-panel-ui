import type { LeadFilters } from '../types/leads.types';

export const leadsKeys = {
  all: ['leads'] as const,
  list: (filters: LeadFilters) => ['leads', 'list', filters] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
};
