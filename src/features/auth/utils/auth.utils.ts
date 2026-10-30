import { ApiError } from '../../../lib/api';

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Access denied. Your account may lack permission or your security token has expired.';
    return error.message;
  }
  return 'Something went wrong. Try again.';
}

export function safeReturnTarget(value: string | null): string {
  if (!value || !value.startsWith('/admin') || value.includes('\\')) return '/admin/';
  try { const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || !/^\/admin(?:\/|$)/.test(url.pathname) || /^\/admin\/login\/?$/.test(url.pathname)) return '/admin/';
    return url.pathname + url.search + url.hash;
  } catch { return '/admin/'; }
}
