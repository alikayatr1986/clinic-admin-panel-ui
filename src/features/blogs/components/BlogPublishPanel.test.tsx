import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import type { BlogDetail, BlogEdition, BlogLocale, BlogReviewKind } from '../types/blogs.types';
import { BlogPublishPanel } from './BlogPublishPanel';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const edition = (lang: BlogLocale): BlogEdition => ({ id: `${lang}-uuid`, language: lang, edition_revision: lang === 'en' ? 8 : 9, title: lang === 'en' ? 'Saved title' : 'عنوان محفوظ', excerpt: 'excerpt', author_name: 'Clinic', body: { schema_version: 1, blocks: [{ type: 'paragraph', text: 'body' }] }, cover_media_id: 'media', cover_alt: 'cover', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' });
const required = (lang: BlogLocale): BlogReviewKind[] => lang === 'en' ? ['editorial', 'medical', 'media_rights'] : ['editorial', 'medical', 'translation', 'media_rights'];
const post = (): BlogDetail => ({ id: 'p', slug: 'post', category_id: 'cat', category_key: 'ent-health', status: 'published_with_changes', aggregate_revision: 20, first_published_at: '', created_at: '', updated_at: '', en: edition('en'), ar: edition('ar'), active_publication: { id: 'old-live' }, readiness: { en: { revision_id: 'en-uuid', revision: 8, required_reviews: required('en'), completed_reviews: required('en'), missing_fields: [] }, ar: { revision_id: 'ar-uuid', revision: 9, required_reviews: required('ar'), completed_reviews: required('ar'), missing_fields: [] } } });
beforeEach(() => vi.spyOn(blogsApi, 'home').mockResolvedValue({ data: { featured_post_id: 'p', revision: 3, updated_at: '' } }));
function mount(value = post()) { const refresh = vi.fn().mockResolvedValue(undefined); const deleted = vi.fn(); render(<BlogPublishPanel post={value} locked={false} lock={{ current: false }} onBusy={vi.fn()} onRefresh={refresh} onDeleted={deleted} />); return { refresh, deleted }; }

describe('BlogPublishPanel', () => {
  it.each(['revision', 'category'])('invalidates a checked attestation when its %s target changes', async (changed) => {
    const value = post(); value.readiness!.ar.completed_reviews = [];
    const review = vi.spyOn(blogsApi, 'review'); const props = { locked: false, lock: { current: false }, onBusy: vi.fn(), onRefresh: vi.fn(), onDeleted: vi.fn() };
    const { rerender } = render(<BlogPublishPanel post={value} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record AR reviews' })); fireEvent.click(screen.getByRole('checkbox'));
    const next = structuredClone(value); if (changed === 'category') next.category_id = 'new-category'; else next.ar!.id = 'new-ar-uuid';
    rerender(<BlogPublishPanel post={next} {...props} />);
    expect(screen.queryByRole('button', { name: 'Confirm attestation' })).not.toBeInTheDocument(); expect(review).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Record AR reviews' })); expect(screen.getByRole('checkbox')).not.toBeChecked(); expect(screen.getByRole('button', { name: 'Confirm attestation' })).toBeDisabled();
  });
  it('publishes the exact saved EN/AR UUIDs and category; locks duplicate requests and reports only explicit success', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof blogsApi.publish>>) => void;
    const publish = vi.spyOn(blogsApi, 'publish').mockReturnValue(new Promise((done) => { resolve = done; })); const { refresh } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Publish update' })); expect(publish).not.toHaveBeenCalled(); const summary = screen.getByRole('dialog', { name: 'Publish summary' }); expect(summary).toHaveTextContent('ent-health'); expect(summary).toHaveTextContent('Saved title · revision 8'); expect(summary).toHaveTextContent('عنوان محفوظ · revision 9'); expect(summary).toHaveTextContent('alt: cover');
    const button = screen.getByRole('button', { name: 'Confirm publish' }); expect(button).toHaveFocus(); fireEvent.click(button); fireEvent.click(button);
    expect(publish).toHaveBeenCalledOnce(); expect(publish).toHaveBeenCalledWith('p', { expected_aggregate_revision: 20, category_id: 'cat', en_revision_id: 'en-uuid', ar_revision_id: 'ar-uuid' });
    expect(screen.queryByText(/Publication succeeded/)).not.toBeInTheDocument(); expect(refresh).not.toHaveBeenCalled();
    resolve({ data: { publication_id: 'new-live', aggregate_revision: 21, first_published_at: '', last_published_at: '' } });
    expect(await screen.findByText(/Publication succeeded/)).toBeInTheDocument(); await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
  it('requires an explicit exact-revision attestation', async () => {
    const value = post(); value.readiness!.ar.completed_reviews = [];
    const review = vi.spyOn(blogsApi, 'review').mockResolvedValue({ data: { id: 'r', revision_id: 'ar-uuid', review_kind: 'translation', created_at: '' } }); mount(value);
    expect(screen.getByRole('button', { name: 'Publish update' })).toBeDisabled(); expect(screen.getByText('Arabic editorial review is not recorded.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record AR reviews' })); expect(screen.getByRole('button', { name: 'Confirm attestation' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.change(screen.getByLabelText('Private review reference (optional)'), { target: { value: 'Qualified review reference' } }); fireEvent.click(screen.getByRole('button', { name: 'Confirm attestation' }));
    await waitFor(() => expect(review).toHaveBeenCalledTimes(4)); for (const kind of ['editorial', 'medical', 'translation', 'media_rights']) expect(review).toHaveBeenCalledWith('p', 'ar-uuid', kind, 'Qualified review reference');
  });
  it.each([401, 403, 409, 0])('keeps the current live state and reports lifecycle failure %s', async (status) => {
    vi.spyOn(blogsApi, 'publish').mockRejectedValue(new ApiError(status, 'FAILURE', 'Request failed.')); const { refresh } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Publish update' })); fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' })); expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(refresh).not.toHaveBeenCalled(); expect(screen.queryByText(/Publication succeeded/)).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
  });
  it('confirms the exact title and public effect before withdrawal or deletion; cancel does nothing', async () => {
    const unpublish = vi.spyOn(blogsApi, 'unpublish').mockResolvedValue({ data: { id: 'p', aggregate_revision: 21, unpublished: true } }); const remove = vi.spyOn(blogsApi, 'delete').mockResolvedValue({ data: { id: 'p', deleted: true } }); const { deleted } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' })); expect(screen.getByText(/Unpublish removes the live article/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Confirm unpublish' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type the article title/), { target: { value: 'wrong' } }); expect(screen.getByRole('button', { name: 'Confirm unpublish' })).toBeDisabled(); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(unpublish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' })); fireEvent.change(screen.getByLabelText(/Type the article title/), { target: { value: 'Saved title' } }); fireEvent.click(screen.getByRole('button', { name: 'Confirm unpublish' })); await waitFor(() => expect(unpublish).toHaveBeenCalledWith('p', 20)); await screen.findByText(/Article unpublished/);
    fireEvent.click(screen.getByRole('button', { name: 'Delete article' })); fireEvent.change(screen.getByLabelText(/Type the article title/), { target: { value: 'Saved title' } }); fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' })); await waitFor(() => expect(remove).toHaveBeenCalledWith('p')); await waitFor(() => expect(deleted).toHaveBeenCalledOnce());
  });
  it('uses the home settings revision and offers a conflict retry and automatic fallback', async () => {
    const feature = vi.spyOn(blogsApi, 'feature').mockRejectedValueOnce(new ApiError(409, 'BLOG_CONFLICT', 'conflict')).mockResolvedValueOnce({ data: { featured_post_id: null, revision: 5, updated_at: '' } }); mount();
    await screen.findByText(/This article is selected/); fireEvent.click(screen.getByRole('button', { name: 'Feature this article' })); expect(await screen.findByText(/Conflict:/)).toBeInTheDocument(); expect(feature).toHaveBeenCalledWith(3, 'p');
    vi.mocked(blogsApi.home).mockResolvedValue({ data: { featured_post_id: null, revision: 4, updated_at: '' } }); fireEvent.click(screen.getByRole('button', { name: 'Retry settings' })); await screen.findByText(/Automatic: newest eligible/);
    fireEvent.click(screen.getByRole('button', { name: 'Use automatic newest' })); await waitFor(() => expect(feature).toHaveBeenLastCalledWith(4, null));
  });
  it('shows a plain-language checklist, jumps to the field, and explains a disabled Publish', () => {
    const value = post(); value.readiness!.ar.missing_fields = ['body', 'cover_rights_source', 'some_new_gate']; value.readiness!.ar.completed_reviews = [];
    const jump = vi.fn(); render(<BlogPublishPanel post={value} locked={false} lock={{ current: false }} onBusy={vi.fn()} onRefresh={vi.fn()} onDeleted={vi.fn()} onJump={jump} />);
    expect(screen.queryByText(/cover_rights_source|some_new_gate/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Article body \(at least one paragraph\)/ })); expect(jump).toHaveBeenCalledWith('ar', 'body');
    expect(screen.getByRole('button', { name: /Cover rights confirmed/ })).toBeInTheDocument(); expect(screen.getByRole('button', { name: /Some new gate/ })).toBeInTheDocument();
    expect(screen.getByText('Complete the items above first.')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Record AR reviews' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish update' })).toBeDisabled();
    expect(screen.getByText('Arabic body is missing.')).toBeInTheDocument();
  });
  it('cancelling the publish summary publishes nothing and returns focus; Manage holds the rare actions', async () => {
    const publish = vi.spyOn(blogsApi, 'publish'); mount();
    const trigger = screen.getByRole('button', { name: 'Publish update' }); fireEvent.click(trigger); fireEvent.click(screen.getByRole('button', { name: 'Cancel publish' }));
    expect(publish).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); await waitFor(() => expect(trigger).toHaveFocus());
    const manage = screen.getByText('Manage').closest('details')!; expect(manage).not.toHaveAttribute('open');
    for (const name of ['Unpublish', 'Delete article', 'Feature this article']) expect(manage).toContainElement(screen.getByRole('button', { name }));
    expect(manage).not.toContainElement(trigger);
  });
});
