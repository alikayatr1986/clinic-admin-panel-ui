import { BlogDraftProvider } from '../context/BlogDraftContext';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { blogsApi } from '../services/blogs.service';
import type { BlogDetail, BlogEdition, BlogLocale, BlogReviewKind } from '../types/blogs.types';
import { BlogEditor } from './BlogEditor';

function render(element: ReactElement) { return rtlRender(element, { wrapper: BlogDraftProvider }); }
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/admin/'); });
const REQUIRED: Record<BlogLocale, BlogReviewKind[]> = { en: ['editorial', 'medical', 'media_rights'], ar: ['editorial', 'medical', 'translation', 'media_rights'] };
const edition = (lang: BlogLocale, body: boolean): BlogEdition => ({ id: `${lang}-1`, language: lang, edition_revision: 1, title: lang === 'en' ? 'Sinus care basics' : 'أساسيات العناية بالجيوب', excerpt: 'x', body: { schema_version: 1, blocks: body ? [{ type: 'paragraph', text: 'Body' }] : [] }, cover_media_id: 'm', cover_alt: 'alt', author_name: 'Clinic', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' });

describe('admin publishing walkthrough (Apple flow)', () => {
  it('goes from missing Arabic body to Live with no voided attestation', async () => {
    let revision = 1; let arBody = false; let live = false; const reviews: Record<BlogLocale, BlogReviewKind[]> = { en: [], ar: [] };
    const detail = (): BlogDetail => {
      const ed = { en: edition('en', true), ar: edition('ar', arBody) }; ed.ar.id = `ar-${revision}`; ed.ar.edition_revision = revision;
      const readiness = (lang: BlogLocale) => ({ revision_id: ed[lang].id, revision: ed[lang].edition_revision, required_reviews: REQUIRED[lang], completed_reviews: reviews[lang], missing_fields: lang === 'ar' && !arBody ? ['body'] : [] });
      return { id: 'p', slug: 'sinus-care-basics', category_id: 'c', category_key: 'ent-health', status: live ? 'published' : 'draft', aggregate_revision: revision, first_published_at: null, created_at: '', updated_at: '', en: ed.en, ar: ed.ar, ...(live ? { active_publication: { id: 'pub' } } : {}), readiness: { en: readiness('en'), ar: readiness('ar') } };
    };
    vi.spyOn(blogsApi, 'get').mockImplementation(async () => ({ data: detail() }));
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [{ id: 'c', key: 'ent-health', name_en: 'ENT Health', name_ar: 'ص' }] } });
    vi.spyOn(blogsApi, 'home').mockResolvedValue({ data: { featured_post_id: null, revision: 1, updated_at: '' } });
    const save = vi.spyOn(blogsApi, 'save').mockImplementation(async (_id, input) => { if (input.lang === 'ar') arBody = input.body.blocks.length > 0; revision += 1; return { data: { id: 'p', aggregate_revision: revision, edition_revision: revision, updated_at: '' } }; });
    vi.spyOn(blogsApi, 'review').mockImplementation(async (_id, revId, kind) => { reviews[revId.startsWith('en') ? 'en' : 'ar'].push(kind); return { data: { id: 'r', revision_id: revId, review_kind: kind, created_at: '' } }; });
    vi.spyOn(blogsApi, 'publish').mockImplementation(async () => { live = true; revision += 1; return { data: { publication_id: 'pub', aggregate_revision: revision, first_published_at: '', last_published_at: '' } }; });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<BlogEditor postID="p" role="admin" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    await screen.findByText('All changes saved');
    expect(screen.getByText('1 missing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled(); expect(screen.getByText('Arabic body is missing.')).toBeInTheDocument();
    expect(screen.queryByText(/cover_media_id|media_rights/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Record .* reviews/ })).toBeInTheDocument(); // English is complete
    const arSection = screen.getByRole('region', { name: 'AR readiness' }); expect(within(arSection).getByText('Complete the items above first.')).toBeInTheDocument();

    fireEvent.click(within(arSection).getByRole('button', { name: /Article body/ }));
    await waitFor(() => expect(document.getElementById('blog-field-body')).toHaveFocus());
    expect(screen.getByRole('tab', { name: 'العربية', selected: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add paragraph' }));
    fireEvent.change(screen.getAllByRole('textbox').find((el) => el.tagName === 'TEXTAREA' && (el as HTMLTextAreaElement).value === '')!, { target: { value: 'نص' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Arabic saved.'); expect(save).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Complete', { selector: '#badge-ar' })).toBeInTheDocument());

    for (const lang of ['EN', 'AR']) {
      fireEvent.click(await screen.findByRole('button', { name: `Record ${lang} reviews` })); fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: 'Confirm attestation' })); await screen.findByText('Reviews recorded for the saved revision and category.');
    }
    expect(reviews.en).toHaveLength(3); expect(reviews.ar).toHaveLength(4);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled()); expect(screen.getByText('Everything is ready to publish.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    const dialog = screen.getByRole('dialog', { name: 'Publish summary' }); expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Confirm publish' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm publish' }));
    expect(await screen.findByText(/Publication succeeded/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish update' })).toBeInTheDocument());
    expect(save).toHaveBeenCalledTimes(1); // no save after attesting, so nothing was voided
  });

  it('enforces accessibility contracts on checklist, live regions, and dialogs', async () => {
    const detail: BlogDetail = {
      id: 'p', slug: 'sinus-care-basics', category_id: 'c', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '', updated_at: '',
      en: edition('en', true), ar: edition('ar', true),
      readiness: {
        en: { revision_id: 'en-1', revision: 1, required_reviews: REQUIRED.en, completed_reviews: REQUIRED.en, missing_fields: [] },
        ar: { revision_id: 'ar-1', revision: 1, required_reviews: REQUIRED.ar, completed_reviews: REQUIRED.ar, missing_fields: [] }
      }
    };
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: detail });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [{ id: 'c', key: 'ent-health', name_en: 'ENT Health', name_ar: 'ص' }] } });
    vi.spyOn(blogsApi, 'home').mockResolvedValue({ data: { featured_post_id: null, revision: 1, updated_at: '' } });

    render(<BlogEditor postID="p" role="admin" onExpired={vi.fn()} onNavigate={vi.fn()} registerBlocker={vi.fn()} />);
    await screen.findByText('All changes saved');

    // Checklist accessibility semantics
    expect(screen.getByRole('region', { name: 'EN readiness' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'AR readiness' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'English checklist' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Arabic checklist' })).toBeInTheDocument();

    // Live region status on publication controls
    const publishBtn = screen.getByRole('button', { name: 'Publish' });
    expect(publishBtn).toHaveAttribute('aria-describedby', 'publish-reason');
    const reasonStatus = document.getElementById('publish-reason');
    expect(reasonStatus).toHaveAttribute('role', 'status');
    expect(reasonStatus).toHaveTextContent('Everything is ready to publish.');

    // Dialog keyboard management and semantics
    fireEvent.click(publishBtn);
    const dialog = screen.getByRole('dialog', { name: 'Publish summary' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const confirmBtn = screen.getByRole('button', { name: 'Confirm publish' });
    expect(confirmBtn).toHaveFocus();

    // Arabic title in summary dialog has rtl direction
    const arTitleDd = screen.getByText(/أساسيات العناية بالجيوب/);
    expect(arTitleDd).toHaveAttribute('dir', 'rtl');

    // Escape closes dialog and returns focus
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(publishBtn).toHaveFocus());
  });
});
