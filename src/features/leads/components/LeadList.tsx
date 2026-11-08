import { useEffect, useRef, useState } from 'react';
import { LeadDetail } from './LeadDetail';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ApiError } from '../../../lib/api';
import { getLeadFilters, setLeadFilters } from '../hooks/leadFilters';
import { useLeadExport, useLeadList, useLeadOptions } from '../hooks/useLeads';
import type { LeadFilters, LeadListProps } from '../types/leads.types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export function LeadList({ onExpired }: LeadListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dirty = useRef(false);
  const busy = useRef(false);
  const trigger = useRef<HTMLAnchorElement | null>(null);
  const fallback = useRef<HTMLElement | null>(null);
  const handleDirtyChange = (value: boolean) => { dirty.current = value; };
  const requestClose = () => {
    if (busy.current) return;
    if (dirty.current && !window.confirm('Discard your unsaved status selection?')) return;
    dirty.current = false;
    setSelectedId(null);
  };
  const [state, setState] = useState(getLeadFilters);
  const { filters, identity } = state;
  const setFilters = (next: LeadFilters) => setState(setLeadFilters(next));
  const exportMutation = useLeadExport();
  const exporting = useRef(false);
  const options = useLeadOptions();
  const procedureCodes = options.data?.data ?? [];
  const query = useLeadList(filters, identity, procedureCodes, options.isSuccess);

  useEffect(() => {
    if (
      (options.error instanceof ApiError && options.error.status === 401) ||
      (query.error instanceof ApiError && query.error.status === 401) ||
      (exportMutation.error instanceof ApiError && exportMutation.error.status === 401)
    ) {
      onExpired();
    }
  }, [options.error, query.error, exportMutation.error, onExpired]);

  const optionsDenied =
    options.error instanceof ApiError && [401, 403].includes(options.error.status);
  const queryDenied =
    query.error instanceof ApiError && [401, 403].includes(query.error.status);
  const isDenied = optionsDenied || queryDenied;
  useEffect(() => {
    if (isDenied) {
      setSelectedId(null);
      dirty.current = false;
    }
  }, [isDenied]);
  const optionsError =
    options.error instanceof ApiError && options.error.status === 403
      ? 'Access denied. Administrator access is required.'
      : options.error && !(options.error instanceof ApiError && options.error.status === 401)
      ? 'Unable to load procedure filters.'
      : '';
  const error =
    query.error instanceof ApiError && query.error.status === 403
      ? 'Access denied. Administrator access is required.'
      : query.error
      ? 'Unable to load leads. Try again.'
      : '';
  const rows = query.isError || isDenied ? [] : query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const loading = options.isPending || (query.isPending && !options.isError);
  const pages = Math.max(1, Math.ceil(total / filters.page_size));

  return (
    <section aria-label="Lead browser" className="mt-8" ref={fallback} tabIndex={-1}>
      {!isDenied && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">Export includes all leads, regardless of filters or page.</p>
            <Button type="button" variant="outline" disabled={exportMutation.isPending} onClick={() => {
            if (exporting.current) return;
            exporting.current = true;
            exportMutation.mutate(undefined, { onSuccess: ({ count, blob }) => {
              if (count === 0) return;
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'leads.xlsx';
              link.click();
              URL.revokeObjectURL(url);
            }, onSettled: () => { exporting.current = false; } });
            }}>Export all leads to Excel</Button>
          </div>
          <div aria-live="polite" className="mt-2 text-sm">
            {exportMutation.isPending && 'Preparing export…'}
            {exportMutation.isSuccess && (exportMutation.data.count === 0 ? 'There are no leads to export.' : 'Export downloaded.')}
            {exportMutation.isError && !(exportMutation.error instanceof ApiError && exportMutation.error.status === 401) && (
              <p role="alert">{exportMutation.error instanceof ApiError && exportMutation.error.status === 403 ? 'Access denied. Administrator access or a valid security token is required.' : exportMutation.error instanceof ApiError && exportMutation.error.code === 'LEAD_EXPORT_LIMIT' ? 'Export exceeds the 10,000 lead limit. Contact an administrator for help.' : 'Unable to export leads. Try again.'}</p>
            )}
          </div>
        </div>
      )}
      {!isDenied && (
        <Card>
          <CardContent className="p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="lead-filter-status" className="block text-sm font-medium">
                  Status
                </Label>
                <select
                  id="lead-filter-status"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, page: 1, status: e.target.value })}
                  className="mt-2 w-full rounded-md border p-2 text-sm"
                >
                  <option value="">All statuses</option>
                  {['new', 'contacted', 'qualified', 'closed', 'spam'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="lead-filter-contact" className="block text-sm font-medium">
                  Contact method
                </Label>
                <select
                  id="lead-filter-contact"
                  value={filters.preferred_contact}
                  onChange={(e) => setFilters({ ...filters, page: 1, preferred_contact: e.target.value })}
                  className="mt-2 w-full rounded-md border p-2 text-sm"
                >
                  <option value="">All methods</option>
                  <option value="email">Email</option>
                  <option value="phone_call">Phone call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                  <option value="phone">Phone (legacy)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="lead-filter-procedure" className="block text-sm font-medium">
                  Procedure
                </Label>
                <select
                  id="lead-filter-procedure"
                  value={filters.procedure}
                  onChange={(e) => {
                    if (!e.target.value || procedureCodes.includes(e.target.value)) {
                      setFilters({ ...filters, page: 1, procedure: e.target.value });
                    }
                  }}
                  className="mt-2 w-full rounded-md border p-2 text-sm"
                >
                  <option value="">All procedures</option>
                  {procedureCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {optionsError && (
        <div role="alert" className="mt-4">
          <p className="text-destructive">{optionsError}</p>
          <Button
            type="button"
            variant="outline"
            disabled={options.isFetching}
            onClick={() => void options.refetch()}
            className="mt-2"
          >
            Retry procedure filters
          </Button>
        </div>
      )}

      {optionsDenied ? null : loading ? (
        <p role="status" className="mt-6">
          Loading leads…
        </p>
      ) : error ? (
        <div className="mt-6">
          <p role="alert" className="text-destructive">
            {error}
          </p>
          {!queryDenied && (
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
              className="mt-2"
            >
              Retry
            </Button>
          )}
        </div>
      ) : options.isError ? null : rows.length === 0 && filters.page > 1 ? (
        <div className="mt-6">
          <p role="alert">This page no longer has leads.</p>
          <Button
            type="button"
            variant="link"
            onClick={() => setFilters({ ...filters, page: 1 })}
            className="mt-3 p-0 h-auto"
          >
            Go to first page
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6">No leads match these filters.</p>
      ) : (
        <>
          <div className="mt-6 rounded-md border">
            <Table aria-label="Leads">
              <TableHeader><TableRow>
                {['Name', 'Country', 'Procedure', 'Preferred contact', 'Selected contact', 'Status', 'Submitted', 'Actions'].map((heading) => (
                  <TableHead key={heading} scope="col">{heading}</TableHead>
                ))}
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((lead) => {
                  const date = new Date(lead.created_at);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="min-w-40 break-words">{lead.name}</TableCell>
                      <TableCell>{lead.country}</TableCell>
                      <TableCell>{lead.procedure}</TableCell>
                      <TableCell>{lead.preferred_contact === 'phone' ? 'Phone (legacy)' : lead.preferred_contact === 'phone_call' ? 'Phone call' : lead.preferred_contact}</TableCell>
                      <TableCell className="min-w-40 break-all">{lead.primary_contact || 'Not available'}</TableCell>
                      <TableCell><Badge variant="outline">{lead.status}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap">{Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button asChild variant="link" className="p-0 h-auto">
                          <a aria-label={`View details for ${lead.name}`} href={`/admin/leads/${encodeURIComponent(lead.id)}`} onClick={(event) => {
                            if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
                              event.preventDefault();
                              trigger.current = event.currentTarget;
                              setSelectedId(lead.id);
                            }
                          }}>
                            View details
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <nav aria-label="Lead pages" className="mt-6 flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              disabled={filters.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {filters.page} of {pages}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={filters.page >= pages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Next
            </Button>
          </nav>
        </>
      )}
      <Dialog open={!isDenied && selectedId !== null} onOpenChange={(open) => { if (!open) requestClose(); }}>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto md:max-w-3xl"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger.current?.isConnected) trigger.current.focus();
            else fallback.current?.focus();
          }}
        >
          <DialogTitle>Lead details</DialogTitle>
          {!isDenied && selectedId && <LeadDetail key={selectedId} id={selectedId} onExpired={onExpired} onDirtyChange={handleDirtyChange} onBusyChange={(value) => { busy.current = value; }} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

