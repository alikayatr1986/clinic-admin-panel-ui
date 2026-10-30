import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { authApi } from '../services/auth.service';
import type { AdminSession, AdminShellProps, NavigateOptions, View } from '../types/auth.types';
import { LoginPage } from './LoginPage';
import { describeError, safeReturnTarget } from '../utils/auth.utils';
import { queryClient } from '../../../lib/query-client';
import { useAdminNavigation } from '../../../app/navigation';
import { GalleryCaseList } from '../../gallery/components/GalleryCaseList';
import { GalleryCaseEditor } from '../../gallery/components/GalleryCaseEditor';
import { galleryApi } from '../../gallery/services/gallery.service';
import { BlogList } from '../../blogs/components/BlogList';
import { BlogEditor } from '../../blogs/components/BlogEditor';
import { LeadList } from '../../leads/components/LeadList';
import { LeadDetail } from '../../leads/components/LeadDetail';

const base = '/admin';

function currentView(): View {
  if (/^\/admin\/login\/?$/.test(window.location.pathname)) return 'login';
  if (/^\/admin\/leads\/[^/]+\/?$/.test(window.location.pathname)) return 'lead-detail';
  if (/^\/admin\/leads\/?$/.test(window.location.pathname)) return 'leads';
  if (/^\/admin\/gallery\/[^/]+(?:\/edit)?\/?$/.test(window.location.pathname)) return 'editor';
  if (/^\/admin\/blogs\/new\/?$/.test(window.location.pathname)) return 'blogs';
  if (/^\/admin\/blogs\/[^/]+(?:\/(?:edit|preview))?\/?$/.test(window.location.pathname)) return 'blog-editor';
  if (/^\/admin\/blogs\/?$/.test(window.location.pathname)) return 'blogs';
  if (/^\/admin\/gallery\/?$/.test(window.location.pathname)) return 'gallery';
  if (/^\/admin\/?$/.test(window.location.pathname)) return 'dashboard';
  return 'not-found';
}

