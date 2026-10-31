export { describeError } from '../../../lib/api';

export function safeReturnTarget(value: string | null): string {
  if (!value || !value.startsWith('/admin') || value.includes('\\')) return '/admin/';
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || !/^\/admin(?:\/|$)/.test(url.pathname) || /^\/admin\/login\/?$/.test(url.pathname)) return '/admin/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/admin/';
  }
}
