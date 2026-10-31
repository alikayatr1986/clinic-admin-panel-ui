export interface AdminSession {
  username: string;
  role: 'admin' | 'staff';
  expires_at: string;
}

export type LoginPageProps = { onLogin: (username: string, password: string) => Promise<void> };
export type { AdminShellProps } from '../../../types/layout.types';
