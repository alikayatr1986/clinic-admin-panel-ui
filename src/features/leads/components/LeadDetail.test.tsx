import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { clearLeadFilters } from '../hooks/leadFilters';
import { act, cleanup, render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { leadsApi } from '../services/leads.service';
import { LeadDetail } from './LeadDetail';
import type { Lead } from '../types/leads.types';

function render(element: ReactElement) { const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); return rtlRender(<QueryClientProvider client={client}>{element}</QueryClientProvider>); }
const lead: Lead = { id: 'opaque', name: '<script>alert(1)</script>', country: 'TR', city: 'Istanbul', procedure: 'nose', email: 'old@example.com', phone_e164: '+123456789', preferred_contact: 'phone', primary_contact: '+123456789', message: '<img src=x onerror=alert(1)>', lang: 'en', consent_accepted: true, consent_version: 'v1', consented_at: '2026-01-01', status: 'new', revision: 3, created_at: '', updated_at: '', status_actor_id: null, status_changed_at: null, legacy_incomplete: false };
afterEach(() => { cleanup(); clearLeadFilters(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('Lead detail', () => {
  beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true); vi.spyOn(toast, 'success'); vi.spyOn(toast, 'error'); });
  it('copies unique displayed values on request and keeps feedback private', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    render(<LeadDetail id="opaque" onExpired={vi.fn()} />);
    await screen.findByText(lead.name);
    expect(screen.queryByRole('button', { name: 'Copy phone' })).not.toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Copy selected contact' }));
    await screen.findByText('Copied to clipboard.');
    expect(writeText).toHaveBeenCalledWith(lead.primary_contact);
    expect(toast.success).toHaveBeenCalledWith('Copied to clipboard.');
    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(lead.email));
    expect(screen.getByRole('status')).not.toHaveTextContent(lead.email!);
    expect(screen.getByRole('status')).not.toHaveTextContent(lead.phone_e164!);
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'contacted' } });
    expect(screen.getByRole('button', { name: 'Update status' })).toBeEnabled();
  });
  it('omits missing values and deduplicates email and phone', async () => {
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: { ...lead, primary_contact: '', email: 'same', phone_e164: 'same' } });
    render(<LeadDetail id="opaque" onExpired={vi.fn()} />);
    await screen.findByText(lead.name);
    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy selected contact' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy email' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy phone' })).not.toBeInTheDocument();
  });
  it.each(['unavailable', 'rejected'])('reports %s clipboard failure without contact data', async (failure) => {
    vi.stubGlobal('navigator', failure === 'unavailable' ? {} : { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    render(<LeadDetail id="opaque" onExpired={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy selected contact' }));
    expect(await screen.findByText('Unable to copy. Please select the value manually.')).toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveTextContent(lead.primary_contact!);
    expect(toast.error).toHaveBeenCalledWith('Unable to copy. Please select the value manually.');
  });
  it('prevents overlapping writes and ignores completion after a lead change', async () => {
    let resolveFirst!: () => void;
    const writeText = vi.fn().mockReturnValueOnce(new Promise<void>((resolve) => { resolveFirst = resolve; })).mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.spyOn(leadsApi, 'get').mockImplementation(async (id) => ({ data: { ...lead, id, name: id } }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = rtlRender(<QueryClientProvider client={client}><LeadDetail id="first" onExpired={vi.fn()} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy selected contact' }));
    const email = screen.getByRole('button', { name: 'Copy email' });
    expect(email).toBeDisabled();
    fireEvent.click(email);
    expect(writeText).toHaveBeenCalledTimes(1);
    view.rerender(<QueryClientProvider client={client}><LeadDetail id="second" onExpired={vi.fn()} /></QueryClientProvider>);
    await screen.findByText('second');
    expect(screen.getByRole('button', { name: 'Copy email' })).toBeDisabled();
    await act(async () => resolveFirst());
    expect(screen.queryByText('Copied to clipboard.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));
    await screen.findByText('Copied to clipboard.');
    expect(writeText).toHaveBeenLastCalledWith(lead.email);
  });
  it('clears feedback and ignores pending results when refreshed contact values change', async () => {
    let resolvePending!: () => void;
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockReturnValueOnce(new Promise<void>((resolve) => { resolvePending = resolve; }));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.spyOn(leadsApi, 'get').mockResolvedValueOnce({ data: lead })
      .mockResolvedValueOnce({ data: { ...lead, email: 'new@example.com' } })
      .mockResolvedValueOnce({ data: { ...lead, email: 'newer@example.com' } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rtlRender(<QueryClientProvider client={client}><LeadDetail id="opaque" onExpired={vi.fn()} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy email' }));
    await screen.findByText('Copied to clipboard.');
    await act(async () => { await client.invalidateQueries({ queryKey: ['leads'] }); });
    await screen.findByText('new@example.com');
    expect(screen.queryByText('Copied to clipboard.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));
    await act(async () => { await client.invalidateQueries({ queryKey: ['leads'] }); });
    await screen.findByText('newer@example.com');
    await act(async () => resolvePending());
    expect(screen.queryByText('Copied to clipboard.')).not.toBeInTheDocument();
  });
  it('copies a distinct phone value exactly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: { ...lead, primary_contact: 'different' } });
    render(<LeadDetail id="opaque" onExpired={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy phone' }));
    await screen.findByText('Copied to clipboard.');
    expect(writeText).toHaveBeenCalledWith(lead.phone_e164);
  });
  it('renders historical values as text and blocks stale updates until refresh', async () => {
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    const update = vi.spyOn(leadsApi, 'status').mockRejectedValue(new ApiError(409, 'REVISION_CONFLICT', 'conflict'));
    const { container } = render(<LeadDetail id="opaque" onExpired={vi.fn()} onBack={vi.fn()} />);
    expect(await screen.findByText(lead.name)).toBeInTheDocument();
    expect(screen.getByText('Phone (legacy)')).toBeInTheDocument();
    expect(screen.getByText('Istanbul')).toBeInTheDocument();
    expect(container.querySelector('script, img')).toBeNull();
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'contacted' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('changed');
    expect(update).toHaveBeenCalledWith('opaque', 'contacted', 3);
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh lead' }));
    await waitFor(() => expect(leadsApi.get).toHaveBeenCalledTimes(2));
  });
  it('keeps the chosen status and conflict after a failed refresh', async () => {
    vi.spyOn(leadsApi, 'get').mockResolvedValueOnce({ data: lead }).mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(leadsApi, 'status').mockRejectedValue(new ApiError(409, 'REVISION_CONFLICT', 'conflict'));
    render(<LeadDetail id="opaque" onExpired={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText(lead.name);
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'contacted' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh lead' }));
    await waitFor(() => expect(leadsApi.get).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Change status')).toHaveValue('contacted');
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh lead' })).toBeInTheDocument();
  });
  it('reconciles a conflict with the newer revision before saving', async () => {
    vi.spyOn(leadsApi, 'get').mockResolvedValueOnce({ data: lead }).mockResolvedValueOnce({ data: { ...lead, status: 'qualified', revision: 4 } });
    const update = vi.spyOn(leadsApi, 'status').mockRejectedValueOnce(new ApiError(409, 'REVISION_CONFLICT', '')).mockResolvedValueOnce({ data: { ...lead, status: 'closed', revision: 5 } });
    render(<LeadDetail id="opaque" onExpired={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText(lead.name);
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'contacted' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh lead' }));
    expect(screen.getByLabelText('Change status')).toHaveValue('contacted');
    expect(leadsApi.get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh lead' }));
    await waitFor(() => expect(screen.getByLabelText('Change status')).toHaveValue('qualified'));
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'closed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    await screen.findByText('Status updated.');
    expect(update).toHaveBeenLastCalledWith('opaque', 'closed', 4);
  });
  it('preserves a selection on ordinary retry and keeps dirty state when access fails', async () => {
    vi.spyOn(leadsApi, 'get').mockResolvedValueOnce({ data: lead })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: lead })
      .mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', ''));
    const dirty = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rtlRender(<QueryClientProvider client={client}><LeadDetail id="opaque" onExpired={vi.fn()} onDirtyChange={dirty} /></QueryClientProvider>);
    await screen.findByText(lead.name);
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'closed' } });
    await act(async () => { await client.invalidateQueries({ queryKey: ['leads'] }); });
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByLabelText('Change status')).toHaveValue('closed'));
    await act(async () => { await client.invalidateQueries({ queryKey: ['leads'] }); });
    await screen.findByText('Access denied. Administrator access is required.');
    expect(dirty).toHaveBeenLastCalledWith(true);
  });
  it('shows a distinct missing-record state and allows retry', async () => {
    vi.spyOn(leadsApi, 'get').mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', '')).mockResolvedValueOnce({ data: lead });
    render(<LeadDetail id="missing" onExpired={vi.fn()} onBack={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Lead not found.');
    expect(screen.queryByText(lead.name)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(lead.name)).toBeInTheDocument();
  });
  it.each(['email', 'phone_call', 'whatsapp', 'telegram'] as const)('shows complete revised %s records without inactive fields', async (method) => {
    const revised = { ...lead, city: null, preferred_contact: method, email: method === 'email' ? 'active@example.com' : null, phone_e164: method === 'email' ? null : '+123', primary_contact: method === 'email' ? 'active@example.com' : '+123', legacy_incomplete: false };
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: revised });
    render(<LeadDetail id="opaque" onExpired={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText(lead.name);
    expect(screen.queryByText('City (historical)')).not.toBeInTheDocument();
    expect(screen.queryByText('This historical record is incomplete.')).not.toBeInTheDocument();
    expect(screen.getAllByText(revised.primary_contact).length).toBeGreaterThan(0);
    expect(screen.queryByText(method === 'email' ? 'Phone' : 'Email')).not.toBeInTheDocument();
  });
  it('prevents changing status while a save is pending', async () => {
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    let resolveSave!: (value: { data: Lead }) => void;
    vi.spyOn(leadsApi, 'status').mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    render(<LeadDetail id="opaque" onExpired={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText(lead.name);
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'contacted' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    expect(screen.getByLabelText('Change status')).toBeDisabled();
    resolveSave({ data: { ...lead, status: 'contacted', revision: 4 } });
    await screen.findByText('Status updated.');
    expect(screen.getByLabelText('Change status')).toBeEnabled();
  });
  it('clears protected content on denied mutation', async () => {
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    vi.spyOn(leadsApi, 'status').mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'denied'));
    render(<LeadDetail id="opaque" onExpired={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText(lead.name);
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'closed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    await screen.findByRole('alert');
    expect(screen.queryByText(lead.name)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(lead.name)).toBeInTheDocument();
  });

  it('calls onExpired when query fails with 401', async () => {
    const onExpired = vi.fn();
    vi.spyOn(leadsApi, 'get').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'expired'));
    render(<LeadDetail id="opaque" onExpired={onExpired} onBack={vi.fn()} />);
    await waitFor(() => expect(onExpired).toHaveBeenCalledOnce());
  });

  it('calls onExpired when status mutation fails with 401', async () => {
    const onExpired = vi.fn();
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    vi.spyOn(leadsApi, 'status').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'expired'));
    render(<LeadDetail id="opaque" onExpired={onExpired} onBack={vi.fn()} />);
    await screen.findByText(lead.name);
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'contacted' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    await waitFor(() => expect(onExpired).toHaveBeenCalledOnce());
  });

  it('displays the incomplete record note when legacy_incomplete is true', async () => {
    const incompleteLead: Lead = { ...lead, legacy_incomplete: true };
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: incompleteLead });
    render(<LeadDetail id="opaque" onExpired={vi.fn()} onBack={vi.fn()} />);
    await screen.findByText(lead.name);
    expect(screen.getByText('This historical record is incomplete.')).toBeInTheDocument();
  });
});
