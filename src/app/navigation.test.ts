import { describe, expect, it } from 'vitest';
import { ADMIN_NAV_ITEMS, getNavItems, isNavItemActive } from '../components/layout/navigation';

describe('navigation configuration and active matching', () => {
  it('filters items by role', () => {
    const staffItems = getNavItems('staff');
    expect(staffItems.map((i) => i.id)).toEqual(['dashboard', 'gallery', 'blogs']);
    expect(staffItems.find((i) => i.id === 'leads')).toBeUndefined();

    const adminItems = getNavItems('admin');
    expect(adminItems.map((i) => i.id)).toEqual(['dashboard', 'gallery', 'blogs', 'leads']);
  });

  it('matches dashboard only on root admin path', () => {
    const dashboard = ADMIN_NAV_ITEMS.find((i) => i.id === 'dashboard')!;
    expect(isNavItemActive(dashboard, '/admin/')).toBe(true);
    expect(isNavItemActive(dashboard, '/admin')).toBe(true);
    expect(isNavItemActive(dashboard, '/admin/blogs')).toBe(false);
    expect(isNavItemActive(dashboard, '/admin/unknown')).toBe(false);
  });

  it('marks parent active on child and nested routes', () => {
    const blogs = ADMIN_NAV_ITEMS.find((i) => i.id === 'blogs')!;
    const gallery = ADMIN_NAV_ITEMS.find((i) => i.id === 'gallery')!;
    const leads = ADMIN_NAV_ITEMS.find((i) => i.id === 'leads')!;

    expect(isNavItemActive(blogs, '/admin/blogs')).toBe(true);
    expect(isNavItemActive(blogs, '/admin/blogs/new')).toBe(true);
    expect(isNavItemActive(blogs, '/admin/blogs/post-1')).toBe(true);
    expect(isNavItemActive(blogs, '/admin/blogs/post-1/edit')).toBe(true);
    expect(isNavItemActive(blogs, '/admin/blogs/post-1/preview')).toBe(true);
    expect(isNavItemActive(blogs, '/admin/gallery')).toBe(false);

    expect(isNavItemActive(gallery, '/admin/gallery')).toBe(true);
    expect(isNavItemActive(gallery, '/admin/gallery/new')).toBe(true);
    expect(isNavItemActive(gallery, '/admin/gallery/case-1')).toBe(true);
    expect(isNavItemActive(gallery, '/admin/gallery/case-1/edit')).toBe(true);
    expect(isNavItemActive(gallery, '/admin/blogs')).toBe(false);

    expect(isNavItemActive(leads, '/admin/leads')).toBe(true);
    expect(isNavItemActive(leads, '/admin/leads/lead-1')).toBe(true);
    expect(isNavItemActive(leads, '/admin/gallery')).toBe(false);
  });
});

