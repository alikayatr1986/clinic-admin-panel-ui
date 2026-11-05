import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/auth.service';
import type { AdminSession, LoginCredentials } from '../types/auth.types';

export const authKeys = {
  session: () => ['auth', 'session'] as const,
};

export function useAuth() {
  const client = useQueryClient();

  const fetchSession = useCallback(
    () =>
      client.fetchQuery<AdminSession>({
        queryKey: authKeys.session(),
        queryFn: async ({ signal }) => (await authApi.session(signal)).data,
        staleTime: 0,
        retry: false,
      }),
    [client],
  );

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: LoginCredentials) => authApi.login(username, password),
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    retry: false,
  });

  const login = useCallback(
    async (username: string, password: string) => {
      await loginMutation.mutateAsync({ username, password });
      return fetchSession();
    },
    [loginMutation, fetchSession],
  );

  const logout = useCallback(() => logoutMutation.mutateAsync(), [logoutMutation]);

  return { fetchSession, login, logout };
}
