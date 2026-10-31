import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { queryClient } from '../lib/query-client';
import { useAdminNavigation } from '../lib/admin-navigation';
import { AdminShell } from '../components/layout/AdminShell';
import { BlogDraftProvider } from '../features/blogs/context/BlogDraftContext';
import { clearLeadFilters } from '../features/leads/hooks/leadFilters';
import { authApi } from '../features/auth/services/auth.service';
import type { AdminSession } from '../features/auth/types/auth.types';
import { describeError, safeReturnTarget } from '../features/auth/utils/auth.utils';
import { LoginPage } from '../features/auth/components/LoginPage';

export function AdminApp() {
  const maybeNavigation = useAdminNavigation();
  if (!maybeNavigation) throw new Error('AdminApp requires the admin router');
  const navigation = maybeNavigation;
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [reauthenticating, setReauthenticating] = useState(false);
  const [blogNotice, setBlogNotice] = useState('');
  const identity = useRef<string | null>(null);
  const expiryPending = useRef(false);
  const blocker = useRef<(() => boolean) | null>(null);
  const returnTarget = useRef(safeReturnTarget(navigation.routeId === 'login' ? new URLSearchParams(navigation.search).get('returnTo') : navigation.pathname + navigation.search));
  const initialBlogReturn = new URLSearchParams(navigation.search).get('returnTo');
  const blogReturn = useRef(initialBlogReturn && /^\/admin\/blogs(?:\?[^#]*)?$/.test(initialBlogReturn) ? initialBlogReturn : '/admin/blogs');
  const initialGalleryReturn = new URLSearchParams(navigation.search).get('returnTo');
  const galleryReturn = useRef(initialGalleryReturn && /^\/admin\/gallery(?:\?[^#]*)?$/.test(initialGalleryReturn) ? initialGalleryReturn : '/admin/gallery');
  if (navigation.routeId === 'blog-list') blogReturn.current = navigation.pathname + navigation.search;
  if (navigation.routeId === 'gallery-list') galleryReturn.current = navigation.pathname + navigation.search;

  function updateSession(next: AdminSession | null) {
    const nextIdentity = next ? `${next.username}:${next.role}` : null;
    if (!nextIdentity || nextIdentity !== identity.current) { void queryClient.cancelQueries(); queryClient.clear(); clearLeadFilters(); }
    identity.current = nextIdentity;
    setSession(next);
  }
  async function checkSession() {
    setChecking(true); setSessionError('');
    try { const { data } = await authApi.session(); updateSession(data); if (navigation.routeId === 'login') navigation.navigate('/admin/', { replace: true, bypassBlock: true }); }
    catch (error) { if (error instanceof ApiError && error.status === 401) { setReauthenticating(true); navigation.navigate('/admin/login', { replace: true, bypassBlock: true }); } else setSessionError(describeError(error)); }
    finally { setChecking(false); }
  }
  useEffect(() => { void checkSession(); }, []);
  async function login(username: string, password: string) {
    await authApi.login(username, password);
    const { data } = await authApi.session();
    const previous = identity.current;
    updateSession(data); void queryClient.invalidateQueries(); setReauthenticating(false); expiryPending.current = false;
    navigation.navigate(previous && previous !== `${data.username}:${data.role}` ? '/admin/' : returnTarget.current, { replace: true, bypassBlock: true });
  }
  async function logout() {
    if (blocker.current && !blocker.current()) return;
    try { await authApi.logout(); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
    returnTarget.current = '/admin/'; updateSession(null); navigation.navigate('/admin/login', { replace: true, bypassBlock: true });
  }
  const handleExpired = useCallback(() => {
    if (expiryPending.current) return;
    expiryPending.current = true;
    returnTarget.current = safeReturnTarget(navigation.pathname + navigation.search);
    setReauthenticating(true); navigation.navigate('/admin/login', { replace: true, bypassBlock: true });
  }, [navigation.pathname, navigation.search, navigation.navigate]);
  const registerBlocker = useCallback((callback: (() => boolean) | null) => { blocker.current = callback; navigation.registerBlocker(callback); }, [navigation.registerBlocker]);
  const outlet = useOutlet({ session, onExpired: handleExpired, navigate: navigation.navigate, registerBlocker, blogReturn: blogReturn.current, galleryReturn: galleryReturn.current, onBlogDeleted: () => { setBlogNotice('Article deleted. New public reads are unavailable; any homepage selection falls back to the newest eligible article.'); navigation.navigate(blogReturn.current, { bypassBlock: true }); } });
  const savedOutlet = useRef(outlet);
  if (!reauthenticating) savedOutlet.current = outlet;
  if (checking) return <main className="grid min-h-screen place-items-center p-6"><p role="status">Checking staff session…</p></main>;
  if (sessionError) return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold">Unable to verify your session</h1><p role="alert" className="mt-3 text-slate-700">{sessionError}</p><button className="mt-6 rounded-md bg-crimson px-4 py-2 font-medium text-white" onClick={() => void checkSession()}>Retry</button></section></main>;
  if (!session) return <LoginPage onLogin={login} />;
  return <QueryClientProvider client={queryClient}><BlogDraftProvider key={`${session.username}:${session.role}`}><div hidden={reauthenticating}><AdminShell session={session} path={reauthenticating ? returnTarget.current.split('?')[0] : navigation.pathname} routeId={navigation.routeId} onNavigate={(path) => navigation.navigate(path)} onLogout={logout} onExpired={handleExpired}>
    {navigation.routeId === 'blog-list' && blogNotice && <p role="status" className="mt-5 rounded-md bg-green-50 p-4 text-green-900">{blogNotice}</p>}
    {reauthenticating ? savedOutlet.current : outlet}
  </AdminShell></div>{reauthenticating && <LoginPage onLogin={login} />}</BlogDraftProvider></QueryClientProvider>;
}
