import { act } from '@testing-library/react';
import { leadsKeys } from '../hooks/leads.keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { clearLeadFilters } from '../hooks/leadFilters';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { leadsApi } from '../services/leads.service';
import { LeadList } from './LeadList';
import type { Lead, LeadFilters } from '../types/leads.types';

function render(element: ReactElement) { const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); return rtlRender(<QueryClientProvider client={client}>{element}</QueryClientProvider>); }
const lead: Lead = { id: 'opaque', name: 'Example', country: 'TR', city: null, procedure: 'nose', email: null, phone_e164: '+123', preferred_contact: 'phone_call', primary_contact: '+123', message: '', lang: 'en', consent_accepted: true, consent_version: 'v1', consented_at: '', status: 'new', revision: 1, created_at: '', updated_at: '', status_actor_id: null, status_changed_at: null, legacy_incomplete: false };
afterEach(() => { cleanup(); clearLeadFilters(); vi.restoreAllMocks(); });
describe('Lead list', () => {
  it('offers historical procedures absent from the current page and retries failed options', async () => {
    vi.spyOn(leadsApi, 'options').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: ['old person@example.com'] });
    const list = vi.spyOn(leadsApi, 'list').mockResolvedValue({data: [lead], meta: {page: 1, page_size: 20, total: 1}});
    render(<LeadList onExpired={vi.fn()} onOpen={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', {name: 'Retry procedure filters'}));
    await screen.findByRole('option', {name: 'old person@example.com'});
    fireEvent.change(screen.getByLabelText('Procedure'), {target: {value: 'old person@example.com'}});
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({procedure: 'old person@example.com'}), expect.arrayContaining(['old person@example.com']), expect.any(AbortSignal)));
  });
  it('filters all methods and recovers from an empty later page', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: ['rhinoplasty', 'nose'] });
    const list = vi.spyOn(leadsApi, 'list').mockImplementation(async (filters: LeadFilters) => ({ data: filters.page === 1 ? [lead] : [], meta: { page: filters.page, page_size: 20, total: filters.page === 1 ? 21 : 1 } }));
    render(<LeadList onExpired={vi.fn()} onOpen={vi.fn()} />);
    await screen.findByText('Example');
    for (const method of ['email', 'phone_call', 'whatsapp', 'telegram', 'phone']) {
      fireEvent.change(screen.getByLabelText('Contact method'), { target: { value: method } });
      await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ preferred_contact: method, page: 1 }), expect.any(Array), expect.any(AbortSignal)));
    }
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'qualified' } });
    fireEvent.change(screen.getByLabelText('Procedure'), { target: { value: 'nose' } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'qualified', procedure: 'nose' }), expect.arrayContaining(['nose']), expect.any(AbortSignal)));
    await screen.findByText('Example');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('This page no longer has leads.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to first page' }));
    await screen.findByText('Example');
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), expect.any(Array), expect.any(AbortSignal));
  });
  it('hides cached rows when a procedure options refresh is forbidden', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValueOnce({ data: ['private person@example.com'] }).mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', ''));
    vi.spyOn(leadsApi, 'list').mockResolvedValue({ data: [lead], meta: { page: 1, page_size: 20, total: 1 } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rtlRender(<QueryClientProvider client={client}><LeadList onExpired={vi.fn()} onOpen={vi.fn()} /></QueryClientProvider>);
    await screen.findByText('Example');
    fireEvent.change(screen.getByLabelText('Procedure'), { target: { value: 'private person@example.com' } });
    expect(screen.getByLabelText('Procedure')).toHaveValue('private person@example.com');
    await act(async () => { await client.invalidateQueries({ queryKey: leadsKeys.options }); });
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByText('Example')).not.toBeInTheDocument();
    expect(screen.queryByText('private person@example.com')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Procedure')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });
  it('clears cached rows and shows access denied when lead query fails with 403', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: ['nose'] });
    vi.spyOn(leadsApi, 'list')
      .mockResolvedValueOnce({ data: [lead], meta: { page: 1, page_size: 20, total: 1 } })
      .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'denied'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rtlRender(
      <QueryClientProvider client={client}>
        <LeadList onExpired={vi.fn()} onOpen={vi.fn()} />
      </QueryClientProvider>
    );
    expect(await screen.findByText('Example')).toBeInTheDocument();
    await act(async () => {
      await client.invalidateQueries({ queryKey: leadsKeys.all });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByText('Example')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Procedure')).not.toBeInTheDocument();
  });

  it('triggers onExpired when lead query fails with 401', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    const onExpired = vi.fn();
    vi.spyOn(leadsApi, 'list').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', ''));
    render(<LeadList onExpired={onExpired} onOpen={vi.fn()} />);
    await waitFor(() => expect(onExpired).toHaveBeenCalledOnce());
  });

  it('handles pagination navigation and boundary disabled states', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    const listSpy = vi.spyOn(leadsApi, 'list').mockImplementation(async (filters: LeadFilters) => ({
      data: [lead],
      meta: { page: filters.page, page_size: 20, total: 40 },
    }));
    render(<LeadList onExpired={vi.fn()} onOpen={vi.fn()} />);
    await screen.findByText('Example');

    const prevButton = screen.getByRole('button', { name: 'Previous' });
    const nextButton = screen.getByRole('button', { name: 'Next' });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);
    await waitFor(() =>
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.any(Array),
        expect.any(AbortSignal)
      )
    );
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() =>
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.any(Array),
        expect.any(AbortSignal)
      )
    );
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('displays query error and recovers when retry button is clicked', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    const listSpy = vi
      .spyOn(leadsApi, 'list')
      .mockRejectedValueOnce(new Error('server down'))
      .mockResolvedValueOnce({ data: [lead], meta: { page: 1, page_size: 20, total: 1 } });
    render(<LeadList onExpired={vi.fn()} onOpen={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load leads. Try again.');
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(await screen.findByText('Example')).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });
});
