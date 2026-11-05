import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import { BlogDraftProvider, useBlogDraft } from '../context/BlogDraftContext';
import { BlogPreviewPage } from './BlogPreviewPage';
import type { BlogDetail } from '../types/blogs.types';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BlogDraftProvider>{children}</BlogDraftProvider>
    </QueryClientProvider>
  );
}

const mockDetail: BlogDetail = {
  id: 'post-preview-1',
  slug: 'preview-slug',
  category_id: 'cat-1',
  category_key: 'ent-health',
  status: 'draft',
  aggregate_revision: 5,
  first_published_at: null,
  created_at: '',
  updated_at: '',
  en: {
    id: 'en-1',
    language: 'en',
    edition_revision: 4,
    title: 'Saved English Title',
    excerpt: 'English excerpt',
    author_name: 'Dr. Naserzadeh',
    reviewer_attribution: null,
    body: { schema_version: 1 as const, blocks: [{ type: 'paragraph', text: 'Saved body text.' }] },
    cover_media_id: null,
    cover_alt: '',
    seo_title: '',
    seo_description: '',
    references: [],
    origin: 'manual',
    updated_at: '',
  },
  ar: {
    id: 'ar-1',
    language: 'ar',
    edition_revision: 2,
    title: 'عنوان محفوظ',
    excerpt: 'مقتطف محفوظ',
    author_name: 'د. ناصرزاده',
    reviewer_attribution: null,
    body: { schema_version: 1 as const, blocks: [{ type: 'paragraph', text: 'نص المقال المحفوظ.' }] },
    cover_media_id: null,
    cover_alt: '',
    seo_title: '',
    seo_description: '',
    references: [],
    origin: 'manual',
    updated_at: '',
  },
};

const mockPreviewResponse = {
  id: 'post-preview-1',
  slug: 'preview-slug',
  lang: 'en' as const,
  title: 'Rendered Public Title',
  excerpt: 'Rendered excerpt',
  author_name: 'Dr. Naserzadeh',
  category: { key: 'ent-health', label: 'ENT Health' },
  body: { schema_version: 1 as const, blocks: [{ type: 'paragraph' as const, text: 'Rendered preview body.' }] },
  references: [],
  cover: null,
  first_published_at: '',
  last_published_at: '',
  reading_time_minutes: 2,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BlogPreviewPage', () => {
  it('renders loading status initially', () => {
    vi.spyOn(blogsApi, 'get').mockReturnValue(new Promise(() => {}));
    render(<BlogPreviewPage postID="post-preview-1" onExpired={vi.fn()} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    });
    expect(screen.getByRole('status')).toHaveTextContent('Loading article preview…');
  });

  it('renders error state and retries on demand', async () => {
    const getSpy = vi.spyOn(blogsApi, 'get')
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Network down'))
      .mockResolvedValueOnce({ data: mockDetail });
    vi.spyOn(blogsApi, 'preview').mockResolvedValue({ data: mockPreviewResponse });

    render(<BlogPreviewPage postID="post-preview-1" onExpired={vi.fn()} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('region', { name: 'Saved article preview' })).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it('invokes onClose when Return to editor is clicked', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: mockDetail });
    vi.spyOn(blogsApi, 'preview').mockResolvedValue({ data: mockPreviewResponse });
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<BlogPreviewPage postID="post-preview-1" onExpired={vi.fn()} onClose={onClose} />, {
      wrapper: createWrapper(),
    });

    await screen.findByRole('region', { name: 'Saved article preview' });
    await user.click(screen.getByRole('button', { name: '← Return to editor' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('switches preview language tab', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: mockDetail });
    const previewSpy = vi.spyOn(blogsApi, 'preview')
      .mockResolvedValueOnce({ data: mockPreviewResponse })
      .mockResolvedValueOnce({ data: { ...mockPreviewResponse, lang: 'ar', title: 'عنوان مترجم' } });
    const user = userEvent.setup();

    render(<BlogPreviewPage postID="post-preview-1" onExpired={vi.fn()} onClose={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await screen.findByRole('region', { name: 'Saved article preview' });
    expect(previewSpy).toHaveBeenCalledWith('post-preview-1', 'en', 4, expect.anything());

    await user.click(screen.getByRole('tab', { name: 'العربية' }));
    await waitFor(() => {
      expect(previewSpy).toHaveBeenCalledWith('post-preview-1', 'ar', 2, expect.anything());
    });
  });

  it('shows unsaved edits warning banner when draft is dirty', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: mockDetail });
    vi.spyOn(blogsApi, 'preview').mockResolvedValue({ data: mockPreviewResponse });

    function DraftSeeder() {
      const { saveDraft } = useBlogDraft('post-preview-1');
      return (
        <button
          type="button"
          onClick={() =>
            saveDraft({
              saved: { en: { slug: '', categoryID: '', title: '', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] }, ar: { slug: '', categoryID: '', title: '', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] } },
              file: null, rights: '', focalX: 0.5, focalY: 0.5,
              dirty: true,
              locale: 'en',
              forms: {
                en: { slug: '', categoryID: '', title: 'Dirty Unsaved Title', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] },
                ar: { slug: '', categoryID: '', title: '', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] },
              },
            })
          }
        >
          Mark dirty
        </button>
      );
    }

    const user = userEvent.setup();
    render(
      <div>
        <DraftSeeder />
        <BlogPreviewPage postID="post-preview-1" onExpired={vi.fn()} onClose={vi.fn()} />
      </div>,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('region', { name: 'Saved article preview' });
    await screen.findByText(mockPreviewResponse.title);
    // Initially not dirty
    expect(screen.queryByRole('status')).toBeNull();

    // Mark dirty in draft context
    await user.click(screen.getByRole('button', { name: 'Mark dirty' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Preview shows saved revision 4; unsaved edits are not included.'
    );
  });
});

