import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { authApi } from '../services/auth.service';
import { useAuth } from './useAuth';

afterEach(() => {
  vi.restoreAllMocks();
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return wrapper;
}

describe('useAuth', () => {
  it('logs in, reads the resulting session, and logs out through auth hooks', async () => {
    const wrapper = setup();
    const login = vi.spyOn(authApi, 'login').mockResolvedValue({ data: { session_id: 'id' } });
    const session = vi.spyOn(authApi, 'session').mockResolvedValue({
      data: { username: 'staff', role: 'staff', expires_at: '2030-01-01' },
    });
    const logout = vi.spyOn(authApi, 'logout').mockResolvedValue({ data: { ok: true } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    const admin = await result.current.login('staff', 'secret');
    expect(login).toHaveBeenCalledWith('staff', 'secret');
    expect(session).toHaveBeenCalledWith(expect.anything());
    expect(admin.username).toBe('staff');

    await result.current.logout();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('surfaces session expiry from the session read', async () => {
    const wrapper = setup();
    vi.spyOn(authApi, 'session').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Expired'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(result.current.fetchSession()).rejects.toMatchObject({ status: 401 });
  });
});
