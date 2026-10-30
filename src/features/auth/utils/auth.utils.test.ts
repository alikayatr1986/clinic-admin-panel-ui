import { describe, expect, it } from 'vitest';
import { safeReturnTarget } from './auth.utils';

describe('safe return targets', () => {
  it.each(['https://evil.example/admin', '//evil.example/admin', '/admin/../../outside', '/administrator', '/admin\\evil', '/admin/login', '/admin/login/', null])('rejects %s', (target) => {
    expect(safeReturnTarget(target)).toBe('/admin/');
  });
  it('preserves an internal path and query', () => {
    expect(safeReturnTarget('/admin/blogs?status=draft')).toBe('/admin/blogs?status=draft');
  });
});
