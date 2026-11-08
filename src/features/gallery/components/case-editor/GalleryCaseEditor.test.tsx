import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render as testingRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../lib/api';
import { galleryApi } from '../../services/gallery.service';
import type { GalleryCase, GalleryOptions, GalleryUploadResult } from '../../types/gallery.types';
import { GalleryCaseEditor } from './GalleryCaseEditor';

function render(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return testingRender(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

const options: GalleryOptions = {
  procedures: [{ code: 'synthetic-procedure', en: 'Synthetic procedure', ar: 'إجراء تجريبي' }],
  timeframes: [{ code: 'synthetic-time', en: 'Synthetic timeframe', ar: 'فترة تجريبية' }],
};

const emptyCase: GalleryCase = {
  id: 'case-1', revision: 1, published: false, display_order: 0,
  crop_attested: false, media_ready: false, captions: [],
  created_at: '2026-10-24T00:00:00Z', updated_at: '2026-10-24T00:00:00Z',
};

const readyCase: GalleryCase = {
  ...emptyCase, revision: 4, media_ready: true, signed_consent_id: 'signed-reference',
  procedure_tag: 'synthetic-procedure', timeframe_badge: 'synthetic-time',
  before_position: 'left', crop_attested: true,
  url: '/admin/api/gallery/case-1/media/display', thumbnail_url: '/admin/api/gallery/case-1/media/thumbnail',
  captions: [
    { lang: 'en', alt_text: 'English combined image', caption: 'English caption', approval: 'approved' },
    { lang: 'ar', alt_text: 'صورة قبل وبعد', caption: 'وصف عربي', approval: 'approved' },
  ],
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup(item: GalleryCase = emptyCase) {
  vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: options });
  vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: item });
  const onNavigate = vi.fn();
  render(<GalleryCaseEditor caseID={item.id} onExpired={vi.fn()} onNavigate={onNavigate} registerBlocker={vi.fn()} />);
  return onNavigate;
}

