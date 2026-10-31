import { useCallback, useEffect, useRef } from 'react';
import { Outlet, useBlocker, useLocation, useMatches, useNavigate } from 'react-router-dom';
import type { AdminNavigation } from '../types/navigation.types';
import { AdminNavigationContext } from '../lib/admin-navigation';


export function NavigationBoundary() {
  const location = useLocation();
  const navigate = useNavigate();
  const matches = useMatches();
  useEffect(() => { if (location.pathname.length > 1 && location.pathname.endsWith('/')) void navigate(location.pathname.replace(/\/+$/, '') + location.search, { replace: true }); }, [location.pathname, location.search, navigate]);
  const guard = useRef<(() => boolean) | null>(null);
  const bypass = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (bypass.current) return false;
    const editor = (path: string) => path.replace(/\/$/, '').replace(/\/(?:edit|preview)$/, '');
    if (/^\/blogs\/[^/]+\/(?:edit|preview)\/?$/.test(currentLocation.pathname) && /^\/blogs\/[^/]+\/(?:edit|preview)\/?$/.test(nextLocation.pathname) && editor(currentLocation.pathname) === editor(nextLocation.pathname)) return false;
    return guard.current ? !guard.current() : false;
  });
  useEffect(() => { if (blocker.state === 'blocked') blocker.reset(); }, [blocker]);
  const navigateTo = useCallback<AdminNavigation['navigate']>((path, options) => {
    bypass.current = options?.bypassBlock ?? false;
    void navigate(path.replace(/^\/admin(?=[/?]|$)/, '') || '/', { replace: options?.replace });
    bypass.current = false;
  }, [navigate]);
  const registerBlocker = useCallback<AdminNavigation['registerBlocker']>((callback) => { guard.current = callback; }, []);
  const value: AdminNavigation = {
    routeId: matches.at(-1)?.id ?? 'not-found',
    pathname: `/admin${location.pathname === '/' ? '/' : location.pathname}`,
    search: location.search,
    navigate: navigateTo,
    registerBlocker,
  };
  return <AdminNavigationContext.Provider value={value}><Outlet /></AdminNavigationContext.Provider>;
}