export function AdminApp() {
  const routerNavigation = useAdminNavigation();
  const [view, setView] = useState<View>(currentView);
  const [session, setSession] = useState<AdminSession | null>(null);
  const sessionIdentity = useRef<string | null>(null);
  function updateSession(next: AdminSession | null) {
    const identity = next ? `${next.username}:${next.role}` : null;
    if (identity === null || identity !== sessionIdentity.current) {
      void queryClient.cancelQueries();
      queryClient.clear();
    }
    sessionIdentity.current = identity;
    setSession(next);
  }
  const [reauthenticating, setReauthenticating] = useState(false);
  const expiryPending = useRef(false);
  const returnTarget = useRef(safeReturnTarget(currentView() === 'login' ? new URLSearchParams(window.location.search).get('returnTo') : window.location.pathname + window.location.search));
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [, setRoutePath] = useState(window.location.pathname);
  const navigationBlocker = useRef<(() => boolean) | null>(null);
  const activeURL = useRef(window.location.pathname + window.location.search);

  function navigate(next: View, options: NavigateOptions = {}) {
    if (next === 'gallery' && currentView() === 'gallery') return;
    if (!options.bypassBlock && navigationBlocker.current && !navigationBlocker.current()) return;
    const path = next === 'lead-detail' ? `${base}/leads/${encodeURIComponent(options.id ?? '')}` : next === 'leads' ? `${base}/leads` : next === 'login' ? `${base}/login` : next === 'editor' ? `${base}/gallery/${encodeURIComponent(options.id ?? 'new')}` : next === 'blog-editor' ? `${base}/blogs/${encodeURIComponent(options.id ?? '')}` : next === 'blogs' ? `${base}/blogs` : next === 'gallery' ? `${base}/gallery` : `${base}/`;
    if (routerNavigation) routerNavigation.navigate(path, { ...options, bypassBlock: true });
    else window.history[options.replace ? 'replaceState' : 'pushState']({}, '', path);
    activeURL.current = path;
    setRoutePath(path);
    if (next !== 'login' || !sessionIdentity.current) setView(next);
  }

  async function checkSession() {
    setChecking(true);
    setSessionError('');
    try {
      const { data } = await authApi.session();
      updateSession(data);
      if (currentView() === 'login') navigate('dashboard', { replace: true, bypassBlock: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { setReauthenticating(true); navigate('login', { replace: true, bypassBlock: true }); }
      else setSessionError(describeError(error));
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void checkSession();
    const onPopState = () => {
      const editorPath = (url: string) => url.split('?')[0].replace(/\/$/, '').replace(/\/preview$/, '');
      const withinBlogEditor = /^\/admin\/blogs\/[^/]+(?:\/preview)?\/?$/.test(window.location.pathname) && editorPath(activeURL.current) === editorPath(window.location.pathname);
      if (!withinBlogEditor && navigationBlocker.current && !navigationBlocker.current()) {
        window.history.pushState({}, '', activeURL.current);
        return;
      }
      activeURL.current = window.location.pathname + window.location.search;
      setRoutePath(window.location.pathname);
      setView(currentView());
    };
    if (!routerNavigation) window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!routerNavigation) return;
    activeURL.current = routerNavigation.pathname + routerNavigation.search;
    setRoutePath(routerNavigation.pathname);
    if (!/^\/admin\/login\/?$/.test(routerNavigation.pathname) || !sessionIdentity.current) setView(currentView());
  }, [routerNavigation?.pathname, routerNavigation?.search]);

  async function login(username: string, password: string) {
    await authApi.login(username, password);
    const { data } = await authApi.session();
    const previousIdentity = sessionIdentity.current;
    const nextIdentity = `${data.username}:${data.role}`;
    updateSession(data);
    setReauthenticating(false);
    expiryPending.current = false;
    {
      const target = previousIdentity && previousIdentity !== nextIdentity ? '/admin/' : returnTarget.current;
      if (routerNavigation) routerNavigation.navigate(target, { replace: true, bypassBlock: true });
      else { window.history.replaceState({}, '', target); setView(currentView()); }
    }
  }

  async function logout() {
    if (navigationBlocker.current && !navigationBlocker.current()) return;
    try {
      await authApi.logout();
      returnTarget.current = '/admin/';
      updateSession(null);
      navigate('login', { replace: true, bypassBlock: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        returnTarget.current = '/admin/';
        updateSession(null);
        navigate('login', { replace: true, bypassBlock: true });
        return;
      }
      throw error;
    }
  }

  if (checking) return <main className="grid min-h-screen place-items-center p-6"><p role="status">Checking staff session…</p></main>;

  if (sessionError) return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Unable to verify your session</h1>
        <p role="alert" className="mt-3 text-slate-700">{sessionError}</p>
        <button className="mt-6 rounded-md bg-crimson px-4 py-2 font-medium text-white" onClick={() => void checkSession()}>Retry</button>
      </section>
    </main>
  );

  if (!session) return <LoginPage onLogin={login} />;

  return <><div hidden={reauthenticating}><AdminShell key={`${session.username}:${session.role}`} session={session} path={reauthenticating ? returnTarget.current.split('?')[0] : window.location.pathname} view={view} onNavigate={navigate} onLogout={logout} registerBlocker={(blocker) => { navigationBlocker.current = blocker; routerNavigation?.registerBlocker(blocker); }} onExpired={() => {
    if (expiryPending.current) return;
    expiryPending.current = true;
    returnTarget.current = safeReturnTarget(window.location.pathname + window.location.search);
    setReauthenticating(true);
    navigate('login', { replace: true, bypassBlock: true });
  }} /></div>{reauthenticating && <LoginPage onLogin={login} />}</>;
}

function AdminShell({ path, session, view, onNavigate, onLogout, onExpired, registerBlocker }: AdminShellProps) {
  const [logoutError, setLogoutError] = useState('');
  const [blogNotice, setBlogNotice] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [galleryState, setGalleryState] = useState<{ count: number; error: string; loading: boolean }>({ count: 0, error: '', loading: true });

  useEffect(() => {
    if (view !== 'dashboard') return;
    let active = true;
    galleryApi.list({ page: 1, page_size: 1 }).then(({ total }) => {
      if (active) setGalleryState({ count: total, error: '', loading: false });
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      else setGalleryState({ count: 0, error: describeError(error), loading: false });
    });
    return () => { active = false; };
  }, [view]);

  async function submitLogout() {
    setLoggingOut(true);
    setLogoutError('');
    try { await onLogout(); }
    catch (error) { setLogoutError(describeError(error)); }
    finally { setLoggingOut(false); }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-semibold text-midnight">Clinic administration</p>
            <p className="text-sm text-slate-600">Signed in as {session.username} · {session.role}</p>
          </div>
          <nav aria-label="Admin navigation" className="flex items-center gap-4">
            <a href="/admin/" onClick={(event) => { event.preventDefault(); onNavigate('dashboard'); }} className="font-medium underline-offset-4 hover:underline">Dashboard</a>
            <a href="/admin/gallery" onClick={(event) => { event.preventDefault(); onNavigate('gallery'); }} className="font-medium underline-offset-4 hover:underline">Gallery</a>
            <a href="/admin/blogs" onClick={(event) => { event.preventDefault(); onNavigate('blogs'); }} className="font-medium underline-offset-4 hover:underline">Blogs</a>
            {session.role === 'admin' && <a href="/admin/leads" onClick={(event) => { event.preventDefault(); onNavigate('leads'); }} className="font-medium underline-offset-4 hover:underline">Leads</a>}
            <button disabled={loggingOut} onClick={() => void submitLogout()} className="rounded-md border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50">{loggingOut ? 'Signing out…' : 'Sign out'}</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-crimson">Staff workspace</p>
        <h1 className="mt-2 text-3xl font-semibold">{view === 'leads' ? 'Leads' : view === 'lead-detail' ? 'Lead details' : view === 'gallery' ? 'Gallery' : view === 'editor' ? 'Gallery case editor' : view === 'blogs' ? 'Blogs' : view === 'blog-editor' ? 'Blog editor' : view === 'not-found' ? 'Page not found' : 'Dashboard'}</h1>
        {logoutError && <p role="alert" className="mt-5 rounded-md bg-red-50 p-4 text-red-800">{logoutError}</p>}
        {view === 'blogs' && blogNotice && <p role="status" className="mt-5 rounded-md bg-green-50 p-4 text-green-900">{blogNotice}</p>}
        {view === 'leads' || view === 'lead-detail' ? (session.role !== 'admin' ? <p role="alert" className="mt-6">Access denied. Administrator access is required.</p> : view === 'leads' ? <LeadList onExpired={onExpired} onOpen={(id) => onNavigate('lead-detail', { id })} /> : <LeadDetail key={path} id={path.split('/')[3] ?? ''} onExpired={onExpired} onBack={() => onNavigate('leads')} />) : view === 'blog-editor' ? <BlogEditor key={path.split('/')[3]} postID={path.split('/')[3] ?? ''} role={session.role} onExpired={onExpired} onNavigate={() => onNavigate('blogs')} onDeleted={() => { setBlogNotice('Article deleted. New public reads are unavailable; any homepage selection falls back to the newest eligible article.'); onNavigate('blogs', { bypassBlock: true }); }} registerBlocker={registerBlocker} /> :
          view === 'blogs' ? <BlogList createOpen={/^\/admin\/blogs\/new\/?$/.test(path)} onExpired={onExpired} onEdit={(id) => onNavigate('blog-editor', { id })} /> :
          view === 'editor' ? <GalleryCaseEditor key={path} caseID={path.split('/')[3] ?? 'new'} onExpired={onExpired} onNavigate={onNavigate} registerBlocker={registerBlocker} /> :
          view === 'not-found' ? <p role="alert">This page could not be found.</p> :
          view === 'gallery' ? <GalleryCaseList onExpired={onExpired} onCreate={() => onNavigate('editor', { id: 'new' })} onEdit={(id) => onNavigate('editor', { id })} /> : <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-label="Gallery overview">
          <h2 className="text-xl font-semibold">Gallery cases</h2>
          {galleryState.loading ? <p role="status" className="mt-3 text-slate-600">Loading gallery…</p> :
            galleryState.error ? <p role="alert" className="mt-3 text-red-800">{galleryState.error}</p> :
            galleryState.count === 0 ? <p className="mt-3 text-slate-600">No gallery cases yet.</p> :
            <p className="mt-3 text-slate-600">{galleryState.count} gallery {galleryState.count === 1 ? 'case' : 'cases'} available.</p>}
        </section>}
      </main>
    </div>
  );
}
