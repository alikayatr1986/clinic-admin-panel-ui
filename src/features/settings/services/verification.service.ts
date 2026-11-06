import { adminRequest } from '../../../lib/api';
import type { VerificationInput, VerificationMethod, VerificationSetting } from '../types/verification.types';
export const verificationApi = {
  list: (signal?: AbortSignal) => adminRequest<{ data: VerificationSetting[] }>('/admin/api/settings/verification', { signal }),
  save: (method: VerificationMethod, input: VerificationInput) => adminRequest<{ data: VerificationSetting }>(`/admin/api/settings/verification/${encodeURIComponent(method)}`, { method: 'PUT', body: JSON.stringify(input) }),
};