describe('gallery case editor', () => {
  it('recovers from an initial case load failure after retry', async () => {
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: options });
    vi.spyOn(galleryApi, 'get').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: emptyCase });
    render(<GalleryCaseEditor caseID="case-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('Signed consent reference')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('creates a private draft before opening the editor', async () => {
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: options });
    const create = vi.spyOn(galleryApi, 'create').mockResolvedValue({ data: emptyCase });
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<GalleryCaseEditor caseID="new" onExpired={vi.fn()} onNavigate={onNavigate} registerBlocker={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Create draft' }));
    expect(create).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith('editor', { id: 'case-1', replace: true, bypassBlock: true });
  });

  it('preserves form values and shows backend validation fields after a failed save', async () => {
    setup();
    const edit = vi.spyOn(galleryApi, 'edit').mockRejectedValue(
      new ApiError(400, 'VALIDATION', 'Invalid case', {
        'captions.en.alt_text': 'Description required.',
        'captions.en.caption': 'Caption too long.',
      })
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Signed consent reference'), 'signed-reference');
    await user.click(screen.getByLabelText(/I verified this reference/));
    await user.selectOptions(screen.getByLabelText('Procedure'), 'synthetic-procedure');
    await user.selectOptions(screen.getByLabelText('Timeframe'), 'synthetic-time');
    await user.selectOptions(screen.getByLabelText('Before image position'), 'left');
    await user.type(screen.getByLabelText('EN image description'), 'English description');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid case');
    expect(screen.getByText('Description required.')).toBeInTheDocument();
    expect(screen.getByText('Caption too long.')).toBeInTheDocument();
    expect(screen.getByLabelText('Signed consent reference')).toHaveValue('signed-reference');
    expect(screen.getByLabelText('EN image description')).toHaveValue('English description');
    expect(edit).toHaveBeenCalledWith('case-1', expect.objectContaining({
      expected_revision: 1, signed_consent_id: 'signed-reference', consent_verified: true,
      procedure_tag: 'synthetic-procedure', timeframe_badge: 'synthetic-time', before_position: 'left',
    }));
  });

  it('reflects server approval resets and allows a second review save', async () => {
    setup({ ...readyCase, captions: readyCase.captions.map((caption) => ({ ...caption, approval: 'draft' })) });
    const edit = vi.spyOn(galleryApi, 'edit').mockResolvedValueOnce({ data: { ...readyCase, revision: 5, captions: readyCase.captions.map((caption) => ({ ...caption, approval: 'draft' })) } })
      .mockResolvedValueOnce({ data: { ...readyCase, revision: 6 } });
    const user = userEvent.setup();
    await user.click(await screen.findByLabelText('EN description reviewed and approved'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/Changed descriptions are drafts/)).toBeInTheDocument();
    expect(screen.getByLabelText('EN description reviewed and approved')).not.toBeChecked();
    await user.click(screen.getByLabelText('EN description reviewed and approved'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(edit).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('EN description reviewed and approved')).toBeChecked();
  });

  it('keeps a failed image selected for retry and reports upload progress', async () => {
    setup();
    const refreshed = { ...emptyCase, revision: 2, media_ready: true, width: 1200, height: 800, url: '/image', thumbnail_url: '/thumb' };
    vi.mocked(galleryApi.get).mockResolvedValueOnce({ data: refreshed });
    const upload = vi.spyOn(galleryApi, 'upload').mockRejectedValueOnce(new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Storage unavailable'))
      .mockImplementationOnce(async (_id, _file, _revision, onProgress) => {
        onProgress?.(70);
        return { data: refreshed };
      });
    const user = userEvent.setup();
    const file = new File(['image bytes'], 'comparison.webp', { type: 'image/webp' });
    const fileInput = await screen.findByLabelText('Combined image file') as HTMLInputElement;
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable');
    expect(screen.getByText('Selected: comparison.webp')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(await screen.findByText(/Upload complete/)).toBeInTheDocument();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Revision 2 · Unpublished/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Combined before and after clinical image' })).toHaveAttribute('src', '/image');
    expect(fileInput.value).toBe('');
  });

  it('reports a failed refresh after a successful upload and retains edits', async () => {
    setup();
    await screen.findByLabelText('Signed consent reference');
    vi.mocked(galleryApi.get).mockRejectedValueOnce(new ApiError(500, 'FAILURE', 'Refresh failed'));
    vi.spyOn(galleryApi, 'upload').mockResolvedValueOnce({ data: { ...emptyCase, revision: 2, width: 1200, height: 800, url: '/image', thumbnail_url: '/thumb' } });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Signed consent reference'), 'unsaved');
    await user.upload(screen.getByLabelText('Combined image file'), new File(['image'], 'image.webp', { type: 'image/webp' }));
    await user.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(await screen.findByText(/Image uploaded, but the case could not be refreshed/)).toBeInTheDocument();
    expect(screen.getByLabelText('Signed consent reference')).toHaveValue('unsaved');
  });

  it('keeps upload busy and prevents a second submission until the server responds', async () => {
    setup();
    let finishUpload!: (value: { data: GalleryUploadResult }) => void;
    const upload = vi.spyOn(galleryApi, 'upload').mockReturnValue(new Promise((resolve) => { finishUpload = resolve; }));
    const user = userEvent.setup();
    await user.upload(await screen.findByLabelText('Combined image file'), new File(['image bytes'], 'comparison.webp', { type: 'image/webp' }));
    await user.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled();
    expect(screen.getByLabelText('Combined image file')).toBeDisabled();
    expect(upload).toHaveBeenCalledOnce();
    finishUpload({ data: { ...emptyCase, revision: 2, width: 1200, height: 800, url: '/image', thumbnail_url: '/thumb' } });
    expect(await screen.findByText(/Upload complete/)).toBeInTheDocument();
  });

  it('uses the saved revision for preview and only changes publication after confirmation', async () => {
    setup(readyCase);
    const preview = vi.spyOn(galleryApi, 'preview').mockResolvedValue({ data: { url: '/api/v1/gallery/preview?token=temporary', expires_at: '2030-01-01T00:00:00Z' } });
    let finishPublish!: (value: { data: GalleryCase }) => void;
    const publish = vi.spyOn(galleryApi, 'publish').mockReturnValue(new Promise((resolve) => { finishPublish = resolve; }));
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Generate preview link' }));
    expect(preview).toHaveBeenCalledWith('case-1', 4);
    expect(screen.getByRole('link', { name: 'Open private preview' })).toHaveAttribute('href', '/api/v1/gallery/preview?token=temporary');
    await user.click(screen.getByRole('button', { name: 'Publish case' }));
    expect(publish).toHaveBeenCalledWith('case-1', 4, true);
    expect(screen.getByText(/Revision 4 · Unpublished/)).toBeInTheDocument();
    finishPublish({ data: { ...readyCase, revision: 5, published: true } });
    expect(await screen.findByText(/Revision 5 · Published/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unpublish case' }));
    expect(publish).toHaveBeenCalledWith('case-1', 5, false);
  });

  it('warns before saving clinical changes to a published case', async () => {
    setup({ ...readyCase, published: true });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const edit = vi.spyOn(galleryApi, 'edit');
    const user = userEvent.setup();
    await user.clear(await screen.findByLabelText('Signed consent reference'));
    await user.type(screen.getByLabelText('Signed consent reference'), 'new-reference');
    expect(screen.getByText(/Saving clinical details or descriptions will unpublish/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(edit).not.toHaveBeenCalled();
  });

  it('requires a fresh verification when the consent reference changes', async () => {
    setup(readyCase);
    const user = userEvent.setup();
    const reference = await screen.findByLabelText('Signed consent reference');
    expect(screen.getByLabelText(/I verified this reference/)).toBeChecked();
    await user.clear(reference);
    await user.type(reference, 'replacement-reference');
    expect(screen.getByLabelText(/I verified this reference/)).not.toBeChecked();
  });

  it('renders dynamic active and retired timeframe options and preserves existing retired timeframe', async () => {
    const dynamicOptions: GalleryOptions = {
      procedures: [{ code: 'rhinoplasty', en: 'Rhinoplasty', ar: 'تجميل الأنف' }],
      timeframes: [
        { code: '0-3-months', en: '0–3 Months', ar: '٠-٣ أشهر', status: 'active' },
        { code: 'old-retired', en: 'Old Period', ar: 'فترة قديمة', status: 'retired', retired: true },
      ],
    };
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: dynamicOptions });
    vi.spyOn(galleryApi, 'get').mockResolvedValue({
      data: { ...emptyCase, timeframe_badge: 'old-retired' },
    });
    render(<GalleryCaseEditor caseID="case-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);

    const select = await screen.findByLabelText('Timeframe') as HTMLSelectElement;
    expect(select.value).toBe('old-retired');
    expect(screen.getByRole('option', { name: '0–3 Months' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Old Period (Retired)' })).toBeInTheDocument();
  });

  it('validates displayOrder client-side against int32 boundary without making a request', async () => {
    setup();
    const edit = vi.spyOn(galleryApi, 'edit');
    const user = userEvent.setup();
    const displayOrderInput = await screen.findByLabelText('Display order');
    await user.clear(displayOrderInput);
    await user.type(displayOrderInput, '2147483648');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter a whole display order number.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Check the highlighted field.');
    expect(edit).not.toHaveBeenCalled();
  });

  it('shows only top-level message in error banner on 422 with inline field errors', async () => {
    setup();
    vi.spyOn(galleryApi, 'edit').mockRejectedValue(
      new ApiError(422, 'VALIDATION_FAILED', 'Invalid input provided', { procedure_tag: 'Procedure required.' })
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Signed consent reference'), 'ref-1');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid input provided');
    expect(alert).not.toHaveTextContent('procedure_tag');
    expect(await screen.findByText('Procedure required.')).toBeInTheDocument();
  });

  it('preserves dirty form edits when refetch after upload succeeds', async () => {
    setup();
    const refreshed = { ...emptyCase, revision: 2, media_ready: true, width: 1200, height: 800, signed_consent_id: 'original-server-ref', url: '/image', thumbnail_url: '/thumb' };
    vi.mocked(galleryApi.get).mockResolvedValueOnce({ data: refreshed });
    vi.spyOn(galleryApi, 'upload').mockResolvedValueOnce({ data: refreshed });
    const user = userEvent.setup();
    const consentInput = await screen.findByLabelText('Signed consent reference');
    await user.type(consentInput, 'my-unsaved-edit');
    const file = new File(['image bytes'], 'comparison.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText('Combined image file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(await screen.findByText(/Upload complete/)).toBeInTheDocument();
    expect(consentInput).toHaveValue('my-unsaved-edit');
  });

  it('synchronizes form values with refreshed case after upload when form is clean', async () => {
    setup();
    const refreshed = {
      ...emptyCase,
      revision: 2,
      media_ready: true,
      width: 1200,
      height: 800,
      signed_consent_id: 'refreshed-server-ref',
      url: '/image',
      thumbnail_url: '/thumb',
    };
    vi.mocked(galleryApi.get).mockResolvedValueOnce({ data: refreshed });
    vi.spyOn(galleryApi, 'upload').mockResolvedValueOnce({ data: refreshed });
    const user = userEvent.setup();
    const consentInput = await screen.findByLabelText('Signed consent reference');
    expect(consentInput).toHaveValue('');
    const file = new File(['image bytes'], 'comparison.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText('Combined image file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(await screen.findByText(/Upload complete/)).toBeInTheDocument();
    expect(consentInput).toHaveValue('refreshed-server-ref');
  });

  it('prompts confirmation before uploading image to a published case and cancels when declined', async () => {
    setup({ ...readyCase, published: true });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const refreshed = {
      ...readyCase,
      revision: 5,
      width: 1200,
      height: 800,
      url: readyCase.url ?? '/admin/api/gallery/case-1/media/display',
      thumbnail_url: readyCase.thumbnail_url ?? '/admin/api/gallery/case-1/media/thumbnail',
    };
    vi.mocked(galleryApi.get).mockResolvedValueOnce({ data: refreshed });
    const upload = vi.spyOn(galleryApi, 'upload').mockResolvedValueOnce({ data: refreshed });
    const user = userEvent.setup();

    const file = new File(['image bytes'], 'replacement.webp', { type: 'image/webp' });
    await user.upload(await screen.findByLabelText('Combined image file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload image' }));

    expect(confirm).toHaveBeenCalledWith('Replacing this image will unpublish the case and reset reviews. Continue?');
    expect(upload).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(upload).toHaveBeenCalledOnce();
    expect(await screen.findByText(/Upload complete/)).toBeInTheDocument();
  });

  it('guards against generating preview or publishing while form has unsaved edits', async () => {
    setup(readyCase);
    const preview = vi.spyOn(galleryApi, 'preview');
    const publish = vi.spyOn(galleryApi, 'publish');
    const user = userEvent.setup();

    const consentInput = await screen.findByLabelText('Signed consent reference');
    await user.type(consentInput, '-edited');

    await user.click(screen.getByRole('button', { name: 'Generate preview link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Save changes and upload the selected image before generating a preview.'
    );
    expect(preview).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Publish case' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Save changes and upload the selected image before changing publication.'
    );
    expect(publish).not.toHaveBeenCalled();
  });
});
