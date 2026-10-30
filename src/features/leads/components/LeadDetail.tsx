import { useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { leadsApi } from '../services/leads.service';
import type { Lead, LeadDetailProps, LeadStatus } from '../types/leads.types';

export function LeadDetail({ id, onExpired, onBack }: LeadDetailProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [status, setStatus] = useState<LeadStatus>('new');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLead(null); setLoading(true); setError(''); setConflict(false); setNotice('');
    leadsApi.get(id).then(({ data }) => { if (active) { setLead(data); setStatus(data.status); setLoading(false); } }).catch((failure: unknown) => {
      if (!active) return; setLoading(false);
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(failure instanceof ApiError && failure.status === 403 ? 'Access denied. Administrator access is required.' : 'Unable to load lead. Try again.');
    });
    return () => { active = false; };
  }, [id, attempt, onExpired]);
  async function save() {
    if (!lead) return; setBusy(true); setError(''); setNotice('');
    try { const { data } = await leadsApi.status(id, status, lead.revision); setLead(data); setStatus(data.status); setNotice('Status updated.'); }
    catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) { setLead(null); onExpired(); }
      else if (failure instanceof ApiError && failure.status === 403) { setLead(null); setError('Access denied. Administrator access is required or your security token has expired.'); }
      else if (failure instanceof ApiError && failure.status === 409) { setConflict(true); setError('This lead changed since it was loaded. Refresh before updating its status.'); }
      else setError('Unable to update status. Try again.');
    } finally { setBusy(false); }
  }
  return <section className="mt-8" aria-label="Lead details"><button onClick={onBack} className="underline">Back to leads</button>
    {loading ? <p role="status">Loading lead…</p> : <>{error && <p role="alert" className="mt-4">{error}</p>}{(!lead || conflict) && <button className="mt-4 underline" onClick={() => setAttempt(attempt + 1)}>{conflict ? 'Refresh lead' : 'Retry'}</button>}
    {lead && <div className="mt-5 rounded-xl border bg-white p-6"><h2 className="text-xl font-semibold">{lead.name}</h2><dl className="mt-4 grid gap-3"><div><dt>Country</dt><dd>{lead.country}</dd></div>{lead.city && <div><dt>City (historical)</dt><dd>{lead.city}</dd></div>}<div><dt>Contact method</dt><dd>{lead.preferred_contact === 'phone' ? 'Phone (legacy)' : lead.preferred_contact}</dd></div><div><dt>Selected contact</dt><dd>{lead.primary_contact ?? 'Not available'}</dd></div>{lead.email && <div><dt>Email</dt><dd>{lead.email}</dd></div>}{lead.phone_e164 && <div><dt>Phone</dt><dd>{lead.phone_e164}</dd></div>}<div><dt>Procedure</dt><dd>{lead.procedure}</dd></div><div><dt>Message</dt><dd className="whitespace-pre-wrap">{lead.message || 'None'}</dd></div><div><dt>Consent</dt><dd>{lead.consent_accepted ? 'Accepted' : 'Not accepted'} · Version {lead.consent_version} · {lead.consented_at} · Language {lead.lang}</dd></div><div><dt>Current status</dt><dd>{lead.status} · Revision {lead.revision}</dd></div></dl>{lead.legacy_incomplete && <p className="mt-4">This historical record is incomplete.</p>}<label className="mt-5 block">Change status<select disabled={busy} value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className="ml-3 rounded-md border p-2">{['new', 'contacted', 'qualified', 'closed', 'spam'].map((v) => <option key={v}>{v}</option>)}</select></label><button disabled={busy || conflict || status === lead.status} onClick={() => void save()} className="mt-4 rounded-md bg-crimson px-4 py-2 text-white disabled:opacity-50">{busy ? 'Saving…' : 'Update status'}</button>{notice && <p role="status">{notice}</p>}</div>}</>}
  </section>;
}
