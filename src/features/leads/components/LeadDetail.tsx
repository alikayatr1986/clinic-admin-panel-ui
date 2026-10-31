import { useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { useLead, useLeadStatus } from '../hooks/useLeads';
import type { LeadDetailProps, LeadStatus } from '../types/leads.types';

export function LeadDetail({ id, onExpired, onBack }: LeadDetailProps) {
  const query = useLead(id);
  const mutation = useLeadStatus();
  const [selection, setSelection] = useState<LeadStatus | null>(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { if (query.error instanceof ApiError && query.error.status === 401) onExpired(); }, [query.error, onExpired]);
  const inaccessible = query.error instanceof ApiError && [401, 403, 404].includes(query.error.status);
  const lead = inaccessible ? null : query.data?.data ?? null;
  const denied = error.startsWith('Access denied');
  const status = selection ?? lead?.status ?? 'new';
  const loading = query.isPending;
  const busy = mutation.isPending;
  const readError = query.error instanceof ApiError && query.error.status === 404 ? 'Lead not found.' : query.error instanceof ApiError && query.error.status === 403 ? 'Access denied. Administrator access is required.' : query.error ? 'Unable to load lead. Try again.' : '';
  async function refresh() { setNotice(''); const result = await query.refetch(); if (result.isSuccess) { setSelection(null); setError(''); setConflict(false); } }
  async function save() {
    if (!lead) return; setError(''); setNotice('');
    try { await mutation.mutateAsync({ id, status, revision: lead.revision }); setSelection(null); setNotice('Status updated.'); }
    catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else if (failure instanceof ApiError && failure.status === 403) { setError('Access denied. Administrator access is required or your security token has expired.'); }
      else if (failure instanceof ApiError && failure.status === 409) { setConflict(true); setError('This lead changed since it was loaded. Refresh before updating its status.'); }
      else setError('Unable to update status. Try again.');
    }
  }
  return <section className="mt-8" aria-label="Lead details"><a href="/admin/leads" onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onBack(); } }} className="underline">Back to leads</a>
    {loading ? <p role="status">Loading lead…</p> : <>{(error || readError) && <p role="alert" className="mt-4">{error || readError}</p>}{(!lead || conflict || denied) && <button className="mt-4 underline" onClick={() => void refresh()}>{conflict ? 'Refresh lead' : 'Retry'}</button>}
    {lead && !denied && <div className="mt-5 rounded-xl border bg-white p-6"><h2 className="text-xl font-semibold">{lead.name}</h2><dl className="mt-4 grid gap-3"><div><dt>Country</dt><dd>{lead.country}</dd></div>{lead.city && <div><dt>City (historical)</dt><dd>{lead.city}</dd></div>}<div><dt>Contact method</dt><dd>{lead.preferred_contact === 'phone' ? 'Phone (legacy)' : lead.preferred_contact}</dd></div><div><dt>Selected contact</dt><dd>{lead.primary_contact ?? 'Not available'}</dd></div>{lead.email && <div><dt>Email</dt><dd>{lead.email}</dd></div>}{lead.phone_e164 && <div><dt>Phone</dt><dd>{lead.phone_e164}</dd></div>}<div><dt>Procedure</dt><dd>{lead.procedure}</dd></div><div><dt>Message</dt><dd className="whitespace-pre-wrap">{lead.message || 'None'}</dd></div><div><dt>Consent</dt><dd>{lead.consent_accepted ? 'Accepted' : 'Not accepted'} · Version {lead.consent_version} · {lead.consented_at} · Language {lead.lang}</dd></div><div><dt>Current status</dt><dd>{lead.status} · Revision {lead.revision}</dd></div></dl>{lead.legacy_incomplete && <p className="mt-4">This historical record is incomplete.</p>}<label className="mt-5 block">Change status<select disabled={busy} value={status} onChange={(e) => setSelection(e.target.value as LeadStatus)} className="ml-3 rounded-md border p-2">{['new', 'contacted', 'qualified', 'closed', 'spam'].map((v) => <option key={v}>{v}</option>)}</select></label><button disabled={busy || conflict || status === lead.status} onClick={() => void save()} className="mt-4 rounded-md bg-crimson px-4 py-2 text-white disabled:opacity-50">{busy ? 'Saving…' : 'Update status'}</button>{notice && <p role="status">{notice}</p>}</div>}</>}
  </section>;
}
