import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { NavigationBoundary } from '../../../../app/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render as testingRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../lib/api';
import { galleryApi } from '../../services/gallery.service';
import type { GalleryCase, GalleryOptions } from '../../types/gallery.types';
import { GalleryCaseList } from './GalleryCaseList';

function render(element: React.ReactElement) {
  if (!window.location.pathname.startsWith('/admin')) window.history.replaceState({}, '', '/admin/gallery');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ path: '*', element }] }], { basename: '/admin' });
  return testingRender(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

const options: GalleryOptions = {
  procedures: [{ code: 'synthetic-procedure', en: 'Synthetic procedure', ar: 'إجراء تجريبي' }],
  timeframes: [{ code: 'synthetic-time', en: 'Synthetic timeframe', ar: 'فترة تجريبية' }],
};

const caseItem: GalleryCase = {
  id: 'case-1', revision: 2, published: true, display_order: 7,
  procedure_tag: 'synthetic-procedure', timeframe_badge: 'synthetic-time',
  before_position: 'right', crop_attested: true, media_ready: true,
  thumbnail_url: '/admin/api/gallery/case-1/media/thumbnail', width: 1200, height: 800,
  captions: [
    { lang: 'en', alt_text: 'A combined clinical comparison', caption: '', approval: 'approved' },
    { lang: 'ar', alt_text: '', caption: '', approval: 'draft' },
  ],
  created_at: '2026-10-23T00:00:00Z', updated_at: '2026-10-24T12:00:00Z',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/admin/gallery');
});

function setupList(total = 1) {
  vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: options });
  return vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: total ? [caseItem] : [], page: 1, page_size: 12, total });
}

