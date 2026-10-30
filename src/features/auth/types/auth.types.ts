export interface AdminSession {
  username: string;
  role: 'admin' | 'staff';
  expires_at: string;
}

export type View = 'login' | 'dashboard' | 'gallery' | 'editor' | 'blogs' | 'blog-editor' | 'leads' | 'lead-detail' | 'not-found';
export type NavigateOptions = { replace?: boolean; id?: string; bypassBlock?: boolean };
export type LoginPageProps = { onLogin: (username: string, password: string) => Promise<void> };
export type AdminShellProps = { path: string; session: AdminSession; view: View; onNavigate: (view: View, options?: NavigateOptions) => void; onLogout: () => Promise<void>; onExpired: () => void; registerBlocker: (blocker: (() => boolean) | null) => void };
