import type { LeadFilters } from '../types/leads.types';

const initial = (): LeadFilters => ({ page: 1, page_size: 20, status: '', preferred_contact: '', procedure: '' });
let filters = initial();
let identity = 0;
let sessionGeneration = 0;
export function getLeadSessionGeneration() { return sessionGeneration; }
export function getLeadFilters() { return { filters, identity }; }
export function setLeadFilters(next: LeadFilters) { filters = next; identity += 1; return getLeadFilters(); }
export function clearLeadFilters() { filters = initial(); identity += 1; sessionGeneration += 1; }
