import { createElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import { DashboardRoute, NotFoundRoute, BlogListRoute, BlogCreateRoute, BlogDetailRoute, BlogEditRoute, GalleryListRoute, GalleryDetailRoute, GalleryEditorRoute, LeadListRoute, LeadDetailRoute, SettingsRoute } from './RoutePages';

export const adminRouteContracts: RouteObject[] = [
  { id: 'dashboard', path: '/', element: createElement(DashboardRoute) },
  { id: 'login', path: '/login' },
  { id: 'blog-list', path: '/blogs', element: createElement(BlogListRoute) },
  { id: 'blog-create', path: '/blogs/new', element: createElement(BlogCreateRoute) },
  { id: 'blog-detail', path: '/blogs/:id', element: createElement(BlogDetailRoute) },
  { id: 'blog-edit', path: '/blogs/:id/edit', element: createElement(BlogEditRoute) },
  { id: 'blog-preview', path: '/blogs/:id/preview', element: createElement(BlogEditRoute) },
  { id: 'gallery-list', path: '/gallery', element: createElement(GalleryListRoute) },
  { id: 'gallery-create', path: '/gallery/new', element: createElement(GalleryEditorRoute) },
  { id: 'gallery-detail', path: '/gallery/:id', element: createElement(GalleryDetailRoute) },
  { id: 'gallery-edit', path: '/gallery/:id/edit', element: createElement(GalleryEditorRoute) },
  { id: 'lead-list', path: '/leads', element: createElement(LeadListRoute) },
  { id: 'lead-detail', path: '/leads/:id', element: createElement(LeadDetailRoute) },
  { id: 'settings', path: '/settings', element: createElement(SettingsRoute) },
  { id: 'not-found', path: '*', element: createElement(NotFoundRoute) },
];
