import { useEffect, useRef, useState } from 'react';
import type { AdminShellProps } from '../../types/layout.types';
import { getNavItems } from './navigation';
import { AdminSidebar } from './AdminSidebar';
import { describeError } from '../../lib/api';

export function AdminShell({
  path,
  session,
  routeId,
  onNavigate,
  onLogout,
  children,
}: AdminShellProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const navItems = getNavItems(session.role);

  useEffect(() => {
    setLogoutError('');
  }, [path, routeId]);

  const pageTitle =
    routeId === 'lead-list'
      ? 'Leads'
      : routeId === 'lead-detail'
      ? 'Lead details'
      : routeId === 'gallery-list'
      ? 'Gallery'
      : routeId === 'gallery-create'
      ? 'Create gallery case'
      : routeId === 'gallery-detail'
      ? 'Gallery case details'
      : routeId === 'gallery-edit'
      ? 'Gallery case editor'
      : routeId === 'blog-list'
      ? 'Blogs'
      : routeId === 'blog-create'
      ? 'Create article'
      : routeId === 'blog-detail'
      ? 'Article detail'
      : routeId === 'blog-edit'
      ? 'Blog editor'
      : routeId === 'blog-preview'
      ? 'Article preview'
      : routeId === 'not-found'
      ? 'Page not found'
      : 'Dashboard';

  async function submitLogout() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await onLogout();
    } catch (error) {
      setLogoutError(describeError(error));
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-linen text-midnight flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-midnight focus:shadow"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full items-center justify-between px-5 py-4">
          <div>
            <p className="font-semibold text-midnight">Clinic administration</p>
            <p className="text-sm text-slate-600">
              Signed in as {session.username} · {session.role}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={loggingOut}
              onClick={() => void submitLogout()}
              className="rounded-md border border-slate-300 px-3 py-2 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>

            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={isOpenMobile}
              onClick={() => setIsOpenMobile(true)}
              className="lg:hidden rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main layout: content on left, sidebar on right */}
      <div className="flex flex-1 flex-col lg:flex-row">
        <main id="main-content" className="flex-1 min-w-0 px-5 py-6 lg:px-8 lg:py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-crimson">
            Staff workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{pageTitle}</h1>

          {logoutError && (
            <p role="alert" className="mt-5 rounded-md bg-red-50 p-4 text-red-800">
              {logoutError}
            </p>
          )}

          {children}
        </main>

        <AdminSidebar
          items={navItems}
          currentPath={path}
          onNavigate={onNavigate}
          isOpenMobile={isOpenMobile}
          onCloseMobile={() => setIsOpenMobile(false)}
          triggerRef={menuButtonRef}
        />
      </div>
    </div>
  );
}

