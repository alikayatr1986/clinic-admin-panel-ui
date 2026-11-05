import { useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { useLead, useLeadStatus } from '../hooks/useLeads';
import type { LeadDetailProps, LeadStatus } from '../types/leads.types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export function LeadDetail({ id, onExpired, onBack }: LeadDetailProps) {
  const query = useLead(id);
  const mutation = useLeadStatus();
  const [selection, setSelection] = useState<LeadStatus | null>(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) onExpired();
  }, [query.error, onExpired]);

  const inaccessible =
    query.error instanceof ApiError && [401, 403, 404].includes(query.error.status);
  const lead = inaccessible ? null : query.data?.data ?? null;
  const denied = error.startsWith('Access denied');
  const status = selection ?? lead?.status ?? 'new';
  const loading = query.isPending;
  const busy = mutation.isPending;
  const readError =
    query.error instanceof ApiError && query.error.status === 404
      ? 'Lead not found.'
      : query.error instanceof ApiError && query.error.status === 403
      ? 'Access denied. Administrator access is required.'
      : query.error
      ? 'Unable to load lead. Try again.'
      : '';

  async function refresh() {
    setNotice('');
    const result = await query.refetch();
    if (result.isSuccess) {
      setSelection(null);
      setError('');
      setConflict(false);
    } else {
      setError('Unable to refresh lead. Check your connection and try again.');
    }
  }

  async function save() {
    if (!lead) return;
    setError('');
    setNotice('');
    try {
      await mutation.mutateAsync({ id, status, revision: lead.revision });
      setSelection(null);
      setNotice('Status updated.');
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else if (failure instanceof ApiError && failure.status === 403) {
        setError(
          'Access denied. Administrator access is required or your security token has expired.'
        );
      } else if (failure instanceof ApiError && failure.status === 409) {
        setConflict(true);
        setError('This lead changed since it was loaded. Refresh before updating its status.');
      } else setError('Unable to update status. Try again.');
    }
  }

  return (
    <section className="mt-8" aria-label="Lead details">
      <div>
        <Button asChild variant="link" className="p-0 h-auto">
          <a
            href="/admin/leads"
            onClick={(event) => {
              if (
                !event.metaKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey &&
                event.button === 0
              ) {
                event.preventDefault();
                onBack();
              }
            }}
          >
            Back to leads
          </a>
        </Button>
      </div>

      {loading ? (
        <p role="status" className="mt-4">
          Loading lead…
        </p>
      ) : (
        <>
          {(error || readError) && (
            <p role="alert" className="mt-4 text-destructive">
              {error || readError}
            </p>
          )}

          {(!lead || conflict || denied || Boolean(readError)) && (
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => void refresh()}
              className="mt-4"
            >
              {conflict ? 'Refresh lead' : 'Retry'}
            </Button>
          )}

          {lead && !denied && (
            <Card className="mt-5">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle asChild className="text-xl min-w-0 break-words">
                    <h2>{lead.name}</h2>
                  </CardTitle>
                  <Badge variant="outline">{lead.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Country</dt>
                    <dd className="text-sm min-w-0 break-words">{lead.country}</dd>
                  </div>
                  {lead.city && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        City (historical)
                      </dt>
                      <dd className="text-sm min-w-0 break-words">{lead.city}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Contact method</dt>
                    <dd className="text-sm min-w-0 break-words">
                      {lead.preferred_contact === 'phone'
                        ? 'Phone (legacy)'
                        : lead.preferred_contact}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Selected contact</dt>
                    <dd className="text-sm min-w-0 break-words">{lead.primary_contact ?? 'Not available'}</dd>
                  </div>
                  {lead.email && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                      <dd className="text-sm min-w-0 break-words">{lead.email}</dd>
                    </div>
                  )}
                  {lead.phone_e164 && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                      <dd className="text-sm min-w-0 break-words">{lead.phone_e164}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Procedure</dt>
                    <dd className="text-sm min-w-0 break-words">{lead.procedure}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Message</dt>
                    <dd className="whitespace-pre-wrap text-sm min-w-0 break-words">{lead.message || 'None'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Consent</dt>
                    <dd className="text-sm min-w-0 break-words">
                      {lead.consent_accepted ? 'Accepted' : 'Not accepted'} · Version{' '}
                      {lead.consent_version} · {lead.consented_at} · Language {lead.lang}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Current status</dt>
                    <dd className="text-sm min-w-0 break-words">
                      {lead.status} · Revision {lead.revision}
                    </dd>
                  </div>
                </dl>
                {lead.legacy_incomplete && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    This historical record is incomplete.
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="change-lead-status">Change status</Label>
                    <select
                      id="change-lead-status"
                      disabled={busy}
                      value={status}
                      onChange={(e) => {
                        setNotice('');
                        setSelection(e.target.value as LeadStatus);
                      }}
                      className="rounded-md border p-2 text-sm"
                    >
                      {['new', 'contacted', 'qualified', 'closed', 'spam'].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    disabled={busy || conflict || status === lead.status}
                    onClick={() => void save()}
                  >
                    {busy ? 'Saving…' : 'Update status'}
                  </Button>
                </div>
                {notice && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {notice}
                  </p>
                )}
              </CardFooter>
            </Card>
          )}
        </>
      )}
    </section>
  );
}

