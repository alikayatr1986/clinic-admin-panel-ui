import { BlogDraftProvider } from '../context/BlogDraftContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import { BlogEditor } from './BlogEditor';
import type { BlogDetail, BlogEdition, BlogLocale, BlogReviewKind } from '../types/blogs.types';

function render(element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return rtlRender(element, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <BlogDraftProvider>{children}</BlogDraftProvider>
      </QueryClientProvider>
    ),
  });
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/admin/'); });
beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true); });
const detail = { id: 'post-1', slug: 'draft-post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft' as const, aggregate_revision: 2, first_published_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
const options = { limits: {}, generation_enabled: false, categories: [{ id: 'cat-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة' }] };
const edition = (lang: BlogLocale): BlogEdition => ({ id: `${lang}-saved`, language: lang, edition_revision: lang === 'en' ? 8 : 9, title: `${lang} saved title`, excerpt: 'excerpt', body: { schema_version: 1, blocks: [{ type: 'paragraph', text: 'Saved body' }] }, cover_media_id: 'media', cover_alt: 'alt', author_name: 'Clinic', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' });
function reviewedPost(): BlogDetail {
  const en: BlogReviewKind[] = ['editorial', 'medical', 'media_rights']; const ar: BlogReviewKind[] = [...en, 'translation'];
  return { ...detail, en: edition('en'), ar: edition('ar'), status: 'published', active_publication: { id: 'live-before' }, readiness: { en: { revision_id: 'en-saved', revision: 8, required_reviews: en, completed_reviews: en, missing_fields: [] }, ar: { revision_id: 'ar-saved', revision: 9, required_reviews: ar, completed_reviews: ar, missing_fields: [] } } };
}

describe('BlogEditor', () => {
  it('retains the localized label of its retired category', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { ...detail, category_name_en: 'ENT Health', category_name_ar: 'صحة' } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { ...options, categories: [] } });
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    expect(await screen.findByRole('option', { name: 'ENT Health (Retired)' })).toHaveValue('cat-1');
    fireEvent.click(screen.getByRole('tab', { name: 'العربية' }));
    expect(screen.getByRole('option', { name: 'صحة (Retired)' })).toHaveValue('cat-1');
  });
  it('keeps manual authoring available when AI drafting is disabled', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: detail });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    expect(await screen.findByText(/AI drafting is unavailable/)).toBeInTheDocument();
    const title = screen.getByLabelText('Title');
    fireEvent.change(title, { target: { value: 'Manual draft' } });
    expect(title).toHaveValue('Manual draft');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
  it('ignores a pending retry response after a newer editor load', async () => {
    const post = reviewedPost(); let resolve!: (value: { data: BlogDetail }) => void;
    vi.spyOn(blogsApi, 'get').mockResolvedValueOnce({ data: post }).mockRejectedValueOnce(new Error('offline')).mockReturnValueOnce(new Promise((done) => { resolve = done; })).mockResolvedValueOnce({ data: { ...post, id: 'post-2', slug: 'new-post', en: { ...post.en!, title: 'New article' } } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options }); vi.spyOn(blogsApi, 'save').mockResolvedValue({ data: { id: post.id, aggregate_revision: 3, edition_revision: 10, updated_at: '' } });
    const props = { onExpired: vi.fn(), onNavigate: vi.fn(), registerBlocker: vi.fn() }; const { rerender } = render(<BlogEditor postID="post-1" {...props} />);
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Edited' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' })); fireEvent.click(await screen.findByRole('button', { name: 'Retry saved details' }));
    rerender(<BlogEditor postID="post-2" {...props} />); await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('New article'));
    resolve({ data: post }); await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()); expect(screen.getByLabelText('Title')).toHaveValue('New article'); expect(screen.getByLabelText('Slug')).toHaveValue('new-post');
  });
  it.each(['failed', 'mismatched'])('preserves both locales and locks mutations after a %s saved refresh until one retry succeeds', async (mode) => {
    const post = reviewedPost(); const latest = { ...post, aggregate_revision: 3, en: { ...post.en!, title: 'EN submitted', id: 'new-en', edition_revision: 10 } };
    let resolve!: (value: { data: BlogDetail }) => void;
    const get = vi.spyOn(blogsApi, 'get').mockResolvedValueOnce({ data: post });
    if (mode === 'failed') get.mockRejectedValueOnce(new Error('offline')); else get.mockResolvedValueOnce({ data: { ...post, aggregate_revision: 99 } });
    get.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options }); vi.spyOn(blogsApi, 'home').mockResolvedValue({ data: { featured_post_id: null, revision: 1, updated_at: '' } });
    const save = vi.spyOn(blogsApi, 'save').mockResolvedValue({ data: { id: post.id, aggregate_revision: 3, edition_revision: 10, updated_at: '' } });
    render(<BlogEditor postID="post-1" role="admin" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'العربية' })); fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'عنوان محلي' } }); fireEvent.click(screen.getByRole('tab', { name: 'English' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'EN submitted' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' })); fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'EN during refresh' } });
    await screen.findByText(/Saved details need refreshing/); expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Preview saved revision' })).toBeDisabled(); expect(screen.queryByRole('button', { name: 'Publish update' })).not.toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Retry saved details' }); fireEvent.click(retry); fireEvent.click(retry); expect(get).toHaveBeenCalledTimes(3); expect(retry).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(save).toHaveBeenCalledTimes(2); resolve({ data: latest });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview saved revision' })).toBeEnabled()); expect(screen.getByLabelText('Title')).toHaveValue('EN during refresh'); fireEvent.click(screen.getByRole('tab', { name: 'العربية' })); expect(screen.getByLabelText('Title')).toHaveValue('ar saved title');
  });

  it('restores freshness after an explicitly confirmed discard reload', async () => {
    const post = reviewedPost(); vi.spyOn(blogsApi, 'get').mockResolvedValueOnce({ data: post }).mockResolvedValueOnce({ data: { ...post, aggregate_revision: 99 } }).mockResolvedValueOnce({ data: { ...post, aggregate_revision: 4 } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options }); vi.spyOn(blogsApi, 'save').mockResolvedValue({ data: { id: post.id, aggregate_revision: 3, edition_revision: 10, updated_at: '' } }); vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Local' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reload latest (discard local)' })); await screen.findByLabelText('Title'); expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(); expect(screen.getByRole('button', { name: 'Preview saved revision' })).toBeEnabled(); expect(screen.queryByText(/Saved details need refreshing/)).not.toBeInTheDocument();
  });
  it('omits privileged lifecycle controls for staff while preserving saved preview access', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: reviewedPost() }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    render(<BlogEditor postID="post-1" role="staff" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    await screen.findByLabelText('Title'); expect(screen.queryByRole('region', { name: 'Publication controls' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Publish update' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Delete article' })).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Preview saved revision' })).toBeEnabled();
  });

  it.each([401, 403, 409, 0])('preserves both locale forms through saved preview and failed publication %s', async (status) => {
    const post = reviewedPost(); vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: post }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options }); vi.spyOn(blogsApi, 'home').mockResolvedValue({ data: { featured_post_id: null, revision: 1, updated_at: '' } });
    const publish = vi.spyOn(blogsApi, 'publish').mockRejectedValue(new ApiError(status, 'FAILURE', 'Request failed.'));
    const preview = vi.spyOn(blogsApi, 'preview').mockResolvedValue({ data: { id: post.id, slug: post.slug, lang: 'ar', title: 'AR saved preview', excerpt: '', category: { key: 'ent-health', label: 'Health' }, first_published_at: '', last_published_at: '', reading_time_minutes: 1, author_name: 'Clinic', body: post.ar!.body, cover: null, references: [] } });
    render(<BlogEditor postID="post-1" role="admin" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'EN unsaved title' } }); fireEvent.click(screen.getByRole('tab', { name: 'العربية' })); fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'عنوان محلي' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview saved revision' })); expect(await screen.findByText('AR saved preview')).toBeInTheDocument(); expect(preview).toHaveBeenCalledWith('post-1', 'ar', 9);
    fireEvent.click(screen.getByRole('button', { name: 'Publish update' })); fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' })); await waitFor(() => expect(publish).toHaveBeenCalled()); await screen.findByRole('alert'); expect(screen.getByLabelText('Title')).toHaveValue('عنوان محلي');
    fireEvent.click(screen.getByRole('tab', { name: 'English' })); expect(screen.getByLabelText('Title')).toHaveValue('EN unsaved title'); expect(screen.getByText('Unsaved changes')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
  });

  it('refreshes saved UUID/content after save while retaining edits made during the request and the other locale', async () => {
    const post = reviewedPost(); const updated = { ...post, aggregate_revision: 3, en: { ...post.en!, id: 'fresh-en-uuid', edition_revision: 10, title: 'Submitted EN title' } };
    vi.spyOn(blogsApi, 'get').mockResolvedValueOnce({ data: post }).mockResolvedValueOnce({ data: updated }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    let resolve!: (value: Awaited<ReturnType<typeof blogsApi.save>>) => void;
    vi.spyOn(blogsApi, 'save').mockReturnValue(new Promise((done) => { resolve = done; }));
    const preview = vi.spyOn(blogsApi, 'preview').mockRejectedValue(new Error('offline'));
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    await screen.findByLabelText('Title');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Submitted EN title' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' })); fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Typed during save' } });
    resolve({ data: { id: post.id, aggregate_revision: 3, edition_revision: 10, updated_at: '' } }); await waitFor(() => expect(screen.getByRole('button', { name: 'Preview saved revision' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Preview saved revision' })); await waitFor(() => expect(preview).toHaveBeenCalledWith('post-1', 'en', 10)); expect(screen.getByLabelText('Title')).toHaveValue('Typed during save');
    fireEvent.click(screen.getByRole('tab', { name: 'العربية' })); expect(screen.getByLabelText('Title')).toHaveValue('ar saved title');
  });
  it('keeps dirty text through conflict and blocks navigation', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: detail }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    vi.spyOn(blogsApi, 'save').mockRejectedValue(new ApiError(409, 'BLOG_CONFLICT', 'conflict'));
    let blocker: (() => boolean) | null = null; vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={(value) => { blocker = value; }} />);
    const title = await screen.findByLabelText('Title'); fireEvent.change(title, { target: { value: 'Local title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/changed elsewhere/)).toBeInTheDocument(); expect(title).toHaveValue('Local title'); expect((blocker as unknown as () => boolean)()).toBe(false);
  });

  it('renders Arabic fields RTL and preserves them on session failure', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: detail }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    vi.spyOn(blogsApi, 'save').mockRejectedValue(new ApiError(401, 'ADMIN_UNAUTHORIZED', 'expired'));
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'العربية' })); const title = screen.getByLabelText('Title');
    expect(title.closest('form')).toHaveAttribute('dir', 'rtl'); fireEvent.change(title, { target: { value: 'عنوان محلي' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/session expired/)).toBeInTheDocument(); expect(title).toHaveValue('عنوان محلي'); expect(screen.getByRole('link', { name: /Sign in/ })).toBeInTheDocument();
  });

  it('keeps validation input and adopts the revision returned by a successful retry', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValueOnce({ data: detail }).mockResolvedValueOnce({ data: { ...detail, aggregate_revision: 3 } }).mockResolvedValueOnce({ data: { ...detail, aggregate_revision: 4 } }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    const save = vi.spyOn(blogsApi, 'save').mockRejectedValueOnce(new ApiError(422, 'VALIDATION', 'Check fields.', { title: 'Required.' })).mockResolvedValueOnce({ data: { id: 'post-1', aggregate_revision: 3, edition_revision: 1, updated_at: '2026-01-02T00:00:00Z' } }).mockResolvedValueOnce({ data: { id: 'post-1', aggregate_revision: 4, edition_revision: 2, updated_at: '2026-01-03T00:00:00Z' } });
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />); const title = await screen.findByLabelText('Title'); fireEvent.change(title, { target: { value: 'Kept title' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('title: Required.')).toBeInTheDocument(); expect(title).toHaveValue('Kept title'); fireEvent.click(screen.getByRole('button', { name: 'Save' })); expect(await screen.findByText('English saved.')).toBeInTheDocument();
    fireEvent.change(title, { target: { value: 'Second title' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' })); await waitFor(() => expect(save).toHaveBeenLastCalledWith('post-1', expect.objectContaining({ expected_revision: 3, title: 'Second title' })));
  });

  it('adopts an uploaded cover and aggregate revision while retaining unrelated dirty text and locking duplicate upload', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValueOnce({ data: detail }).mockResolvedValueOnce({ data: { ...detail, aggregate_revision: 7 } }).mockResolvedValueOnce({ data: { ...detail, aggregate_revision: 8 } }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    let resolve!: (value: { data: { media_id: string; aggregate_revision: number; width: number; height: number; focal_x: number; focal_y: number } }) => void;
    const upload = vi.spyOn(blogsApi, 'upload').mockReturnValue(new Promise((done) => { resolve = done; })); const save = vi.spyOn(blogsApi, 'save').mockResolvedValue({ data: { id: 'post-1', aggregate_revision: 8, edition_revision: 1, updated_at: '2026-01-02T00:00:00Z' } });
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />); const title = await screen.findByLabelText('Title'); fireEvent.change(title, { target: { value: 'Unsaved while uploading' } });
    const image = new File(['bytes'], 'cover.png', { type: 'image/png' }); fireEvent.change(screen.getByLabelText('Image'), { target: { files: [image] } }); fireEvent.change(screen.getByLabelText('Rights/source record'), { target: { value: 'Licensed stock record' } }); const button = screen.getByRole('button', { name: 'Upload cover' }); fireEvent.click(button); fireEvent.click(button); expect(upload).toHaveBeenCalledOnce();
    resolve({ data: { media_id: 'media-1', aggregate_revision: 7, width: 1600, height: 1200, focal_x: .5, focal_y: .5 } }); expect(await screen.findByText(/Cover uploaded/)).toBeInTheDocument(); expect(title).toHaveValue('Unsaved while uploading'); expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' })); await waitFor(() => expect(save).toHaveBeenCalledWith('post-1', expect.objectContaining({ expected_revision: 7, cover_media_id: 'media-1', title: 'Unsaved while uploading' })));
  });

  it('sends structured content, references, and metadata in the selected locale save', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: detail }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    const save = vi.spyOn(blogsApi, 'save').mockResolvedValue({ data: { id: 'post-1', aggregate_revision: 3, edition_revision: 1, updated_at: '2026-01-02T00:00:00Z' } });
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Full title' } });
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'Full excerpt' } });
    fireEvent.change(screen.getByLabelText('Public author'), { target: { value: 'Dr. Clinic' } });
    fireEvent.change(screen.getByLabelText('Cover alt text'), { target: { value: 'Cover description' } });
    fireEvent.change(screen.getByLabelText('SEO title'), { target: { value: 'SEO title' } });
    fireEvent.change(screen.getByLabelText('SEO description'), { target: { value: 'SEO description' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add paragraph' }));
    fireEvent.change(screen.getByLabelText('Block text 1'), { target: { value: 'Body copy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add text mark' }));
    fireEvent.change(screen.getByLabelText('Mark end 1-1'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add reference' }));
    fireEvent.change(screen.getByLabelText('Reference label 1'), { target: { value: 'Source' } });
    fireEvent.change(screen.getByLabelText('Reference URL 1'), { target: { value: 'https://example.com/source' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('post-1', expect.objectContaining({
      lang: 'en', slug: 'draft-post', category_id: 'cat-1', title: 'Full title', excerpt: 'Full excerpt', author_name: 'Dr. Clinic', cover_alt: 'Cover description',
      seo_title: 'SEO title', seo_description: 'SEO description', body: { schema_version: 1, blocks: [{ type: 'paragraph', text: 'Body copy', marks: [{ type: 'strong', start: 0, end: 4 }] }] },
      references: [{ label: 'Source', url: 'https://example.com/source' }],
    })));
  });
});

describe('BlogEditor single save', () => {
  it('saves both changed locales with chained revisions and reports a partial failure without losing text', async () => {
    const post = reviewedPost();
    vi.spyOn(blogsApi, 'get').mockResolvedValueOnce({ data: post }).mockResolvedValue({ data: { ...post, aggregate_revision: post.aggregate_revision + 1 } }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    const save = vi.spyOn(blogsApi, 'save').mockResolvedValueOnce({ data: { id: post.id, aggregate_revision: post.aggregate_revision + 1, edition_revision: 10, updated_at: '' } }).mockRejectedValueOnce(new ApiError(422, 'VALIDATION', 'Check fields.', { title: 'Required.' }));
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'EN edit' } });
    fireEvent.click(screen.getByRole('tab', { name: 'العربية' })); fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'AR edit' } });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/Arabic was not saved \(English saved\)/)).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0][1]).toMatchObject({ lang: 'en', expected_revision: post.aggregate_revision });
    expect(save.mock.calls[1][1]).toMatchObject({ lang: 'ar', expected_revision: post.aggregate_revision + 1 });
    expect(screen.getByLabelText('Title')).toHaveValue('AR edit');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('shows per-locale completeness badges and required markers', async () => {
    const post = reviewedPost(); post.readiness!.ar = { ...post.readiness!.ar, missing_fields: ['body', 'cover_alt'] };
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: post }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    expect(await screen.findByText('Complete')).toBeInTheDocument(); expect(screen.getByText('2 missing')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-required', 'true');
  });
});

describe('BlogEditor attestation void warning', () => {
  it('names the attestations a save voids and saves nothing when cancelled', async () => {
    const post = reviewedPost();
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: post }); vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    const save = vi.spyOn(blogsApi, 'save'); const confirm = vi.mocked(window.confirm); confirm.mockReturnValue(false);
    render(<BlogEditor postID="post-1" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'العربية' })); fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'AR edit' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Saving voids: editorial, medical, media rights, translation (Arabic). You will need to attest again.'));
    expect(save).not.toHaveBeenCalled(); expect(screen.getByLabelText('Title')).toHaveValue('AR edit');
  });
});
