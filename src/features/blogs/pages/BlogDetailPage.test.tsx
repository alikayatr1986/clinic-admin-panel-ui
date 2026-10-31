import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import { BlogDetailPage } from './BlogDetailPage';
import type { BlogDetail } from '../types/blogs.types';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockDetail: BlogDetail = {
  id: 'post-detail-1',
  slug: 'septoplasty-guide',
  category_id: 'cat-ent',
  category_key: 'ent-health',
  status: 'draft',
  aggregate_revision: 3,
  first_published_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  en: {
    id: 'ed-en-1',
    language: 'en',
    edition_revision: 2,
    title: 'Septoplasty Recovery Guide',
    excerpt: 'Detailed recovery timeline and care instructions.',
    author_name: 'Dr. Naserzadeh',
    reviewer_attribution: 'Medical Board',
    body: {
      schema_version: 1,
      blocks: [
        { type: 'paragraph', text: 'First week post-surgery care.' },
        { type: 'heading', level: 2, text: 'Expected Timeline' },
      ],
    },
    cover_media_id: null,
    cover_alt: '',
    seo_title: 'Septoplasty Guide',
    seo_description: 'Complete recovery guide.',
    references: [],
    origin: 'manual',
    updated_at: '2026-01-02T00:00:00Z',
  },
  ar: {
    id: 'ed-ar-1',
    language: 'ar',
    edition_revision: 1,
    title: 'دليل التعافي بعد تجميل الحاجز الأنفي',
    excerpt: 'تعليمات مفصلة للتعافي.',
    author_name: 'د. ناصرزاده',
    reviewer_attribution: null,
    body: {
      schema_version: 1,
      blocks: [
        { type: 'paragraph', text: 'العناية خلال الأسبوع الأول بعد العملية.' },
      ],
    },
    cover_media_id: null,
    cover_alt: '',
    seo_title: 'دليل تجميل الحاجز الأنفي',
    seo_description: 'دليل شامل للتعافي.',
    references: [],
    origin: 'manual',
    updated_at: '2026-01-02T00:00:00Z',
  },
  readiness: {
    en: {
      revision_id: 'en-1', revision: 2,
      missing_fields: [],
      required_reviews: ['editorial'],
      completed_reviews: ['editorial'],
    },
    ar: {
      revision_id: 'ar-1', revision: 1,
      missing_fields: ['cover_media_id'],
      required_reviews: ['medical'],
      completed_reviews: [],
    },
  },
};

const mockOptions = {
  limits: {},
  generation_enabled: true,
  categories: [
    { id: 'cat-ent', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة الأنف والأذن والحنجرة' },
  ],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BlogDetailPage', () => {
  it('renders loading status initially', () => {
    vi.spyOn(blogsApi, 'get').mockReturnValue(new Promise(() => {}));
    vi.spyOn(blogsApi, 'options').mockReturnValue(new Promise(() => {}));
    render(<BlogDetailPage postID="post-1" onExpired={vi.fn()} onEdit={vi.fn()} onPreview={vi.fn()} onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByRole('status')).toHaveTextContent('Loading article detail…');
  });

  it('renders error state and retries on failure', async () => {
    const getSpy = vi.spyOn(blogsApi, 'get')
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Database unavailable'))
      .mockResolvedValueOnce({ data: mockDetail });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });

    render(<BlogDetailPage postID="post-detail-1" onExpired={vi.fn()} onEdit={vi.fn()} onPreview={vi.fn()} onBack={vi.fn()} />, { wrapper: createWrapper() });
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Septoplasty Recovery Guide' })).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it('invokes onExpired on 401 response', async () => {
    const onExpired = vi.fn();
    vi.spyOn(blogsApi, 'get').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Session expired'));
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });

    render(<BlogDetailPage postID="post-1" onExpired={onExpired} onEdit={vi.fn()} onPreview={vi.fn()} onBack={vi.fn()} />, { wrapper: createWrapper() });
    await waitFor(() => expect(onExpired).toHaveBeenCalled());
  });

  it('renders metadata and switches between English and Arabic editions', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: mockDetail });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });

    const user = userEvent.setup();
    render(<BlogDetailPage postID="post-detail-1" onExpired={vi.fn()} onEdit={vi.fn()} onPreview={vi.fn()} onBack={vi.fn()} />, { wrapper: createWrapper() });

    // Metadata
    expect(await screen.findByRole('heading', { level: 1, name: 'Septoplasty Recovery Guide' })).toBeInTheDocument();
    expect(screen.getByText('septoplasty-guide')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('Revision 3')).toBeInTheDocument();
    expect(screen.getByText('ENT Health')).toBeInTheDocument();

    // Default English edition
    expect(screen.getByText('Detailed recovery timeline and care instructions.')).toBeInTheDocument();
    expect(screen.getByText('First week post-surgery care.')).toBeInTheDocument();
    expect(screen.getByText('Expected Timeline')).toBeInTheDocument();

    // Switch to Arabic tab
    await user.click(screen.getByRole('tab', { name: /العربية/ }));
    expect(await screen.findByText('دليل التعافي بعد تجميل الحاجز الأنفي')).toBeInTheDocument();
    expect(screen.getByText('تعليمات مفصلة للتعافي.')).toBeInTheDocument();
    expect(screen.getByText('العناية خلال الأسبوع الأول بعد العملية.')).toBeInTheDocument();
  });

  it('triggers onEdit, onPreview, and onBack action handlers', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: mockDetail });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });

    const onEdit = vi.fn();
    const onPreview = vi.fn();
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(<BlogDetailPage postID="post-detail-1" onExpired={vi.fn()} onEdit={onEdit} onPreview={onPreview} onBack={onBack} />, { wrapper: createWrapper() });

    await screen.findByRole('heading', { level: 1, name: 'Septoplasty Recovery Guide' });

    await user.click(screen.getByRole('button', { name: 'Edit article' }));
    expect(onEdit).toHaveBeenCalledWith('post-detail-1');

    await user.click(screen.getByRole('button', { name: 'Preview saved revision' }));
    expect(onPreview).toHaveBeenCalledWith('post-detail-1');

    await user.click(screen.getByRole('button', { name: '← Back to blog library' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('allows administrator to delete article with confirmation', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: mockDetail });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });
    const deleteSpy = vi.spyOn(blogsApi, 'delete').mockResolvedValue({ data: { id: 'post-detail-1', deleted: true } });
    const onDeleted = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <BlogDetailPage
        postID="post-detail-1"
        role="admin"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onPreview={vi.fn()}
        onBack={vi.fn()}
        onDeleted={onDeleted}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { level: 1, name: 'Septoplasty Recovery Guide' });
    const deleteBtn = screen.getByRole('button', { name: 'Delete article' });
    await user.click(deleteBtn);

    expect(confirm).toHaveBeenCalledWith('Delete this article? This action cannot be undone.');
    expect(deleteSpy).toHaveBeenCalledWith('post-detail-1');
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });

  it('hides delete action for staff role', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: mockDetail });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });

    render(
      <BlogDetailPage
        postID="post-detail-1"
        role="staff"
        onExpired={vi.fn()}
        onEdit={vi.fn()}
        onPreview={vi.fn()}
        onBack={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { level: 1, name: 'Septoplasty Recovery Guide' });
    expect(screen.queryByRole('button', { name: 'Delete article' })).not.toBeInTheDocument();
  });
});

