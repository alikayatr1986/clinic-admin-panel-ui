export interface AdminNavigation {
  routeId: string;
  pathname: string;
  search: string;
  navigate: (path: string, options?: { replace?: boolean; bypassBlock?: boolean }) => void;
  registerBlocker: (callback: (() => boolean) | null) => void;
}
