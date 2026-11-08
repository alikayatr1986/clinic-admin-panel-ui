import { toast } from 'sonner';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { authApi } from '../features/auth/services/auth.service';
import userEvent from '@testing-library/user-event';
import { blogsApi } from '../features/blogs/services/blogs.service';
import { galleryApi } from '../features/gallery/services/gallery.service';
import { AdminApp } from './AdminApp';
import { NavigationBoundary } from './navigation';
import { adminRouteContracts } from './route-contract';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('admin data router', () => {
  it('mounts a protected page beneath the admin basename', async () => {
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], total: 0, page: 1, page_size: 1 });
    window.history.replaceState({}, '', '/admin/');
    const router = createMemoryRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin', initialEntries: ['/admin/'] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    router.dispose();
  });
  it('keeps a dirty draft and URL when browser back is declined', async () => {
    window.history.replaceState({}, '', '/admin/');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], total: 0, page: 1, page_size: 1 });
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { id: 'post-1', slug: 'post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '', updated_at: '', en: { id: 'en-id', language: 'en', edition_revision: 8, title: 'Saved title', excerpt: '', author_name: '', body: { schema_version: 1, blocks: [] }, cover_media_id: null, cover_alt: '', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' } } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [{ id: 'cat-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة' }] } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
    const user = userEvent.setup();
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    await router.navigate('/blogs/post-1/edit');
    const title = await screen.findByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Unsaved value');
    await router.navigate('/blogs/post-1/preview', { replace: true });
    expect(confirm).not.toHaveBeenCalled();
    expect(title).toHaveValue('Unsaved value');
    await router.navigate('/blogs/post-1/edit', { replace: true });
    window.history.back();
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    await waitFor(() => expect(window.location.pathname).toBe('/admin/blogs/post-1/edit'));
    expect(title).toHaveValue('Unsaved value');
    router.dispose();
  });

  it('shows the actual unsaved bilingual draft in preview and retains it on return', async () => {
    window.history.replaceState({}, '', '/admin/blogs/post-1/edit');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { id: 'post-1', slug: 'post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '', updated_at: '', en: { id: 'en-id', language: 'en', edition_revision: 8, title: 'Saved title', excerpt: '', author_name: '', body: { schema_version: 1, blocks: [] }, cover_media_id: null, cover_alt: '', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' } } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [] } });
    vi.spyOn(blogsApi, 'preview').mockResolvedValue({ data: { id: 'post-1', slug: 'post', lang: 'en', title: 'Saved preview', excerpt: '', author_name: '', category: { key: 'ent-health', label: 'Health' }, body: { schema_version: 1, blocks: [] }, references: [], cover: null, first_published_at: '', last_published_at: '', reading_time_minutes: 1 } });
    const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
    const user = userEvent.setup(); render(<RouterProvider router={router} />);
    const title = await screen.findByLabelText('Title'); await user.clear(title); await user.type(title, 'English local');
    await user.click(screen.getByRole('tab', { name: 'العربية' })); await user.type(screen.getByLabelText('Title'), 'Arabic local');
    await user.click(screen.getByRole('button', { name: 'Preview saved revision' }));
    expect(await within(await screen.findByRole('region', { name: 'Unsaved article preview' })).findByText('Arabic local')).toBeInTheDocument();
    expect(screen.getByText('Unsaved AR draft · Non-public')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'English' }));
    expect(within(screen.getByRole('region', { name: 'Unsaved article preview' })).getByText('English local')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Return to editor' }));
    expect(screen.getByLabelText('Title')).toHaveValue('English local');
    await user.click(screen.getByRole('tab', { name: 'العربية' })); expect(screen.getByLabelText('Title')).toHaveValue('Arabic local');
    router.dispose();
  });

  it('opens a filtered blog detail link directly and returns to the filtered list', async () => {
    window.history.replaceState({}, '', '/admin/blogs?status=draft&page=2');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [] } });
    vi.spyOn(blogsApi, 'list').mockResolvedValue({ data: [{ id: 'post-1', slug: 'post', title: 'Saved title', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '', updated_at: '', next_action: '', next_action_label: '', en_status: { revision: 1, complete: true, reviewed: false }, ar_status: { revision: 0, complete: false, reviewed: false } }], page: 2, page_size: 12, total: 13 });
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { id: 'post-1', slug: 'post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '', updated_at: '' } });
    const routes = [{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }];
    const first = createBrowserRouter(routes, { basename: '/admin' });
    const rendered = render(<RouterProvider router={first} />);
    const link = await screen.findByRole('link', { name: 'Edit article' });
    const target = new URL(link.getAttribute('href')!, window.location.origin);
    expect(target.searchParams.get('returnTo')).toBe('/admin/blogs?status=draft&page=2');
    rendered.unmount(); first.dispose(); window.history.replaceState({}, '', target.pathname + target.search);
    const second = createBrowserRouter(routes, { basename: '/admin' }); render(<RouterProvider router={second} />);
    await userEvent.setup().click(await screen.findByRole('button', { name: /Back to/ }));
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe('/admin/blogs?status=draft&page=2'));
    second.dispose();
  });

  it('preserves a dirty draft on cancelled sign-out and signs out once after confirmation', async () => {
    const successToast = vi.spyOn(toast, 'success');
    window.history.replaceState({}, '', '/admin/blogs/post-1/edit');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue({ data: { success: true } } as never);
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { id: 'post-1', slug: 'post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '', updated_at: '', en: { id: 'en-id', language: 'en', edition_revision: 8, title: 'Saved title', excerpt: '', author_name: '', body: { schema_version: 1, blocks: [] }, cover_media_id: null, cover_alt: '', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' } } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [] } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
    const user = userEvent.setup(); render(<RouterProvider router={router} />);
    const title = await screen.findByLabelText('Title'); await user.clear(title); await user.type(title, 'Private draft');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(confirm).toHaveBeenCalledTimes(1); expect(logout).not.toHaveBeenCalled();
    expect(successToast).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/admin/blogs/post-1/edit'); expect(title).toHaveValue('Private draft');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2); expect(logout).toHaveBeenCalledOnce();
    expect(successToast).toHaveBeenCalledExactlyOnceWith('Signed out successfully.');
    expect(window.location.pathname).toBe('/admin/login');
    router.dispose();
  });

  it('blocks a dirty editor from navigating to the saved detail', async () => {
    window.history.replaceState({}, '', '/admin/blogs/post-1/edit');
    vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { id: 'post-1', slug: 'post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '', updated_at: '', en: { id: 'en-id', language: 'en', edition_revision: 8, title: 'Saved title', excerpt: '', author_name: '', body: { schema_version: 1, blocks: [] }, cover_media_id: null, cover_alt: '', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' } } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [] } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
    const user = userEvent.setup(); render(<RouterProvider router={router} />);
    const title = await screen.findByLabelText('Title'); await user.clear(title); await user.type(title, 'Private draft');
    await router.navigate('/blogs/post-1');
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(window.location.pathname).toBe('/admin/blogs/post-1/edit'); expect(title).toHaveValue('Private draft');
    router.dispose();
  });

  it.each(['staff', 'other'])('retains a dirty draft only for the same identity: %s', async (nextUser) => {
    window.history.replaceState({}, '', '/admin/blogs/post-1/edit');
    const session = { username: 'staff', role: 'staff' as const, expires_at: '2030-01-01' };
    vi.spyOn(authApi, 'session').mockResolvedValueOnce({ data: session }).mockResolvedValue({ data: { ...session, username: nextUser } });
    vi.spyOn(authApi, 'login').mockResolvedValue({ data: { session_id: 'id' } });
    vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], total: 0, page: 1, page_size: 1 });
    vi.spyOn(blogsApi, 'get').mockResolvedValue({ data: { id: 'post-1', slug: 'post', category_id: 'cat-1', category_key: 'ent-health', status: 'draft', aggregate_revision: 1, first_published_at: null, created_at: '', updated_at: '', en: { id: 'en-id', language: 'en', edition_revision: 8, title: 'Saved title', excerpt: '', author_name: '', body: { schema_version: 1, blocks: [] }, cover_media_id: null, cover_alt: '', reviewer_attribution: null, seo_title: '', seo_description: '', references: [], origin: 'manual', updated_at: '' } } });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({ data: { limits: {}, generation_enabled: false, categories: [{ id: 'cat-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة' }] } });
    vi.spyOn(blogsApi, 'save').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Expired'));
    const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
    const user = userEvent.setup(); render(<RouterProvider router={router} />);
    const title = await screen.findByLabelText('Title'); await user.clear(title); await user.type(title, 'Private draft');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.type(await screen.findByLabelText('Username'), nextUser); await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    if (nextUser === 'staff') { expect(await screen.findByLabelText('Title')).toHaveValue('Private draft'); expect(window.location.pathname).toBe('/admin/blogs/post-1/edit'); }
    else { expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeVisible(); expect(screen.queryByDisplayValue('Private draft')).not.toBeInTheDocument(); }
    router.dispose();
  });

  it.each([
    ['/admin/gallery?filter=active', '/admin/gallery?filter=active'],
    ['/admin/login/?returnTo=%2Fadmin%2Fgallery%3Ffilter%3Dactive', '/admin/gallery?filter=active'],
  ])('restores the requested internal URL after sign-in from %s', async (start, target) => {
    window.history.replaceState({}, '', start);
    vi.spyOn(authApi, 'session').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Expired')).mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
    vi.spyOn(authApi, 'login').mockResolvedValue({ data: { session_id: 'id' } });
    vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], total: 0, page: 1, page_size: 12 });
    vi.spyOn(galleryApi, 'options').mockResolvedValue({ data: { procedures: [], timeframes: [] } });
    const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
    const user = userEvent.setup(); render(<RouterProvider router={router} />);
    await user.type(await screen.findByLabelText('Username'), 'staff'); await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe(target));
    router.dispose();
  });

});
