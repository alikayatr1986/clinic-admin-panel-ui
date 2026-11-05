import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminApp } from '../../../app/AdminApp';
import { authApi } from '../services/auth.service';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { getLeadFilters, setLeadFilters } from '../../leads/hooks/leadFilters';
import { useLeadStatus } from '../../leads/hooks/useLeads';
import { leadsKeys } from '../../leads/hooks/leads.keys';
import { leadsApi } from '../../leads/services/leads.service';
import type { Lead } from '../../leads/types/leads.types';
import { queryClient } from '../../../lib/query-client';
import { authKeys } from '../hooks/useAuth';
import { galleryApi } from '../../gallery/services/gallery.service';
import { useSaveGalleryContent } from '../../gallery/hooks/useGallery';
import { galleryKeys } from '../../gallery/hooks/gallery.keys';
import { useFeatureBlogPost } from '../../blogs/hooks/useBlogMutations';
import { blogKeys } from '../../blogs/hooks/blog.keys';
import { blogsApi } from '../../blogs/services/blogs.service';
import { useBlogDraft } from '../../blogs/context/BlogDraftContext';
import type { BlogDraftRecord } from '../../blogs/types/blogs.types';
import type { AdminShellProps } from '../types/auth.types';
import { NavigationBoundary } from '../../../app/navigation';
import { adminRouteContracts } from '../../../app/route-contract';

vi.mock('../../gallery/components/GalleryCaseEditor', () => ({
  GalleryCaseEditor: ({ onExpired }: Pick<AdminShellProps, 'onExpired'>) => {
    const { draft, saveDraft } = useBlogDraft('test');
    return <><label>Local draft<input value={draft?.rights ?? ''} onChange={(event) => saveDraft({ rights: event.target.value, dirty: true } as BlogDraftRecord)} /></label><button onClick={() => { onExpired(); onExpired(); }}>Expire twice</button></>;
  },
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('keeps the original return location when expiry is reported twice', async () => {
  window.history.replaceState({}, '', '/admin/gallery/case-1/edit?tab=details');
  vi.spyOn(authApi, 'session').mockResolvedValue({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } });
  vi.spyOn(authApi, 'login').mockResolvedValue({ data: { session_id: 'id' } });
  const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
  const user = userEvent.setup(); render(<RouterProvider router={router} />);
  await user.type(await screen.findByLabelText('Local draft'), 'unsaved');
  await user.click(await screen.findByRole('button', { name: 'Expire twice' }));
  await user.type(await screen.findByLabelText('Username'), 'staff'); await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(window.location.pathname + window.location.search).toBe('/admin/gallery/case-1/edit?tab=details'));
  expect(screen.getByLabelText('Local draft')).toHaveValue('unsaved');
  expect(queryClient.getQueryData([...authKeys.session(), 'pending'])).toBeUndefined();
  router.dispose();
});


it('clears private state before accepting a different identity and ignores late private results', async () => {
  window.history.replaceState({}, '', '/admin/gallery/case-1/edit');
  vi.spyOn(authApi, 'session')
    .mockResolvedValueOnce({ data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' } })
    .mockResolvedValueOnce({ data: { username: 'other', role: 'staff', expires_at: '2030-01-01' } });
  vi.spyOn(authApi, 'login').mockResolvedValue({ data: { session_id: 'id' } });
  vi.spyOn(galleryApi, 'list').mockResolvedValue({ data: [], total: 0, page: 1, page_size: 1 });
  const router = createBrowserRouter([{ element: <NavigationBoundary />, children: [{ element: <AdminApp />, children: adminRouteContracts }] }], { basename: '/admin' });
  const user = userEvent.setup(); render(<RouterProvider router={router} />);
  await user.type(await screen.findByLabelText('Local draft'), 'private draft');
  queryClient.setQueryData(['private', 'record'], 'secret');
  setLeadFilters({ page: 3, page_size: 20, status: 'qualified', preferred_contact: 'email', procedure: 'private' });
  let finishLead!: (value: { data: Lead }) => void;
  vi.spyOn(leadsApi, 'status').mockReturnValue(new Promise((resolve) => { finishLead = resolve; }));
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const leadMutation = renderHook(() => useLeadStatus(), { wrapper });
  let finishGallery!: (value: Awaited<ReturnType<typeof galleryApi.updateContent>>) => void;
  let finishBlog!: (value: Awaited<ReturnType<typeof blogsApi.feature>>) => void;
  vi.spyOn(galleryApi, 'updateContent').mockReturnValue(new Promise((resolve) => { finishGallery = resolve; }));
  vi.spyOn(blogsApi, 'feature').mockReturnValue(new Promise((resolve) => { finishBlog = resolve; }));
  const galleryMutation = renderHook(() => useSaveGalleryContent(), { wrapper });
  const blogMutation = renderHook(() => useFeatureBlogPost(), { wrapper });
  let galleryPending!: Promise<unknown>;
  let blogPending!: Promise<unknown>;
  await act(async () => {
    galleryPending = galleryMutation.result.current.mutateAsync({ lang: 'en' } as Parameters<typeof galleryApi.updateContent>[0]);
    blogPending = blogMutation.result.current.mutateAsync({ revision: 1, postID: null });
    await Promise.resolve();
  });
  let leadPending!: Promise<unknown>;
  await act(async () => { leadPending = leadMutation.result.current.mutateAsync({ id: 'opaque', status: 'contacted', revision: 1 }); await Promise.resolve(); });
  let resolveOld!: (value: string) => void;
  const oldRequest = queryClient.fetchQuery({ queryKey: ['private', 'late'], queryFn: () => new Promise<string>((resolve) => { resolveOld = resolve; }) }).catch(() => undefined);
  queryClient.getMutationCache().build(queryClient, { mutationFn: async () => 'secret' });
  await user.click(screen.getByRole('button', { name: 'Expire twice' }));
  await user.type(await screen.findByLabelText('Username'), 'other');
  await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(window.location.pathname).toMatch(/^\/admin\/?$/));
  resolveOld('old private data'); await oldRequest;
  await act(async () => { finishLead({ data: { id: 'opaque', status: 'contacted', revision: 2 } as Lead }); await leadPending; });
  await act(async () => {
    finishGallery({} as Awaited<ReturnType<typeof galleryApi.updateContent>>);
    finishBlog({ data: {} } as Awaited<ReturnType<typeof blogsApi.feature>>);
    await Promise.all([galleryPending, blogPending]);
  });
  expect(queryClient.getQueryData(galleryKeys.content('en'))).toBeUndefined();
  expect(queryClient.getQueryData(blogKeys.home())).toBeUndefined();
  expect(queryClient.getQueryData(leadsKeys.detail('opaque'))).toBeUndefined();
  expect(getLeadFilters().filters).toEqual({ page: 1, page_size: 20, status: '', preferred_contact: '', procedure: '' });
  expect(queryClient.getQueryData(['private', 'record'])).toBeUndefined();
  expect(queryClient.getQueryData(['private', 'late'])).toBeUndefined();
  expect(queryClient.getQueryData([...authKeys.session(), 'pending'])).toBeUndefined();
  expect(queryClient.getQueryData(authKeys.session())).toMatchObject({ username: 'other' });
  expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  expect(screen.queryByLabelText('Local draft')).not.toBeInTheDocument();
  router.dispose();
});
