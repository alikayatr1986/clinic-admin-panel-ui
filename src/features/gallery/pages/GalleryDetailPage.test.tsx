import { toast } from 'sonner';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api';
import { AdminNavigationContext } from '../../../lib/admin-navigation';
import { galleryApi } from '../services/gallery.service';
import { GalleryDetailPage } from './GalleryDetailPage';
import type { GalleryCase } from '../types/gallery.types';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockCase: GalleryCase = {
  id: 'case-test-1',
  revision: 3,
  published: true,
  display_order: 5,
  procedure_tag: 'rhinoplasty',
  timeframe_badge: '3-months',
  before_position: 'left',
  crop_attested: true,
  consent_id: 'consent-99',
  signed_consent_id: 'signed-ref-99',
  media_ready: true,
  url: '/media/display.webp',
  thumbnail_url: '/media/thumb.webp',
  captions: [
    { lang: 'en', alt_text: 'Rhinoplasty result', caption: 'Post surgery', approval: 'approved' },
    { lang: 'ar', alt_text: 'نتيجة تجميل الأنف', caption: 'بعد الجراحة', approval: 'approved' },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GalleryDetailPage', () => {
  it('renders case details with Badge, Card and action buttons', async () => {
    vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: mockCase });
    const onEdit = vi.fn();
    const onBack = vi.fn();

    render(
      <GalleryDetailPage
        caseID="case-test-1"
        onExpired={vi.fn()}
        onEdit={onEdit}
        onBack={onBack}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole('heading', { name: 'Case case-test-1' })).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Revision 3')).toBeInTheDocument();
    expect(screen.getByText(/Procedure: rhinoplasty/)).toBeInTheDocument();
    expect(screen.getByText(/Timeframe: 3-months/)).toBeInTheDocument();
    expect(screen.getByText('Rhinoplasty result')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Back to gallery' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit case' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete case' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw consent' })).toBeInTheDocument();
  });

  it('prompts confirmation and deletes case', async () => {
    vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: mockCase });
    const removeSpy = vi.spyOn(galleryApi, 'remove').mockResolvedValue({ data: { deleted: true } });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(
      <GalleryDetailPage
        caseID="case-test-1"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onBack={onBack}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Case case-test-1' });
    await user.click(screen.getByRole('button', { name: 'Delete case' }));

    expect(confirmSpy).toHaveBeenCalledWith('Delete this case?');
    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith('case-test-1', 3);
      expect(onBack).toHaveBeenCalled();
    });
  });

  it('handles 404 Case not found error', async () => {
    vi.spyOn(galleryApi, 'get').mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Missing'));

    render(
      <GalleryDetailPage
        caseID="missing-id"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onBack={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Case not found.');
  });

  it('does not delete case if confirmation is cancelled', async () => {
    vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: mockCase });
    const removeSpy = vi.spyOn(galleryApi, 'remove');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(
      <GalleryDetailPage
        caseID="case-test-1"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onBack={onBack}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Case case-test-1' });
    await user.click(screen.getByRole('button', { name: 'Delete case' }));

    expect(confirmSpy).toHaveBeenCalledWith('Delete this case?');
    expect(removeSpy).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('prompts confirmation and withdraws consent', async () => {
    const getSpy = vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: mockCase });
    const withdrawSpy = vi.spyOn(galleryApi, 'withdrawConsent').mockResolvedValue({ data: { affected_cases: 1 } });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <GalleryDetailPage
        caseID="case-test-1"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onBack={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Case case-test-1' });
    await user.click(screen.getByRole('button', { name: 'Withdraw consent' }));

    expect(confirmSpy).toHaveBeenCalledWith('Withdraw consent for all associated cases?');
    await waitFor(() => {
      expect(withdrawSpy).toHaveBeenCalledWith('consent-99');
      expect(getSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('reports a failed refresh after consent was withdrawn', async () => {
    vi.spyOn(galleryApi, 'get').mockResolvedValueOnce({ data: mockCase }).mockRejectedValueOnce(new ApiError(500, 'FAILURE', 'Refresh failed'));
    vi.spyOn(galleryApi, 'withdrawConsent').mockResolvedValue({ data: { affected_cases: 1 } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const errorToast = vi.spyOn(toast, 'error');
    render(<GalleryDetailPage caseID="case-test-1" onExpired={vi.fn()} onEdit={vi.fn()} onBack={vi.fn()} />, { wrapper: createWrapper() });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Withdraw consent' }));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith(expect.stringContaining('Consent was withdrawn, but the case could not be refreshed')));
  });

  it('does not withdraw consent if confirmation is cancelled', async () => {
    vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: mockCase });
    const withdrawSpy = vi.spyOn(galleryApi, 'withdrawConsent');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();

    render(
      <GalleryDetailPage
        caseID="case-test-1"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onBack={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Case case-test-1' });
    await user.click(screen.getByRole('button', { name: 'Withdraw consent' }));

    expect(confirmSpy).toHaveBeenCalledWith('Withdraw consent for all associated cases?');
    expect(withdrawSpy).not.toHaveBeenCalled();
  });

  it('displays error text when delete fails', async () => {
    vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: mockCase });
    vi.spyOn(galleryApi, 'remove').mockRejectedValue(new Error('Deletion blocked by database'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <GalleryDetailPage
        caseID="case-test-1"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onBack={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Case case-test-1' });
    await user.click(screen.getByRole('button', { name: 'Delete case' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Deletion blocked by database');
  });

  it('sanitizes valid returnTo URL in back link (VG-1)', async () => {
    vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: mockCase });
    render(
      <AdminNavigationContext.Provider
        value={{
          routeId: 'gallery-detail',
          pathname: '/admin/gallery/case-test-1',
          search: `?returnTo=${encodeURIComponent('/admin/gallery?status=published&page=2')}`,
          navigate: vi.fn(),
          registerBlocker: vi.fn(),
        }}
      >
        <GalleryDetailPage
          caseID="case-test-1"
          onExpired={vi.fn()}
          onEdit={vi.fn()}
          onBack={vi.fn()}
        />
      </AdminNavigationContext.Provider>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole('heading', { name: 'Case case-test-1' })).toBeInTheDocument();
    const backLink = screen.getByRole('link', { name: 'Back to gallery' });
    expect(backLink).toHaveAttribute('href', '/admin/gallery?status=published&page=2');
  });

  it('sanitizes invalid returnTo URL to default /admin/gallery (VG-1)', async () => {
    vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: mockCase });
    render(
      <AdminNavigationContext.Provider
        value={{
          routeId: 'gallery-detail',
          pathname: '/admin/gallery/case-test-1',
          search: '?returnTo=https://malicious.com',
          navigate: vi.fn(),
          registerBlocker: vi.fn(),
        }}
      >
        <GalleryDetailPage
          caseID="case-test-1"
          onExpired={vi.fn()}
          onEdit={vi.fn()}
          onBack={vi.fn()}
        />
      </AdminNavigationContext.Provider>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole('heading', { name: 'Case case-test-1' })).toBeInTheDocument();
    const backLink = screen.getByRole('link', { name: 'Back to gallery' });
    expect(backLink).toHaveAttribute('href', '/admin/gallery');
  });

  it('calls onExpired when query fails with 401 (VG-5)', async () => {
    vi.spyOn(galleryApi, 'get').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Session expired'));
    const onExpired = vi.fn();
    render(
      <GalleryDetailPage
        caseID="case-test-1"
        onExpired={onExpired}
        onEdit={vi.fn()}
        onBack={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(onExpired).toHaveBeenCalledOnce();
    });
  });

  it('renders error card with retry button and back link on load error', async () => {
    const getSpy = vi.spyOn(galleryApi, 'get')
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Server error'))
      .mockResolvedValueOnce({ data: mockCase });
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(
      <GalleryDetailPage
        caseID="case-test-1"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onBack={onBack}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load case.');
    expect(screen.getByRole('link', { name: 'Back to gallery' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Case case-test-1' })).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it('renders fallback when clinical image fails to load and shows orientation overlay', async () => {
    vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: mockCase });
    render(
      <GalleryDetailPage
        caseID="case-test-1"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onBack={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    const img = await screen.findByRole('img', { name: 'Rhinoplasty result' });
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();

    fireEvent.error(img);
    expect(await screen.findByText('Image unavailable')).toBeInTheDocument();
  });
});
