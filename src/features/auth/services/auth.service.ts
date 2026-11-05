import { adminRequest } from '../../../lib/api';
import type { AdminSession } from '../types/auth.types';

export const authApi = {
  login: (username: string, password: string) =>
    adminRequest<{ data: { session_id: string } }>('/admin/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  session: (signal?: AbortSignal) => adminRequest<{ data: AdminSession }>('/admin/api/session', { signal }),
  logout: () => adminRequest<{ data: { ok: boolean } }>('/admin/api/logout', { method: 'POST' }),
};
