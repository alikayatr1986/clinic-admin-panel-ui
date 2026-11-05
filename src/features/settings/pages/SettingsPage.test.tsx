import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { settingsApi } from '../services/settings.service';
import { SettingsPage } from './SettingsPage';
import type { TimeframeSetting } from '../types/settings.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockTimeframes: TimeframeSetting[] = [
  {
    id: 'tf-1',
    code: '0-3-months',
    name_en: '0–3 Months',
    name_ar: '٠-٣ أشهر',
    min_months: 0,
    max_months: 3,
    display_order: 1,
    status: 'draft',
    referenced_cases_count: 0,
    created_at: '2026-11-05T00:00:00Z',
    updated_at: '2026-11-05T00:00:00Z',
  },
];

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('SettingsPage', () => {
  it('renders settings interface for admin role with add button and mutation capabilities', async () => {
    vi.spyOn(settingsApi, 'listTimeframes').mockResolvedValue({
      data: mockTimeframes,
    });

    renderWithClient(<SettingsPage role="admin" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Clinic Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Timeframe' })).toBeInTheDocument();
    expect(screen.queryByText(/Staff Read-Only Mode/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('0-3-months')).toBeInTheDocument();
    });

    // Clicking Add Timeframe opens the form dialog
    fireEvent.click(screen.getByRole('button', { name: 'Add Timeframe' }));
    expect(screen.getByRole('dialog', { name: 'Create Timeframe Option' })).toBeInTheDocument();
  });

  it('renders read-only banner and hides add button for staff role', async () => {
    vi.spyOn(settingsApi, 'listTimeframes').mockResolvedValue({
      data: mockTimeframes,
    });

    renderWithClient(<SettingsPage role="staff" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Clinic Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Timeframe' })).not.toBeInTheDocument();
    expect(screen.getByText(/Staff Read-Only Mode/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('0-3-months')).toBeInTheDocument();
    });

    // Action buttons are disabled for staff
    const editBtn = screen.getByRole('button', { name: 'Edit' });
    expect(editBtn).toBeDisabled();
  });

  it('triggers onExpired callback when session expires (401)', async () => {
    const onExpired = vi.fn();
    vi.spyOn(settingsApi, 'listTimeframes').mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Session expired.')
    );

    renderWithClient(<SettingsPage role="admin" onExpired={onExpired} />);

    await waitFor(() => {
      expect(onExpired).toHaveBeenCalledTimes(1);
    });
  });
});

