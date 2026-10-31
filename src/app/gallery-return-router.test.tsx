import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { authApi } from '../features/auth/services/auth.service';
import { galleryApi } from '../features/gallery/services/gallery.service';
import type { GalleryCase } from '../features/gallery/types/gallery.types';
import { AdminApp } from './AdminApp';
import { NavigationBoundary } from './navigation';
import { adminRouteContracts } from './route-contract';

const item: GalleryCase = { id: 'case-1', revision: 1, published: false, display_order: 0, crop_attested: false, media_ready: false, captions: [], created_at: '', updated_at: '' };
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/admin/'); });

it('preserves the filtered return location through edit and reload', async () => {
  vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
  vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: item });
  vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: { procedures: [], timeframes: [] } });
  vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [item], total: 1, page: 1, page_size: 12 });
  window.history.replaceState({}, '', '/admin/gallery/case-1?returnTo=%2Fadmin%2Fgallery%3Fstatus%3Dpublished');
  const makeRouter = () => createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
  let router = makeRouter();
  const first = render(<RouterProvider router={router} />);
  await userEvent.click(await screen.findByRole('link', { name: 'Edit case' }));
  await screen.findByLabelText('Signed consent reference');
  expect(new URLSearchParams(window.location.search).get('returnTo')).toBe('/admin/gallery?status=published');
  first.unmount(); router.dispose();
  router = makeRouter();
  render(<RouterProvider router={router} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Back to gallery' }));
  await waitFor(() => expect(window.location.pathname + window.location.search).toBe('/admin/gallery?status=published'));
  router.dispose();
});
