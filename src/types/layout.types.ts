import type { ReactNode, RefObject } from 'react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  adminOnly?: boolean;
}

export interface AdminSidebarProps {
  items: NavItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}

export interface ShellSession { username: string; role: 'admin' | 'staff' }

export interface AdminShellProps {
  path: string;
  session: ShellSession;
  routeId: string;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
  onExpired: () => void;
  children?: ReactNode;
}

