import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api';
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
});
