import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { queryClient } from '../lib/query-client';
import { authApi } from '../features/auth/services/auth.service';
import { galleryApi } from '../features/gallery/services/gallery.service';
import type { GalleryCase } from '../features/gallery/types/gallery.types';
import { AdminApp } from './AdminApp';
import { NavigationBoundary } from './navigation';
import { adminRouteContracts } from './route-contract';
const item: GalleryCase = { id: 'case-1', revision: 7, published: false, display_order: 0, crop_attested: false, media_ready: false, captions: [], created_at: '', updated_at: '' };
function setup(path: string) {
  window.history.replaceState({}, '', path);
  vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
  vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: { procedures: [], timeframes: [] } });
  vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], total: 0, page: 1, page_size: 12 });
  const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
  render(<RouterProvider router={router} />); return router;
}
afterEach(() => { cleanup(); queryClient.clear(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/admin/'); });
it('opens the create route and creates a draft', async () => {
  vi.spyOn(galleryApi, 'create').mockResolvedValue({ data: item }); vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: item });
  const router = setup('/admin/gallery/new'); await userEvent.click(await screen.findByRole('button', { name: 'Create draft' }));
  await waitFor(() => expect(window.location.pathname).toBe('/admin/gallery/case-1/edit')); expect(galleryApi.create).toHaveBeenCalledOnce(); router.dispose();
});
it.each([[403, 'Access denied.'], [404, 'Case not found.']])('shows detail error for %s', async (status, message) => {
  vi.spyOn(galleryApi, 'get').mockRejectedValue(new ApiError(status, 'ERROR', 'failure'));
  const router = setup('/admin/gallery/case-1'); expect(await screen.findByRole('alert')).toHaveTextContent(message); router.dispose();
});
it('confirms deletion with the saved revision', async () => {
  vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: item }); vi.spyOn(galleryApi, 'remove').mockResolvedValue({ data: { deleted: true } });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false); const router = setup('/admin/gallery/case-1'); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Delete case' })); expect(galleryApi.remove).not.toHaveBeenCalled();
  confirm.mockReturnValue(true); await user.click(screen.getByRole('button', { name: 'Delete case' }));
  await waitFor(() => expect(window.location.pathname).toBe('/admin/gallery')); expect(galleryApi.remove).toHaveBeenCalledWith('case-1', 7); router.dispose();
});
