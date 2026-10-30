import { useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { leadsApi } from '../services/leads.service';
import type { Lead, LeadFilters, LeadListProps } from '../types/leads.types';

const initial: LeadFilters = { page: 1, page_size: 20, status: '', preferred_contact: '', procedure: '' };
export function LeadList({ onExpired, onOpen }: LeadListProps) {
  const [procedureCodes, setProcedureCodes] = useState<string[]>([]);
  const [filters, setFilters] = useState(initial);
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [optionsError, setOptionsError] = useState('');
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setOptionsError('');
    leadsApi.options().then(({ data }) => { if (active) setProcedureCodes(data); }).catch((failure: unknown) => { if (!active) return; if (failure instanceof ApiError && failure.status === 401) onExpired(); else setOptionsError('Unable to load procedure filters.'); });
    return () => { active = false; };
  }, [onExpired, optionsAttempt]);
  useEffect(() => {
    let active = true;
    setRows([]); setLoading(true); setError('');
    leadsApi.list(filters, procedureCodes).then((result) => { if (active) { setRows(result.data); setTotal(result.meta.total); setLoading(false); } }).catch((failure: unknown) => {
      if (!active) return;
      setLoading(false);
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(failure instanceof ApiError && failure.status === 403 ? 'Access denied. Administrator access is required.' : 'Unable to load leads. Try again.');
    });
    return () => { active = false; };
  }, [filters, attempt, onExpired]);
  const pages = Math.max(1, Math.ceil(total / filters.page_size));
  return <section aria-label="Lead browser" className="mt-8">
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
      <label>Status<select value={filters.status} onChange={(e) => setFilters({ ...filters, page: 1, status: e.target.value })} className="mt-2 w-full rounded-md border p-2"><option value="">All statuses</option>{['new', 'contacted', 'qualified', 'closed', 'spam'].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label>Contact method<select value={filters.preferred_contact} onChange={(e) => setFilters({ ...filters, page: 1, preferred_contact: e.target.value })} className="mt-2 w-full rounded-md border p-2"><option value="">All methods</option><option value="email">Email</option><option value="phone_call">Phone call</option><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="phone">Phone (legacy)</option></select></label>
      <label>Procedure<select value={filters.procedure} onChange={(e) => { if (!e.target.value || procedureCodes.includes(e.target.value)) setFilters({ ...filters, page: 1, procedure: e.target.value }); }} className="mt-2 w-full rounded-md border p-2"><option value="">All procedures</option>{procedureCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
    </div>
    {optionsError && <div role="alert"><p>{optionsError}</p><button onClick={() => setOptionsAttempt((value) => value + 1)}>Retry procedure filters</button></div>}
    {loading ? <p role="status" className="mt-6">Loading leads…</p> : error ? <div className="mt-6"><p role="alert">{error}</p><button onClick={() => setAttempt(attempt + 1)}>Retry</button></div> : rows.length === 0 && filters.page > 1 ? <div className="mt-6"><p role="alert">This page no longer has leads.</p><button className="mt-3 underline" onClick={() => setFilters({ ...filters, page: 1 })}>Go to first page</button></div> : rows.length === 0 ? <p className="mt-6">No leads match these filters.</p> : <><ul className="mt-6 grid gap-4">{rows.map((lead) => <li key={lead.id} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{lead.name}</h2><p>Country: {lead.country}</p><p>Method: {lead.preferred_contact === 'phone' ? 'Phone (legacy)' : lead.preferred_contact}</p><p>Selected contact: {lead.primary_contact ?? 'Not available'}</p><p>Procedure: {lead.procedure} · Status: {lead.status}</p><button className="mt-3 underline" onClick={() => onOpen(lead.id)}>View details</button></li>)}</ul><nav aria-label="Lead pages" className="mt-6 flex gap-4"><button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button><span>Page {filters.page} of {pages}</span><button disabled={filters.page >= pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button></nav></>}
  </section>;
}
