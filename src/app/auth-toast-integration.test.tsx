import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { toast } from 'sonner';
import { ApiError } from '../lib/api';
import { authApi } from '../features/auth/services/auth.service';
import { galleryApi } from '../features/gallery/services/gallery.service';
import { Providers } from './providers';

vi.mock('./router', async () => {
  const { createMemoryRouter } = await import('react-router-dom');
  const { createElement } = await import('react');
  const { NavigationBoundary } = await import('./navigation');
  const { AdminApp } = await import('./AdminApp');
  const { adminRouteContracts } = await import('./route-contract');
  return { router: createMemoryRouter([{ element: createElement(NavigationBoundary), children: [{ element: createElement(AdminApp), children: adminRouteContracts }] }], { basename: '/admin', initialEntries: ['/admin/login'] }) };
});

afterEach(() => { toast.dismiss(); cleanup(); vi.restoreAllMocks(); });

test('keeps confirmed sign-in feedback visible after navigation to the dashboard', async () => {
  vi.spyOn(authApi, 'session').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Expired')).mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
  vi.spyOn(authApi, 'login').mockResolvedValue({ data: { session_id: 'id' } } as never);
  vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], total: 0, page: 1, page_size: 1 });
  render(<Providers />);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Username'), 'staff');
  await user.type(screen.getByLabelText('Password'), 'secret');
  const host = screen.getByRole('region', { name: /notifications/i });
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(screen.getByRole('region', { name: /notifications/i })).toBe(host);
  expect(await screen.findByText('Signed in successfully.')).toBeVisible();
});
