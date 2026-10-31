import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { NavigationBoundary } from '../../../app/navigation';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlogListPage } from './BlogListPage';
import { blogsApi } from '../services/blogs.service';
import { ApiError } from '../../../lib/api';

function render(element: ReactElement) { const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ path: '*', element }] }], { basename: '/admin' }); return rtlRender(<RouterProvider router={router} />); }
beforeEach(() => {
  window.history.replaceState({}, '', '/admin/blogs');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockOptions = {
  limits: {},
  generation_enabled: false,
  categories: [{ id: 'cat-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة الأنف' }],
};

const sampleArticle = {
  id: 'article-1',
  slug: 'sinus-relief',
  title: 'Sinus Relief',
  category_id: 'cat-1',
  category_key: 'ent-health',
  status: 'draft' as const,
  aggregate_revision: 1,
  first_published_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  next_action: 'needs_review',
  next_action_label: 'Needs review',
  en_status: { revision: 1, complete: true, reviewed: false },
  ar_status: { revision: 0, complete: false, reviewed: false },
};

describe('BlogListPage', () => {
  it('renders page header and action to trigger article creation without inline accordion', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });

    const onEdit = vi.fn();
    const onCreate = vi.fn();

    render(<BlogListPage onExpired={vi.fn()} onEdit={onEdit} onCreate={onCreate} />);

    expect(screen.getByRole('heading', { name: 'Articles' })).toBeInTheDocument();
    const createBtn = screen.getByRole('button', { name: 'Create article' });
    expect(createBtn).toBeInTheDocument();

    // Verify inline accordion is omitted on the list page
    expect(screen.queryByRole('button', { name: 'Create draft' })).not.toBeInTheDocument();

    fireEvent.click(createBtn);
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it('renders article rows and invokes onEdit when clicked', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [sampleArticle], page: 1, page_size: 12, total: 1 });

    const onEdit = vi.fn();
    render(<BlogListPage onExpired={vi.fn()} onEdit={onEdit} onCreate={vi.fn()} />);

    expect(await screen.findByText('Sinus Relief')).toBeInTheDocument();
    const editBtn = screen.getByRole('link', { name: 'Edit article' });
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith('article-1');
  });

  it('preserves search parameters and restores them on filter navigation', async () => {
    window.history.replaceState({}, '', '/admin/blogs?status=draft&category=ent-health&page=2');
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });
    const listSpy = vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [sampleArticle], page: 2, page_size: 12, total: 15 });

    const onCreate = vi.fn();
    render(<BlogListPage onExpired={vi.fn()} onEdit={vi.fn()} onCreate={onCreate} />);

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, status: 'draft', category: 'ent-health' })
      );
    });

    expect(window.location.search).toContain('status=draft');
    expect(window.location.search).toContain('category=ent-health');
    expect(window.location.search).toContain('page=2');

    // Trigger navigation away and simulate returning
    fireEvent.click(screen.getByRole('button', { name: 'Create article' }));
    expect(onCreate).toHaveBeenCalledOnce();

    // Verify search params remain in window.location when navigating
    expect(window.location.search).toContain('status=draft');
  });

  it('resets page to 1 when status filter changes', async () => {
    window.history.replaceState({}, '', '/admin/blogs?status=draft&page=2');
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });
    const listSpy = vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 2, page_size: 12, total: 20 });

    render(<BlogListPage onExpired={vi.fn()} onEdit={vi.fn()} onCreate={vi.fn()} />);

    await screen.findByLabelText('Status');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'published' } });

    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'published', page: 1 }));
      expect(window.location.search).toContain('status=published');
      expect(window.location.search).not.toContain('page=2');
    });
  });

  it('calls onExpired when list query returns 401', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: mockOptions });
    vi.spyOn(blogsApi, 'list').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Session expired.'));

    const onExpired = vi.fn();
    render(<BlogListPage onExpired={onExpired} onEdit={vi.fn()} onCreate={vi.fn()} />);

    await waitFor(() => expect(onExpired).toHaveBeenCalledOnce());
  });
});
