import type { NavItem } from '../../types/layout.types';

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin/' },
  { id: 'gallery', label: 'Gallery', path: '/admin/gallery' },
  { id: 'blogs', label: 'Blogs', path: '/admin/blogs' },
  { id: 'leads', label: 'Leads', path: '/admin/leads', adminOnly: true },
  { id: 'settings', label: 'Settings', path: '/admin/settings' },
];

export function getNavItems(role: 'admin' | 'staff'): NavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin');
}

export function isNavItemActive(item: NavItem, currentPath: string): boolean {
  const cleanPath = currentPath.split('?')[0].replace(/\/$/, '') || '/admin';
  const itemPath = item.path.replace(/\/$/, '') || '/admin';

  if (item.id === 'dashboard') {
    return cleanPath === '/admin';
  }

  if (cleanPath === itemPath) {
    return true;
  }

  return cleanPath.startsWith(`${itemPath}/`);
}
