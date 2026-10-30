import { createContext, useContext, useEffect, useRef } from 'react';
import { Outlet, useBlocker, useLocation, useNavigate } from 'react-router-dom';
import type { AdminNavigation } from './navigation.types';

const Context = createContext<AdminNavigation | null>(null);
export const useAdminNavigation = () => useContext(Context);

export function NavigationBoundary() {
  const location = useLocation();
  const navigate = useNavigate();
  const guard = useRef<(() => boolean) | null>(null);
  const bypass = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (bypass.current) return false;
    const editor = (path: string) => path.replace(/\/$/, '').replace(/\/(?:edit|preview)$/, '');
    if (/^\/blogs\/[^/]+(?:\/(?:edit|preview))?\/?$/.test(nextLocation.pathname) && editor(currentLocation.pathname) === editor(nextLocation.pathname)) return false;
    return guard.current ? !guard.current() : false;
  });
  useEffect(() => { if (blocker.state === 'blocked') blocker.reset(); }, [blocker]);
  const value: AdminNavigation = {
    pathname: `/admin${location.pathname === '/' ? '/' : location.pathname}`,
    search: location.search,
    navigate: (path, options) => {
      bypass.current = options?.bypassBlock ?? false;
      void navigate(path.replace(/^\/admin(?=\/|$)/, '') || '/', { replace: options?.replace });
      bypass.current = false;
    },
    registerBlocker: (callback) => { guard.current = callback; },
  };
  return <Context.Provider value={value}><Outlet /></Context.Provider>;
}
