import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminShell } from './AdminShell';
import type { AdminSession } from '../../features/auth/types/auth.types';
import { ApiError } from '../../lib/api';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockSession: AdminSession = {
  username: 'testadmin',
  role: 'admin',
  expires_at: '2030-01-01',
};

describe('AdminShell component', () => {
  it('renders brand, user session info, skip-link, and opens mobile drawer on toggle', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onLogout = vi.fn();

    render(
      <AdminShell
        path="/admin/"
        session={mockSession}
        routeId="dashboard"
        onNavigate={onNavigate}
        onLogout={onLogout} onExpired={vi.fn()}
      >
        <p>Dashboard Content</p>
      </AdminShell>
    );

    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    expect(screen.getByText(/Signed in as testadmin/)).toBeInTheDocument();
    expect(screen.getByText('admin')).toHaveAttribute('data-slot', 'badge');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();

    const mobileMenuButton = screen.getByRole('button', { name: 'Open navigation menu' });
    expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog', { name: 'Navigation drawer' })).not.toBeInTheDocument();

    await user.click(mobileMenuButton);
    expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Navigation drawer' })).toBeInTheDocument();
  });

  it('displays logout error and clears it when view or path changes', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn().mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Logout failed due to network'));

    const { rerender } = render(
      <AdminShell
        path="/admin/"
        session={mockSession}
        routeId="dashboard"
        onNavigate={vi.fn()}
        onLogout={onLogout} onExpired={vi.fn()}
      >
        <p>Dashboard Content</p>
      </AdminShell>
    );

    const signOutBtn = screen.getByRole('button', { name: 'Sign out' });
    await user.click(signOutBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Logout failed due to network');

    // Route change clears logout error
    rerender(
      <AdminShell
        path="/admin/blogs"
        session={mockSession}
        routeId="blog-list"
        onNavigate={vi.fn()}
        onLogout={onLogout} onExpired={vi.fn()}
      >
        <p>Blogs Content</p>
      </AdminShell>
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables sign-out button and displays pending text while logout is unresolved', async () => {
    const user = userEvent.setup();
    let resolveLogout!: () => void;
    const pendingLogout = new Promise<void>((resolve) => {
      resolveLogout = resolve;
    });
    const onLogout = vi.fn().mockReturnValue(pendingLogout);

    render(
      <AdminShell
        path="/admin/"
        session={mockSession}
        routeId="dashboard"
        onNavigate={vi.fn()}
        onLogout={onLogout}
        onExpired={vi.fn()}
      >
        <p>Dashboard Content</p>
      </AdminShell>
    );

    const signOutBtn = screen.getByRole('button', { name: 'Sign out' });
    expect(signOutBtn).toHaveAttribute('type', 'button');
    await user.click(signOutBtn);

    expect(onLogout).toHaveBeenCalledOnce();
    const pendingBtn = screen.getByRole('button', { name: 'Signing out…' });
    expect(pendingBtn).toBeDisabled();

    resolveLogout();
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign out' })).not.toBeDisabled();
    });
  });

  it('renders Settings page title when routeId is settings', () => {
    render(
      <AdminShell
        path="/admin/settings"
        session={mockSession}
        routeId="settings"
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
        onExpired={vi.fn()}
      >
        <p>Settings Content</p>
      </AdminShell>
    );

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });
});
