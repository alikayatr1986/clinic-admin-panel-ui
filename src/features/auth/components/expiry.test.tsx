import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminApp } from '../../../app/AdminApp';
import { authApi } from '../services/auth.service';
import type { AdminShellProps } from '../types/auth.types';
import { NavigationBoundary } from '../../../app/navigation';
import { adminRouteContracts } from '../../../app/route-contract';

vi.mock('../../gallery/components/GalleryCaseEditor', () => ({
  GalleryCaseEditor: ({ onExpired }: Pick<AdminShellProps, 'onExpired'>) => <button onClick={() => { onExpired(); onExpired(); }}>Expire twice</button>,
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('keeps the original return location when expiry is reported twice', async () => {
  window.history.replaceState({}, '', '/admin/gallery/case-1/edit?tab=details');
  vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
  vi.spyOn(authApi, 'login').mockResolvedValue({ data: { session_id: 'id' } });
  const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
  const user = userEvent.setup(); render(<RouterProvider router={router} />);
  await user.click(await screen.findByRole('button', { name: 'Expire twice' }));
  await user.type(await screen.findByLabelText('Username'), 'staff'); await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(window.location.pathname + window.location.search).toBe('/admin/gallery/case-1/edit?tab=details'));
  router.dispose();
});
