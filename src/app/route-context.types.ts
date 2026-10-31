import type { AdminSession } from '../features/auth/types/auth.types';
export interface RouteContext {
  session: AdminSession;
  onExpired: () => void;
  navigate: (path: string, options?: { replace?: boolean; bypassBlock?: boolean }) => void;
  registerBlocker: (blocker: (() => boolean) | null) => void;
  blogReturn: string;
  galleryReturn: string;
  onBlogDeleted: () => void;
}
