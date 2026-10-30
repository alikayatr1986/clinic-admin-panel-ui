import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { leadsApi } from '../services/leads.service';
import { LeadList } from './LeadList';
import type { Lead, LeadFilters } from '../types/leads.types';

const lead: Lead = { id: 'opaque', name: 'Example', country: 'TR', city: null, procedure: 'nose', email: null, phone_e164: '+123', preferred_contact: 'phone_call', primary_contact: '+123', message: '', lang: 'en', consent_accepted: true, consent_version: 'v1', consented_at: '', status: 'new', revision: 1, created_at: '', updated_at: '', status_actor_id: null, status_changed_at: null, legacy_incomplete: false };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Lead list', () => {
  it('offers historical procedures absent from the current page and retries failed options', async () => {
    vi.spyOn(leadsApi, 'options').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: ['old person@example.com'] });
    const list = vi.spyOn(leadsApi, 'list').mockResolvedValue({data: [lead], meta: {page: 1, page_size: 20, total: 1}});
    render(<LeadList onExpired={vi.fn()} onOpen={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', {name: 'Retry procedure filters'}));
    await screen.findByRole('option', {name: 'old person@example.com'});
    fireEvent.change(screen.getByLabelText('Procedure'), {target: {value: 'old person@example.com'}});
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({procedure: 'old person@example.com'}), expect.arrayContaining(['old person@example.com'])));
  });
  it('filters all methods and recovers from an empty later page', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: ['rhinoplasty', 'nose'] });
    const list = vi.spyOn(leadsApi, 'list').mockImplementation(async (filters: LeadFilters) => ({ data: filters.page === 1 ? [lead] : [], meta: { page: filters.page, page_size: 20, total: filters.page === 1 ? 21 : 1 } }));
    render(<LeadList onExpired={vi.fn()} onOpen={vi.fn()} />);
    await screen.findByText('Example');
    for (const method of ['email', 'phone_call', 'whatsapp', 'telegram', 'phone']) {
      fireEvent.change(screen.getByLabelText('Contact method'), { target: { value: method } });
      await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ preferred_contact: method, page: 1 }), expect.any(Array)));
    }
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'qualified' } });
    fireEvent.change(screen.getByLabelText('Procedure'), { target: { value: 'nose' } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'qualified', procedure: 'nose' }), expect.arrayContaining(['nose'])));
    await screen.findByText('Example');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('This page no longer has leads.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to first page' }));
    await screen.findByText('Example');
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), expect.any(Array));
  });
  it('clears data and triggers expiry or denial on failed requests', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: [] });
    const onExpired = vi.fn();
    vi.spyOn(leadsApi, 'list').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', '')).mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', ''));
    const { unmount } = render(<LeadList onExpired={onExpired} onOpen={vi.fn()} />);
    await waitFor(() => expect(onExpired).toHaveBeenCalledOnce());
    unmount(); render(<LeadList onExpired={onExpired} onOpen={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByText('Example')).not.toBeInTheDocument();
  });
});
