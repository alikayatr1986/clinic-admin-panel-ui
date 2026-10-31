import { useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { getLeadFilters, setLeadFilters } from '../hooks/leadFilters';
import { useLeadList, useLeadOptions } from '../hooks/useLeads';
import type { LeadFilters, LeadListProps } from '../types/leads.types';

export function LeadList({ onExpired, onOpen }: LeadListProps) {
  const [state, setState] = useState(getLeadFilters);
  const { filters, identity } = state;
  const setFilters = (next: LeadFilters) => setState(setLeadFilters(next));
  const options = useLeadOptions();
  const procedureCodes = options.data?.data ?? [];
  const query = useLeadList(filters, identity, procedureCodes, options.isSuccess);
  useEffect(() => { if ((options.error instanceof ApiError && options.error.status === 401) || (query.error instanceof ApiError && query.error.status === 401)) onExpired(); }, [options.error, query.error, onExpired]);
  const optionsDenied = options.error instanceof ApiError && [401, 403].includes(options.error.status);
  const optionsError = options.error instanceof ApiError && options.error.status === 403 ? 'Access denied. Administrator access is required.' : options.error && !(options.error instanceof ApiError && options.error.status === 401) ? 'Unable to load procedure filters.' : '';
  const error = query.error instanceof ApiError && query.error.status === 403 ? 'Access denied. Administrator access is required.' : query.error ? 'Unable to load leads. Try again.' : '';
  const rows = query.isError || optionsDenied ? [] : query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const loading = options.isPending || query.isPending && !options.isError;
  const pages = Math.max(1, Math.ceil(total / filters.page_size));
  return <section aria-label="Lead browser" className="mt-8">
    {!optionsDenied && <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
      <label>Status<select value={filters.status} onChange={(e) => setFilters({ ...filters, page: 1, status: e.target.value })} className="mt-2 w-full rounded-md border p-2"><option value="">All statuses</option>{['new', 'contacted', 'qualified', 'closed', 'spam'].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label>Contact method<select value={filters.preferred_contact} onChange={(e) => setFilters({ ...filters, page: 1, preferred_contact: e.target.value })} className="mt-2 w-full rounded-md border p-2"><option value="">All methods</option><option value="email">Email</option><option value="phone_call">Phone call</option><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="phone">Phone (legacy)</option></select></label>
      <label>Procedure<select value={filters.procedure} onChange={(e) => { if (!e.target.value || procedureCodes.includes(e.target.value)) setFilters({ ...filters, page: 1, procedure: e.target.value }); }} className="mt-2 w-full rounded-md border p-2"><option value="">All procedures</option>{procedureCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
    </div>}
    {optionsError && <div role="alert"><p>{optionsError}</p><button onClick={() => void options.refetch()}>Retry procedure filters</button></div>}
    {optionsDenied ? null : loading ? <p role="status" className="mt-6">Loading leads…</p> : error ? <div className="mt-6"><p role="alert">{error}</p><button onClick={() => void query.refetch()}>Retry</button></div> : rows.length === 0 && filters.page > 1 ? <div className="mt-6"><p role="alert">This page no longer has leads.</p><button className="mt-3 underline" onClick={() => setFilters({ ...filters, page: 1 })}>Go to first page</button></div> : rows.length === 0 ? <p className="mt-6">No leads match these filters.</p> : <><ul className="mt-6 grid gap-4">{rows.map((lead) => <li key={lead.id} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{lead.name}</h2><p>Country: {lead.country}</p><p>Method: {lead.preferred_contact === 'phone' ? 'Phone (legacy)' : lead.preferred_contact}</p><p>Selected contact: {lead.primary_contact ?? 'Not available'}</p><p>Procedure: {lead.procedure} · Status: {lead.status}</p><a className="mt-3 underline" href={`/admin/leads/${encodeURIComponent(lead.id)}`} onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onOpen(lead.id); } }}>View details</a></li>)}</ul><nav aria-label="Lead pages" className="mt-6 flex gap-4"><button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button><span>Page {filters.page} of {pages}</span><button disabled={filters.page >= pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button></nav></>}
  </section>;
}
