export interface AdminNavigation {
  pathname: string;
  search: string;
  navigate: (path: string, options?: { replace?: boolean; bypassBlock?: boolean }) => void;
  registerBlocker: (callback: (() => boolean) | null) => void;
}
