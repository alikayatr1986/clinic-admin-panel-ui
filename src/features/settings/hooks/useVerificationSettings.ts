import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { verificationApi } from '../services/verification.service';
import type { VerificationInput, VerificationMethod, VerificationSetting } from '../types/verification.types';
const key = ['settings', 'verification'] as const;
export function useVerificationSettingsQuery() {
  return useQuery({ queryKey: key, queryFn: ({ signal }) => verificationApi.list(signal), retry: false });
}
export function useSaveVerificationMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ method, input }: { method: VerificationMethod; input: VerificationInput }) => verificationApi.save(method, input), retry: false,
    onSuccess: ({ data }) => client.setQueryData<{ data: VerificationSetting[] }>(key, old => old && ({ data: old.data.map(item => item.method === data.method ? data : item) })) });
}
