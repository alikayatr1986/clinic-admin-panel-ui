import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { authApi } from '../features/auth/services/auth.service';
import { galleryApi } from '../features/gallery/services/gallery.service';
import type { GalleryCase } from '../features/gallery/types/gallery.types';
import { AdminApp } from './AdminApp';
import { NavigationBoundary } from './navigation';
import { adminRouteContracts } from './route-contract';

const item: GalleryCase = { id: 'case-1', revision: 1, published: false, display_order: 0, crop_attested: false, media_ready: false, captions: [], created_at: '', updated_at: '' };
function setup(path: string) {
  window.history.replaceState({}, '', path);
  vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
  vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: item });
  vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: { procedures: [], timeframes: [] } });
  vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [item], total: 1, page: 1, page_size: 12 });
  const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
  render(<RouterProvider router={router} />);
  return router;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/admin/'); });

describe('gallery routes', () => {
  it('opens a saved detail directly and links to its editor', async () => {
    const router = setup('/admin/gallery/case-1');
    expect(await screen.findByRole('heading', { name: 'Case case-1' })).toBeVisible();
    expect(screen.queryByLabelText('Signed consent reference')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Edit case' }));
    expect(await screen.findByLabelText('Signed consent reference')).toBeVisible();
    expect(window.location.pathname).toBe('/admin/gallery/case-1/edit');
    router.dispose();
  });
  it('refreshes saved case data after consent withdrawal', async () => {
    const router = setup('/admin/gallery/case-1');
    vi.mocked(galleryApi.get).mockResolvedValue({ data: { ...item, consent_id: 'consent-1' } });
    vi.spyOn(galleryApi, 'withdrawConsent').mockResolvedValue({ data: { affected_cases: 1 } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw consent' }));
    await waitFor(() => expect(galleryApi.get).toHaveBeenCalledTimes(2));
    expect(galleryApi.withdrawConsent).toHaveBeenCalledWith('consent-1');
    router.dispose();
  });
  it('loads the new case when switching directly between editor URLs', async () => {
    const router = setup('/admin/gallery/case-1/edit');
    vi.mocked(galleryApi.get).mockImplementation(async (id) => ({ data: { ...item, id, signed_consent_id: id } }));
    expect(await screen.findByLabelText('Signed consent reference')).toHaveValue('case-1');
    await router.navigate('/gallery/case-2/edit');
    await waitFor(() => expect(screen.getByLabelText('Signed consent reference')).toHaveValue('case-2'));
    expect(screen.getByText(/Case case-2 · Revision/)).toBeVisible();
    router.dispose();
  });
  it('opens the editor directly and blocks a dirty navigation', async () => {
    const router = setup('/admin/gallery/case-1/edit');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Signed consent reference'), 'new reference');
    await user.click(screen.getByRole('button', { name: 'Back to gallery' }));
    expect(confirm).toHaveBeenCalled();
    expect(window.location.pathname).toBe('/admin/gallery/case-1/edit');
    expect(screen.getByLabelText('Signed consent reference')).toHaveValue('new reference');
    router.dispose();
  });
  it('returns to the filtered list after viewing a case', async () => {
    const router = setup('/admin/gallery?status=published');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('link', { name: 'View case' }));
    expect(await screen.findByRole('heading', { name: 'Case case-1' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Back to gallery' }));
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe('/admin/gallery?status=published'));
    expect(await screen.findByLabelText('Status')).toHaveValue('published');
    router.dispose();
  });
});
