import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { NavigationBoundary } from '../../../app/navigation';
import { adminRouteContracts } from '../../../app/route-contract';
import type { ReactElement } from 'react';
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { authApi } from '../services/auth.service';
import { queryClient } from '../../../lib/query-client';
import { galleryApi } from '../../gallery/services/gallery.service';
import { blogsApi } from '../../blogs/services/blogs.service';
import { AdminApp } from '../../../app/AdminApp';
import { leadsApi } from '../../leads/services/leads.service';

function render(_element: ReactElement) { const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' }); return rtlRender(<RouterProvider router={router} />); }
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.cookie = 'admin_csrf=; Max-Age=0; Path=/';
  window.history.replaceState({}, '', '/admin/');
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('admin authentication shell', () => {
  it('direct-loads a trailing-slash preview and keeps dirty editor mounted through close, back and forward', async () => {
    window.history.replaceState({}, '', '/admin/blogs/post-1/preview/');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01T00:00:00Z' } });
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { id: 'post-1', slug: 'post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '', updated_at: '', en: { id: 'en-id', language: 'en', edition_revision: 8, title: 'Saved title', excerpt: '', author_name: '', body: { schema_version: 1, blocks: [] }, cover_media_id: null, cover_alt: '', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' } } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [{ id: 'cat-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة' }] } });
    vi.spyOn(blogsApi, 'preview').mockResolvedValue({ data: { id: 'post-1', slug: 'post', lang: 'en', title: 'Saved preview title', excerpt: '', author_name: '', category: { key: 'ent-health', label: 'Health' }, body: { schema_version: 1, blocks: [] }, references: [], cover: null, first_published_at: '', last_published_at: '', reading_time_minutes: 1 } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false); const user = userEvent.setup(); render(<AdminApp />);
    const region = await screen.findByRole('region', { name: 'Saved article preview' }); await waitFor(() => expect(region).toHaveFocus()); expect(window.location.pathname).toBe('/admin/blogs/post-1/preview');
    const title = screen.getByLabelText('Title'); await user.clear(title); await user.type(title, 'Local EN text');
    await user.click(screen.getByRole('button', { name: 'Return to editor' })); expect(window.location.pathname).toBe('/admin/blogs/post-1/edit'); expect(screen.queryByRole('region', { name: 'Saved article preview' })).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Preview saved revision' })).toHaveFocus();
    window.history.back(); await screen.findByRole('region', { name: 'Saved article preview' }); expect(title).toHaveValue('Local EN text'); expect(screen.getByLabelText('Title')).toBe(title);
    window.history.forward(); await waitFor(() => expect(screen.queryByRole('region', { name: 'Saved article preview' })).not.toBeInTheDocument()); expect(window.location.pathname).toBe('/admin/blogs/post-1/edit'); expect(title).toHaveValue('Local EN text');
    await user.click(screen.getByRole('button', { name: 'Preview saved revision' })); expect(window.location.pathname).toBe('/admin/blogs/post-1/preview'); expect(screen.getByLabelText('Title')).toBe(title); expect(confirm).not.toHaveBeenCalled();
  });
  it('shows pending and retries a transient session failure', async () => {
    let rejectSession!: (error: Error) => void;
    const pending = new Promise<never>((_, reject) => { rejectSession = reject; });
    vi.spyOn(authApi, 'session').mockReturnValueOnce(pending).mockResolvedValueOnce({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], total: 0, page: 1, page_size: 1 });
    render(<AdminApp />); expect(screen.getByRole('status')).toHaveTextContent('Checking staff session');
    rejectSession(new ApiError(0, 'NETWORK_ERROR', 'Cannot connect'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot connect');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
  it('keeps invalid credentials on the login page with an actionable error', async () => {
    window.history.replaceState({}, '', '/admin/login');
    vi.spyOn(authApi, 'session').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Expired'));
    vi.spyOn(authApi, 'login').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Invalid'));
    const user = userEvent.setup(); render(<AdminApp />);
    await user.type(await screen.findByLabelText('Username'), 'staff'); await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
    expect(window.location.pathname).toBe('/admin/login');
  });
  it('shows not found instead of the dashboard for an unknown route', async () => {
    window.history.replaceState({}, '', '/admin/unknown');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
  it('opens existing blog creation on the new route without fetching an article', async () => {
    window.history.replaceState({}, '', '/admin/blogs/new');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [] } });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], total: 0, page: 1, page_size: 20 });
    const get = vi.spyOn(blogsApi, 'get');
    render(<AdminApp />);
    expect(await screen.findByRole('button', { name: 'Create draft' })).toBeVisible();
    expect(get).not.toHaveBeenCalled();
  });
  it('denies staff direct lead routes without requesting protected data', async () => {
    window.history.replaceState({}, '', '/admin/leads/opaque');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    const get = vi.spyOn(leadsApi, 'get');
    render(<AdminApp />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Leads' })).not.toBeInTheDocument();
  });
  it('redirects to login when a lead request finds an expired session', async () => {
    window.history.replaceState({}, '', '/admin/leads');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => String(input).endsWith('/session')
      ? json({ data: { username: 'admin', role: 'admin', expires_at: '2030-01-01' } })
      : json({ error: { code: 'UNAUTHORIZED' } }, 401));
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/login');
  });
  it('redirects an anonymous protected route to login', async () => {
    window.history.replaceState({}, '', '/admin/gallery');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: { code: 'UNAUTHORIZED' } }, 401));
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/login');
  });

  it('logs in, displays the empty dashboard, and signs out', async () => {
    window.history.replaceState({}, '', '/admin/login');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path.endsWith('/login')) {
        document.cookie = 'admin_csrf=test-token; Path=/';
        return json({ data: { session_id: 'id' } });
      }
      if (path.endsWith('/session')) {
        return fetchMock.mock.calls.some(([url]) => String(url).endsWith('/login'))
          ? json({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01T00:00:00Z' } })
          : json({ error: { code: 'UNAUTHORIZED' } }, 401);
      }
      if (path.includes('/gallery?')) return json({ data: [], page: 1, page_size: 1, total: 0 });
      if (path.endsWith('/logout')) return json({ data: { ok: true } });
      throw new Error(`Unexpected ${path}`);
    });
    const user = userEvent.setup();
    render(<AdminApp />);
    await user.type(await screen.findByLabelText('Username'), 'staff');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('No gallery cases yet.')).toBeInTheDocument();
    queryClient.setQueryData(['private', 'record'], { secret: 'old session' });
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(window.location.pathname).toBe('/admin/login'));
    expect(queryClient.getQueryData(['private', 'record'])).toBeUndefined();
  });

  it('returns to login when a gallery request finds an expired session', async () => {
    window.history.replaceState({}, '', '/admin/gallery');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input);
      if (path.endsWith('/session')) return json({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01T00:00:00Z' } });
      if (path.endsWith('/gallery-options')) return json({ data: { procedures: [], timeframes: [] } });
      if (path.includes('/gallery?')) return json({ error: { code: 'UNAUTHORIZED' } }, 401);
      throw new Error(`Unexpected ${path}`);
    });
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/login');
  });

  it('warns before leaving an editor with unsaved changes', async () => {
    window.history.replaceState({}, '', '/admin/gallery/case-1/edit');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01T00:00:00Z' } });
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: { procedures: [], timeframes: [] } });
    vi.spyOn(galleryApi, 'get').mockResolvedValue({ data: {
      id: 'case-1', revision: 1, published: false, display_order: 0, crop_attested: false, media_ready: false,
      captions: [], created_at: '2026-10-24T00:00:00Z', updated_at: '2026-10-24T00:00:00Z',
    } });
    vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<AdminApp />);
    await user.type(await screen.findByLabelText('Signed consent reference'), 'signed-reference');
    await user.click(screen.getByRole('button', { name: 'Back to gallery' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe('/admin/gallery/case-1/edit');
    expect(screen.getByLabelText('Signed consent reference')).toHaveValue('signed-reference');
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Back to gallery' }));
    await waitFor(() => expect(window.location.pathname).toBe('/admin/gallery'));
  });

  it('direct-loads a blog editor and preserves Blogs, Gallery, history, and logout routing', async () => {
    window.history.replaceState({}, '', '/admin/blogs/post-1/edit'); document.cookie = 'admin_csrf=test-token; Path=/';
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01T00:00:00Z' } }); vi.spyOn(authApi, 'logout').mockResolvedValue({ data: { ok: true } });
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { id: 'post-1', slug: 'direct-post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [{ id: 'cat-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة' }] } }); vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: { procedures: [], timeframes: [] } }); vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], page: 1, page_size: 12, total: 0 });
    const user = userEvent.setup(); render(<AdminApp />); expect(await screen.findByRole('heading', { name: 'Blog editor' })).toBeInTheDocument(); expect(window.location.pathname).toBe('/admin/blogs/post-1/edit');
    await user.click(screen.getByRole('link', { name: 'Blogs' })); expect(await screen.findByText('No blog articles yet.')).toBeInTheDocument(); expect(window.location.pathname).toBe('/admin/blogs');
    await user.click(screen.getByRole('link', { name: 'Gallery' })); expect(await screen.findByText('No gallery cases match these filters.')).toBeInTheDocument(); expect(window.location.pathname).toBe('/admin/gallery');
    window.history.back(); window.dispatchEvent(new PopStateEvent('popstate')); await waitFor(() => expect(window.location.pathname).toBe('/admin/blogs')); expect(await screen.findByRole('heading', { name: 'Blogs' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' })); await waitFor(() => expect(window.location.pathname).toBe('/admin/login')); expect(screen.getByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
  });

  it('direct-loads a saved blog detail page with metadata and edit action', async () => {
    window.history.replaceState({}, '', '/admin/blogs/post-1');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01T00:00:00Z' } });
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { id: 'post-1', slug: 'saved-post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', en: { id: 'en-1', language: 'en', edition_revision: 1, title: 'Saved Title', excerpt: 'Excerpt', author_name: 'Dr. Naserzadeh', body: { schema_version: 1, blocks: [] }, cover_media_id: null, cover_alt: '', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' } } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [{ id: 'cat-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة' }] } });
    const user = userEvent.setup();
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: 'Article detail' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Saved Title' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit article' }));
    expect(await screen.findByRole('heading', { name: 'Blog editor' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/blogs/post-1/edit');
  });

  it('navigates from blog list with search params to create page and returns preserving search params', async () => {
    window.history.replaceState({}, '', '/admin/blogs?status=draft&page=2');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [{ id: 'cat-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة' }] } });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [], page: 2, page_size: 12, total: 15 });

    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: 'Articles' })).toBeInTheDocument();

    // Click Create article button
    fireEvent.click(screen.getByRole('button', { name: 'Create article' }));
    expect(await screen.findByRole('heading', { name: 'New article draft' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/blogs/new');

    // Click ← Back to blog library
    fireEvent.click(screen.getByRole('button', { name: '← Back to blog library' }));
    expect(await screen.findByRole('heading', { name: 'Articles' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/blogs');
    expect(window.location.search).toBe('?status=draft&page=2');
  });
});
