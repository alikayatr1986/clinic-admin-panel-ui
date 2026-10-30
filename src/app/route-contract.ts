import type { RouteObject } from 'react-router-dom';

/** Route identifiers remain stable while the legacy screens are migrated. */
export const adminRouteContracts: RouteObject[] = [
  { id: 'dashboard', path: '/' },
  { id: 'login', path: '/login' },
  { id: 'blog-list', path: '/blogs' },
  { id: 'blog-create', path: '/blogs/new' },
  { id: 'blog-detail', path: '/blogs/:id' },
  { id: 'blog-edit', path: '/blogs/:id/edit' },
  { id: 'blog-preview', path: '/blogs/:id/preview' },
  { id: 'gallery-list', path: '/gallery' },
  { id: 'gallery-create', path: '/gallery/new' },
  { id: 'gallery-detail', path: '/gallery/:id' },
  { id: 'gallery-edit', path: '/gallery/:id/edit' },
  { id: 'lead-list', path: '/leads' },
  { id: 'lead-detail', path: '/leads/:id' },
  { id: 'not-found', path: '*' },
];
