import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationBoundary } from '../../../app/navigation';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { blogsApi } from '../services/blogs.service';
import { ApiError } from '../../../lib/api';
import { BlogList } from './BlogList';

function render(element: ReactElement) { if (!window.location.pathname.startsWith('/admin')) window.history.replaceState({}, '', '/admin/blogs'); const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ path: '*', element }] }], { basename: '/admin' }); const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); return rtlRender(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>); }
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/admin/blogs'); });
const options = { limits: {}, generation_enabled: false, categories: [{ id: 'category-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة' }] };

describe('BlogList', () => {
  it('distinguishes an empty library from a filtered no-match state and retries errors', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    const list = vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    render(<BlogList onExpired={vi.fn()} onEdit={vi.fn()} />);
    expect(await screen.findByText('No blog articles yet.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'missing' } });
    fireEvent.submit(screen.getByLabelText('Search').closest('form')!);
    expect(await screen.findByText('No articles match these filters.')).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'missing', page: 1 }), expect.anything());
  });

  it('locks duplicate creation and navigates once', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    let resolve!: (value: { data: { id: string; aggregate_revision: number } }) => void;
    vi.spyOn(blogsApi, 'create').mockReturnValue(new Promise((done) => { resolve = done; }));
    const edit = vi.fn(); render(<BlogList onExpired={vi.fn()} onEdit={edit} />);
    fireEvent.click(await screen.findByText('Create article'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create draft' })).toBeEnabled());
    const button = screen.getByRole('button', { name: 'Create draft' }); fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(blogsApi.create).toHaveBeenCalledOnce()); resolve({ data: { id: 'post-1', aggregate_revision: 1 } });
    await waitFor(() => expect(edit).toHaveBeenCalledOnce());
  });

  it('retains create values after failure and permits a deliberate retry', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    vi.spyOn(blogsApi, 'create').mockRejectedValueOnce(new ApiError(422, 'VALIDATION', 'Slug is unavailable.')).mockResolvedValueOnce({ data: { id: 'post-2', aggregate_revision: 1 } });
    const edit = vi.fn(); render(<BlogList onExpired={vi.fn()} onEdit={edit} />); fireEvent.click(await screen.findByText('Create article'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create draft' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Slug (optional)'), { target: { value: 'kept-slug' } }); fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(await screen.findByText('Slug is unavailable.')).toBeInTheDocument(); expect(screen.getByLabelText('Slug (optional)')).toHaveValue('kept-slug');
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' })); await waitFor(() => expect(edit).toHaveBeenCalledWith('post-2'));
  });

  it('recovers a retryable list error and applies filters and pagination to the URL request', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    const row = { id: 'post-1', slug: 'article', title: 'Sinus care basics', next_action: 'needs_review', next_action_label: 'Needs review', category_id: 'category-1', category_key: 'ent-health', status: 'draft' as const, aggregate_revision: 1, first_published_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', en_status: { revision: 1, complete: true, reviewed: false }, ar_status: { revision: 0, complete: false, reviewed: false } };
    const list = vi.spyOn(blogsApi, 'list').mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Offline.')).mockResolvedValue({ data: [row], page: 1, page_size: 12, total: 24 });
    render(<BlogList onExpired={vi.fn()} onEdit={vi.fn()} />); expect(await screen.findByText('Offline.')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Sinus care basics')).toBeInTheDocument(); expect(screen.getByText('Needs review')).toBeInTheDocument(); expect(screen.getByText('ent-health · draft')).toBeInTheDocument(); expect(screen.getByText('EN: complete / unreviewed · AR: incomplete / unreviewed')).toBeInTheDocument(); fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'draft' } }); await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'draft' }), expect.anything()));
    fireEvent.change(screen.getByLabelText('Category', { selector: '#blog-category' }), { target: { value: 'ent-health' } }); await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'draft', category: 'ent-health' }), expect.anything()));
    fireEvent.click(await screen.findByRole('button', { name: 'Next' })); await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, status: 'draft', category: 'ent-health' }), expect.anything()));
    expect(window.location.search).toContain('page=2');
  });

  it('shows and retries an authoring-options failure', async () => {
    vi.spyOn(blogsApi, 'options').mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Options offline.')).mockResolvedValueOnce({ data: options });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    render(<BlogList onExpired={vi.fn()} onEdit={vi.fn()} />);
    expect(await screen.findByText('Options offline.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No blog articles yet.')).toBeInTheDocument();
    expect(blogsApi.options).toHaveBeenCalledTimes(2);
  });
});

describe('BlogList create prerequisites and title', () => {
  it('explains zero categories and disables Create', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { ...options, categories: [] } });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    render(<BlogList onExpired={vi.fn()} onEdit={vi.fn()} />); fireEvent.click(await screen.findByText('Create article'));
    expect(await screen.findByText('No categories exist yet. Ask an operator to run the category import.')).toBeInTheDocument();
    expect(screen.queryByText(/admin categories import/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
  });

  it('sends the title and previews the derived slug', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    const create = vi.spyOn(blogsApi, 'create').mockResolvedValue({ data: { id: 'post-3', aggregate_revision: 1 } });
    const edit = vi.fn(); render(<BlogList onExpired={vi.fn()} onEdit={edit} />); fireEvent.click(await screen.findByText('Create article'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create draft' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Sinus care basics' } });
    expect(screen.getByLabelText('Slug (optional)')).toHaveAttribute('placeholder', 'sinus-care-basics');
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(edit).toHaveBeenCalledWith('post-3'));
    expect(create).toHaveBeenCalledWith('category-1', '', expect.any(String), 'Sinus care basics');
  });
});

describe('BlogList needs-action filter', () => {
  it('offers a Needs action status that is sent to the API', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: options });
    const list = vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    render(<BlogList onExpired={vi.fn()} onEdit={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: 'needs_action' } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'needs_action' }), expect.anything()));
  });
});
