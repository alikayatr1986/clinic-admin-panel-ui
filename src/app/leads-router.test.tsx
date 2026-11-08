import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminApp } from './AdminApp';
import { authApi } from '../features/auth/services/auth.service';
import { clearLeadFilters } from '../features/leads/hooks/leadFilters';
import { leadsApi } from '../features/leads/services/leads.service';
import type { Lead, LeadFilters } from '../features/leads/types/leads.types';
import { queryClient } from '../lib/query-client';
import { NavigationBoundary } from './navigation';
import { adminRouteContracts } from './route-contract';

const lead: Lead = { id: 'lead-1', name: 'Example patient', country: 'TR', city: null, procedure: 'nose', email: null, phone_e164: null, preferred_contact: 'email', primary_contact: 'person@example.com', message: '', lang: 'en', consent_accepted: true, consent_version: 'v1', consented_at: '', status: 'new', revision: 1, created_at: '', updated_at: '', status_actor_id: null, status_changed_at: null, legacy_incomplete: false };
function mount(path: string, role: 'admin' | 'staff') {
  window.history.replaceState({}, '', path);
  vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: role, role, expires_at: '2030-01-01' } });
  const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
  render(<RouterProvider router={router} />);
  return router;
}
afterEach(() => { cleanup(); queryClient.clear(); clearLeadFilters(); vi.restoreAllMocks(); });

describe('protected lead routes', () => {
  it.each(['/admin/leads', '/admin/leads/lead-1'])('denies staff direct access to %s before requesting leads', async (path) => {
    const options = vi.spyOn(leadsApi, 'options');
    const list = vi.spyOn(leadsApi, 'list');
    const get = vi.spyOn(leadsApi, 'get');
    const router = mount(path, 'staff');
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(options).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled(); expect(get).not.toHaveBeenCalled();
    router.dispose();
  });

  it('opens the direct detail URL and saves the selected status with its revision', async () => {
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    const status = vi.spyOn(leadsApi, 'status').mockResolvedValue({ data: { ...lead, status: 'contacted', revision: 2 } });
    const router = mount('/admin/leads/lead-1', 'admin');
    const user = userEvent.setup();
    await screen.findByText('Example patient');
    await user.selectOptions(screen.getByLabelText('Change status'), 'contacted');
    await user.click(screen.getByRole('button', { name: 'Update status' }));
    expect(await screen.findByText('Status updated.')).toBeInTheDocument();
    expect(status).toHaveBeenCalledWith('lead-1', 'contacted', 1);
    expect(screen.getByText('contacted · Revision 2')).toBeInTheDocument();
    router.dispose();
  });

  it('restores private filters when navigating from list to detail and back', async () => {
    vi.spyOn(leadsApi, 'options').mockResolvedValue({ data: ['nose'] });
    const list = vi.spyOn(leadsApi, 'list').mockImplementation(async (filters: LeadFilters) => ({ data: [lead], meta: { page: filters.page, page_size: 20, total: 1 } }));
    vi.spyOn(leadsApi, 'get').mockResolvedValue({ data: lead });
    const router = mount('/admin/leads', 'admin');
    const user = userEvent.setup();
    await screen.findByText('Example patient');
    await user.selectOptions(screen.getByLabelText('Status'), 'qualified');
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'qualified', page: 1 }), expect.any(Array), expect.any(AbortSignal)));
    expect(window.location.search).toBe('');
    await user.click(await screen.findByRole('link', { name: 'View details for Example patient' }));
    const dialog = await screen.findByRole('dialog', { name: 'Lead details' });
    expect(await within(dialog).findByText('Example patient')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(window.location.pathname).toBe('/admin/leads'));
    expect(await screen.findByLabelText('Status')).toHaveValue('qualified');
    expect(window.location.search).toBe('');
    router.dispose();
  });
});
