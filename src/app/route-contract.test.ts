import { describe, expect, it } from 'vitest';
import { matchRoutes } from 'react-router-dom';
import { adminRouteContracts } from './route-contract';

describe('admin route contract', () => {
  it.each([
    ['/admin/blogs/new', 'blog-create'],
    ['/admin/blogs/123', 'blog-detail'],
    ['/admin/blogs/123/edit', 'blog-edit'],
    ['/admin/blogs/123/preview', 'blog-preview'],
    ['/admin/gallery/new', 'gallery-create'],
    ['/admin/gallery/123', 'gallery-detail'],
    ['/admin/leads/123', 'lead-detail'],
    ['/admin/unknown', 'not-found'],
  ])('matches %s to %s under the admin basename', (path, id) => {
    expect(matchRoutes(adminRouteContracts, path, '/admin')?.at(-1)?.route.id).toBe(id);
  });
});
