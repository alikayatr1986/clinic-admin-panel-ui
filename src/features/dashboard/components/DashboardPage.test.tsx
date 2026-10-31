import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import { galleryApi } from '../../gallery/services/gallery.service';
import { ApiError } from '../../../lib/api';

describe('DashboardPage component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it('renders loading state initially then displays gallery case count', async () => {
    vi.spyOn(galleryApi, 'list').mockResolvedValueOnce({
      data: [],
      total: 12,
      page: 1,
      page_size: 1,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage onExpired={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading gallery…');
    expect(await screen.findByText('12 gallery cases available.')).toBeInTheDocument();
  });

  it('displays empty state when total is zero', async () => {
    vi.spyOn(galleryApi, 'list').mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      page_size: 1,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage onExpired={vi.fn()} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('No gallery cases yet.')).toBeInTheDocument();
  });

  it('displays error and recovers when retry button is clicked', async () => {
    const user = userEvent.setup();
    const listSpy = vi
      .spyOn(galleryApi, 'list')
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Database unavailable'))
      .mockResolvedValueOnce({
        data: [],
        total: 3,
        page: 1,
        page_size: 1,
      });

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage onExpired={vi.fn()} />
      </QueryClientProvider>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(await screen.findByText('3 gallery cases available.')).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });

  it('calls onExpired when query fails with 401', async () => {
    const onExpired = vi.fn();
    vi.spyOn(galleryApi, 'list').mockRejectedValueOnce(
      new ApiError(401, 'UNAUTHORIZED', 'Session expired')
    );

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage onExpired={onExpired} />
      </QueryClientProvider>
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onExpired).toHaveBeenCalledOnce();
  });
});

