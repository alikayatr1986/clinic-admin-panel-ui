import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { leadsKeys } from '../hooks/leads.keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { clearLeadFilters } from '../hooks/leadFilters';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { leadsApi } from '../services/leads.service';
import { LeadList } from './LeadList';
import type { Lead, LeadFilters } from '../types/leads.types';

function render(element: ReactElement) { const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); return rtlRender(<QueryClientProvider client={client}>{element}</QueryClientProvider>); }
const lead: Lead = { id: 'opaque', name: 'Example', country: 'TR', city: null, procedure: 'nose', email: null, phone_e164: '+123', preferred_contact: 'phone_call', primary_contact: '+123', message: '', lang: 'en', consent_accepted: true, consent_version: 'v1', consented_at: '', status: 'new', revision: 1, created_at: '', updated_at: '', status_actor_id: null, status_changed_at: null, legacy_incomplete: false };
afterEach(() => { cleanup(); clearLeadFilters(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('Lead list', () => {
  it('exports all leads independently of filters, handles empty and allows retry', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    vi.spyOn(leadsApi, 'list').mockResolvedValue({ data: [lead], meta: { page: 1, page_size: 20, total: 40 } });
    const request = vi.spyOn(leadsApi, 'export').mockRejectedValueOnce(new ApiError(422, 'LEAD_EXPORT_LIMIT', 'limit')).mockResolvedValueOnce({ count: 0, blob: new Blob() });
    render(<LeadList onExpired={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'new' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export all leads to Excel' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('10,000');
    fireEvent.click(screen.getByRole('button', { name: 'Export all leads to Excel' }));
    expect(await screen.findByText('There are no leads to export.')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledWith();
  });
  it('downloads a nonempty export and handles expired sessions', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    vi.spyOn(leadsApi, 'list').mockResolvedValue({ data: [], meta: { page: 1, page_size: 20, total: 0 } });
    vi.spyOn(leadsApi, 'export').mockResolvedValueOnce({ count: 1, blob: new Blob() }).mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'expired'));
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const expired = vi.fn();
    render(<LeadList onExpired={expired} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export all leads to Excel' }));
    expect(await screen.findByText('Export downloaded.')).toBeInTheDocument();
    expect(click).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Export all leads to Excel' }));
    await waitFor(() => expect(expired).toHaveBeenCalled());
  });

  it('shows labeled lead rows and opens the selected detail', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    vi.spyOn(leadsApi, 'list').mockResolvedValue({ data: [{ ...lead, created_at: '2026-01-15T12:00:00Z' }, { ...lead, id: 'second', name: 'Second', primary_contact: null }], meta: { page: 1, page_size: 20, total: 2 } });
    render(<LeadList onExpired={vi.fn()} />);
    const table = await screen.findByRole('table', { name: 'Leads' });
    for (const name of ['Name', 'Country', 'Procedure', 'Preferred contact', 'Selected contact', 'Status', 'Submitted', 'Actions']) {
      expect(within(table).getByRole('columnheader', { name })).toBeInTheDocument();
    }
    const row = within(table).getByText('Example').closest('tr')!;
    for (const value of ['TR', 'nose', 'Phone call', '+123', 'new', new Date('2026-01-15T12:00:00Z').toLocaleDateString()]) {
      expect(within(row).getByText(value)).toBeInTheDocument();
    }
    expect(within(table).getAllByText('Not available')).toHaveLength(2);
    const link = within(row).getByRole('link', { name: 'View details for Example' });
    expect(link).toHaveAttribute('href', '/admin/leads/opaque');
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    fireEvent.click(link);
    const dialog = await screen.findByRole('dialog', { name: 'Lead details' });
    expect(await within(dialog).findByText('Example')).toBeInTheDocument();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy selected contact' }));
    await within(dialog).findByText('Copied to clipboard.');
    expect(writeText).toHaveBeenCalledWith(lead.primary_contact);
    fireEvent.change(within(dialog).getByLabelText('Change status'), { target: { value: 'contacted' } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(confirm).toHaveBeenCalledOnce();
    expect(within(dialog).getByLabelText('Change status')).toHaveValue('contacted');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(link).toHaveFocus());
  });
  it('contains keyboard focus, recovers a conflict and restores focus when the saved row disappears', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    const list = vi.spyOn(leadsApi, 'list')
      .mockResolvedValueOnce({ data: [lead], meta: { page: 1, page_size: 20, total: 1 } })
      .mockResolvedValue({ data: [], meta: { page: 1, page_size: 20, total: 0 } });
    vi.spyOn(leadsApi, 'get').mockResolvedValueOnce({ data: lead })
      .mockResolvedValueOnce({ data: { ...lead, revision: 2, status: 'qualified' } });
    const update = vi.spyOn(leadsApi, 'status')
      .mockRejectedValueOnce(new ApiError(409, 'REVISION_CONFLICT', ''))
      .mockResolvedValueOnce({ data: { ...lead, revision: 3, status: 'closed' } });
    render(<LeadList onExpired={vi.fn()} />);
    const browser = await screen.findByRole('region', { name: 'Lead browser' });
    await user.click(await within(browser).findByRole('link', { name: 'View details for Example' }));
    const dialog = await screen.findByRole('dialog', { name: 'Lead details' });
    await within(dialog).findByText('Example');
    expect(browser.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(dialog.contains(document.activeElement)).toBe(true);
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await user.selectOptions(within(dialog).getByLabelText('Change status'), 'contacted');
    await user.click(within(dialog).getByRole('button', { name: 'Update status' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('changed');
    expect(within(dialog).getByRole('button', { name: 'Update status' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Refresh lead' }));
    await waitFor(() => expect(within(dialog).getByLabelText('Change status')).toHaveValue('qualified'));
    await user.selectOptions(within(dialog).getByLabelText('Change status'), 'closed');
    await user.click(within(dialog).getByRole('button', { name: 'Update status' }));
    expect(await within(dialog).findByText('Status updated.')).toBeInTheDocument();
    expect(update).toHaveBeenLastCalledWith('opaque', 'closed', 2);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(browser).toHaveFocus());
    expect(screen.getByText('No leads match these filters.')).toBeInTheDocument();
  });
  it('preserves modified link navigation without opening the dialog', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    vi.spyOn(leadsApi, 'list').mockResolvedValue({ data: [lead], meta: { page: 1, page_size: 20, total: 1 } });
    render(<LeadList onExpired={vi.fn()} />);
    const link = await screen.findByRole('link', { name: 'View details for Example' });
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, [modifier]: true });
      let prevented = true;
      document.addEventListener('click', (received) => { prevented = received.defaultPrevented; received.preventDefault(); }, { once: true });
      link.dispatchEvent(event);
      expect(prevented).toBe(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  });
  it('blocks closing during a save and hides detail immediately if list access is denied', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    vi.spyOn(leadsApi, 'list').mockResolvedValueOnce({ data: [lead], meta: { page: 1, page_size: 20, total: 1 } }).mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', ''));
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    let resolveSave!: (value: { data: Lead }) => void;
    vi.spyOn(leadsApi, 'status').mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    const confirm = vi.spyOn(window, 'confirm');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    rtlRender(<QueryClientProvider client={client}><LeadList onExpired={vi.fn()} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('link', { name: 'View details for Example' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(await within(dialog).findByLabelText('Change status'), { target: { value: 'closed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update status' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    await act(async () => { await client.invalidateQueries({ queryKey: leadsKeys.lists }); });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Example')).not.toBeInTheDocument();
    await act(async () => { resolveSave({ data: { ...lead, status: 'closed', revision: 2 } }); });
  });
  it('offers historical procedures absent from the current page and retries failed options', async () => {
    vi.spyOn(leadsApi, 'options').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: ['old person@example.com'] });
    const list = vi.spyOn(leadsApi, 'list').mockResolvedValue({data: [lead], meta: {page: 1, page_size: 20, total: 1}});
    render(<LeadList onExpired={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', {name: 'Retry procedure filters'}));
    await screen.findByRole('option', {name: 'old person@example.com'});
    fireEvent.change(screen.getByLabelText('Procedure'), {target: {value: 'old person@example.com'}});
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({procedure: 'old person@example.com'}), expect.arrayContaining(['old person@example.com']), expect.any(AbortSignal)));
  });
  it('filters all methods and recovers from an empty later page', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: ['rhinoplasty', 'nose'] });
    const list = vi.spyOn(leadsApi, 'list').mockImplementation(async (filters: LeadFilters) => ({ data: filters.page === 1 ? [lead] : [], meta: { page: filters.page, page_size: 20, total: filters.page === 1 ? 21 : 1 } }));
    render(<LeadList onExpired={vi.fn()} />);
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
    rtlRender(<QueryClientProvider client={client}><LeadList onExpired={vi.fn()} /></QueryClientProvider>);
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
        <LeadList onExpired={vi.fn()} />
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
    render(<LeadList onExpired={onExpired} />);
    await waitFor(() => expect(onExpired).toHaveBeenCalledOnce());
  });

  it('handles pagination navigation and boundary disabled states', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    const listSpy = vi.spyOn(leadsApi, 'list').mockImplementation(async (filters: LeadFilters) => ({
      data: [lead],
      meta: { page: filters.page, page_size: 20, total: 40 },
    }));
    render(<LeadList onExpired={vi.fn()} />);
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
    render(<LeadList onExpired={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load leads. Try again.');
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(await screen.findByText('Example')).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });
});
