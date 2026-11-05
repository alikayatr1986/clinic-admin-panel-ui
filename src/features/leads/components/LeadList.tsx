import { useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { getLeadFilters, setLeadFilters } from '../hooks/leadFilters';
import { useLeadList, useLeadOptions } from '../hooks/useLeads';
import type { LeadFilters, LeadListProps } from '../types/leads.types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export function LeadList({ onExpired, onOpen }: LeadListProps) {
  const [state, setState] = useState(getLeadFilters);
  const { filters, identity } = state;
  const setFilters = (next: LeadFilters) => setState(setLeadFilters(next));
  const options = useLeadOptions();
  const procedureCodes = options.data?.data ?? [];
  const query = useLeadList(filters, identity, procedureCodes, options.isSuccess);

  useEffect(() => {
    if (
      (options.error instanceof ApiError && options.error.status === 401) ||
      (query.error instanceof ApiError && query.error.status === 401)
    ) {
      onExpired();
    }
  }, [options.error, query.error, onExpired]);

  const optionsDenied =
    options.error instanceof ApiError && [401, 403].includes(options.error.status);
  const queryDenied =
    query.error instanceof ApiError && [401, 403].includes(query.error.status);
  const isDenied = optionsDenied || queryDenied;
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
    <section aria-label="Lead browser" className="mt-8">
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
          <ul className="mt-6 grid gap-4">
            {rows.map((lead) => (
              <li key={lead.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle asChild className="text-lg min-w-0 break-words">
                        <h2>{lead.name}</h2>
                      </CardTitle>
                      <Badge variant="outline">{lead.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm min-w-0 break-words">
                    <p>Country: {lead.country}</p>
                    <p>
                      Method:{' '}
                      {lead.preferred_contact === 'phone'
                        ? 'Phone (legacy)'
                        : lead.preferred_contact}
                    </p>
                    <p>Selected contact: {lead.primary_contact ?? 'Not available'}</p>
                    <p>Procedure: {lead.procedure}</p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="link" className="p-0 h-auto">
                      <a
                        href={`/admin/leads/${encodeURIComponent(lead.id)}`}
                        onClick={(event) => {
                          if (
                            !event.metaKey &&
                            !event.ctrlKey &&
                            !event.shiftKey &&
                            !event.altKey &&
                            event.button === 0
                          ) {
                            event.preventDefault();
                            onOpen(lead.id);
                          }
                        }}
                      >
                        View details
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
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
    </section>
  );
}