describe('staff gallery case browser', () => {
  it('preserves active filters in the case link for modified clicks', async () => {
    window.history.replaceState({}, '', '/admin/gallery?status=published&procedure_tag=synthetic-procedure&page=2');
    setupList(24);
    const onEdit = vi.fn();
    render(<GalleryCaseList onExpired={vi.fn()} onEdit={onEdit} />);
    const link = await screen.findByRole('link', { name: 'View case' });
    const target = new URL(link.getAttribute('href')!, window.location.origin);
    expect(target.pathname).toBe('/admin/gallery/case-1');
    expect(target.searchParams.get('returnTo')).toBe('/admin/gallery?status=published&procedure_tag=synthetic-procedure&page=2');
    fireEvent.click(link, { ctrlKey: true, button: 0 });
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('renders the intact combined thumbnail, physical labels, review fields and server order', async () => {
    setupList();
    render(<GalleryCaseList onExpired={vi.fn()} />);
    const card = await screen.findByRole('heading', { name: 'Case case-1' });
    const row = card.closest('li')!;
    expect(within(row).getByRole('img', { name: 'A combined clinical comparison' })).toHaveAttribute('src', caseItem.thumbnail_url);
    expect(within(row).getByText('After')).toBeInTheDocument();
    expect(within(row).getByText('Before')).toBeInTheDocument();
    expect(within(row).getByText('Synthetic procedure')).toBeInTheDocument();
    expect(within(row).getByText('Synthetic timeframe')).toBeInTheDocument();
    expect(within(row).getByText('EN: approved · AR: draft')).toBeInTheDocument();
    expect(within(row).getByText('7')).toBeInTheDocument();
    expect(within(row).getByText('Published')).toBeInTheDocument();
    expect(within(row).getByText(/10\/24\/2026/)).toBeInTheDocument();
  });

  it('keeps filters in the URL and resets pagination on filter changes', async () => {
    window.history.replaceState({}, '', '/admin/gallery?page=2');
    const list = setupList(26);
    const user = userEvent.setup();
    render(<GalleryCaseList onExpired={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Case case-1' });
    expect(list).toHaveBeenCalledWith({ page: 2, page_size: 12 }, expect.any(AbortSignal));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(window.location.search).toBe('?page=3'));
    await user.selectOptions(screen.getByLabelText('Procedure'), 'synthetic-procedure');
    await waitFor(() => expect(window.location.search).toBe('?procedure_tag=synthetic-procedure'));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ page: 1, page_size: 12, procedure_tag: 'synthetic-procedure' }, expect.any(AbortSignal)));
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(window.location.search).toBe('');
  });

  it('restores status and timeframe filters from a direct link', async () => {
    window.history.replaceState({}, '', '/admin/gallery?status=published&timeframe_badge=synthetic-time&page=2');
    const list = setupList(25);
    render(<GalleryCaseList onExpired={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Case case-1' });
    expect(screen.getByLabelText('Status')).toHaveValue('published');
    expect(screen.getByLabelText('Timeframe')).toHaveValue('synthetic-time');
    expect(list).toHaveBeenCalledWith({ page: 2, page_size: 12, status: 'published', timeframe_badge: 'synthetic-time' }, expect.any(AbortSignal));
  });

  it('renders retired timeframe labels with (Retired) indicator in filter and card', async () => {
    const retiredOptions: GalleryOptions = {
      procedures: [{ code: 'proc-1', en: 'Procedure 1', ar: 'إجراء 1' }],
      timeframes: [
        { code: 'tf-active', en: '1 Month', ar: 'شهر واحد', status: 'active', retired: false },
        { code: 'tf-old', en: 'Old 3 Months', ar: '3 أشهر قديمة', status: 'retired', retired: true },
      ],
    };
    const historicalCase: GalleryCase = {
      ...caseItem,
      id: 'case-retired',
      procedure_tag: 'proc-1',
      timeframe_badge: 'tf-old',
    };
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: retiredOptions });
    vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [historicalCase], page: 1, page_size: 12, total: 1 });

    render(<GalleryCaseList onExpired={vi.fn()} />);

    // Check filter option has (Retired)
    const timeframeSelect = await screen.findByLabelText('Timeframe');
    expect(within(timeframeSelect).getByText('Old 3 Months (Retired)')).toBeInTheDocument();
    expect(within(timeframeSelect).getByText('1 Month')).toBeInTheDocument();

    // Check case card displays (Retired)
    const card = await screen.findByRole('heading', { name: 'Case case-retired' });
    const row = card.closest('li')!;
    expect(within(row).getByText('Old 3 Months (Retired)')).toBeInTheDocument();
  });

  it('shows a reset state for invalid filter codes without sending a list request', async () => {
    window.history.replaceState({}, '', '/admin/gallery?procedure_tag=unknown');
    const list = setupList();
    const user = userEvent.setup();
    render(<GalleryCaseList onExpired={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid filters');
    expect(list).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(await screen.findByRole('heading', { name: 'Case case-1' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('renders an empty result without pagination data', async () => {
    setupList(0);
    render(<GalleryCaseList onExpired={vi.fn()} />);
    expect(await screen.findByText('No gallery cases match these filters.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Gallery pages' })).not.toBeInTheDocument();
  });

  it('shows an access error when gallery options are forbidden', async () => {
    vi.spyOn(galleryApi, 'options').mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Forbidden'));
    const list = vi.spyOn(galleryApi, 'list');
    render(<GalleryCaseList onExpired={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(list).not.toHaveBeenCalled();
  });

  it('clears previous rows when a later request fails', async () => {
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: options });
    const list = vi.spyOn(galleryApi, 'list').mockResolvedValueOnce({ data: [caseItem], page: 1, page_size: 12, total: 1 })
      .mockRejectedValueOnce(new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Gallery unavailable'));
    const user = userEvent.setup();
    render(<GalleryCaseList onExpired={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Case case-1' });
    await user.selectOptions(screen.getByLabelText('Status'), 'published');
    expect(await screen.findByRole('alert')).toHaveTextContent('Gallery unavailable');
    expect(screen.queryByRole('heading', { name: 'Case case-1' })).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('hands a 401 response to the auth shell', async () => {
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: options });
    vi.spyOn(galleryApi, 'list').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Expired'));
    const expired = vi.fn();
    render(<GalleryCaseList onExpired={expired} />);
    await waitFor(() => expect(expired).toHaveBeenCalledOnce());
    expect(screen.queryByRole('heading', { name: 'Case case-1' })).not.toBeInTheDocument();
  });

  it('shows out of bounds page warning and resets to first page', async () => {
    window.history.replaceState({}, '', '/admin/gallery?page=99');
    setupList(12);
    const user = userEvent.setup();
    render(<GalleryCaseList onExpired={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('This page no longer has cases.');
    await user.click(screen.getByRole('button', { name: 'Go to first page' }));
    expect(window.location.search).toBe('');
  });

  it('displays fallback when thumbnail fails to load', async () => {
    setupList();
    render(<GalleryCaseList onExpired={vi.fn()} />);
    const img = await screen.findByRole('img', { name: 'A combined clinical comparison' });
    fireEvent.error(img);
    expect(await screen.findByText('Image unavailable')).toBeInTheDocument();
  });

  it('disables Previous on page 1 and enables it on page 2, navigating back on click (VG-2)', async () => {
    window.history.replaceState({}, '', '/admin/gallery?page=2');
    const list = setupList(24);
    const user = userEvent.setup();
    render(<GalleryCaseList onExpired={vi.fn()} />);

    await screen.findByRole('heading', { name: 'Case case-1' });
    const prevButton = screen.getByRole('button', { name: 'Previous' });
    expect(prevButton).toBeEnabled();

    await user.click(prevButton);
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(list).toHaveBeenLastCalledWith({ page: 1, page_size: 12 }, expect.any(AbortSignal));
  });

  it('disables Previous button on page 1 boundary (VG-2)', async () => {
    setupList(24);
    render(<GalleryCaseList onExpired={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Case case-1' });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('renders before/after orientation overlays according to before_position (VG-3)', async () => {
    const leftCase: GalleryCase = { ...caseItem, id: 'case-left', before_position: 'left' };
    const rightCase: GalleryCase = { ...caseItem, id: 'case-right', before_position: 'right' };
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: options });
    vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [leftCase, rightCase], page: 1, page_size: 12, total: 2 });

    render(<GalleryCaseList onExpired={vi.fn()} />);

    const leftHeading = await screen.findByRole('heading', { name: 'Case case-left' });
    const leftCard = leftHeading.closest('li')!;
    const leftOverlay = leftCard.querySelector('.absolute.inset-x-0.bottom-0')!;
    expect(leftOverlay.children[0]).toHaveTextContent('Before');
    expect(leftOverlay.children[1]).toHaveTextContent('After');

    const rightHeading = await screen.findByRole('heading', { name: 'Case case-right' });
    const rightCard = rightHeading.closest('li')!;
    const rightOverlay = rightCard.querySelector('.absolute.inset-x-0.bottom-0')!;
    expect(rightOverlay.children[0]).toHaveTextContent('After');
    expect(rightOverlay.children[1]).toHaveTextContent('Before');
  });

  it('displays rejected filters message when server responds with 400 (VG-4)', async () => {
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: options });
    vi.spyOn(galleryApi, 'list').mockRejectedValue(new ApiError(400, 'BAD_REQUEST', 'Rejected'));
    render(<GalleryCaseList onExpired={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('The gallery filters were rejected. Clear them and try again.');
  });

  it('preserves active filters in Create case returnTo link for modified clicks', async () => {
    window.history.replaceState({}, '', '/admin/gallery?status=published');
    setupList();
    render(<GalleryCaseList onExpired={vi.fn()} onCreate={vi.fn()} />);
    const link = await screen.findByRole('link', { name: 'Create case' });
    expect(link.getAttribute('href')).toBe('/admin/gallery/new?returnTo=%2Fadmin%2Fgallery%3Fstatus%3Dpublished');
  });
});
