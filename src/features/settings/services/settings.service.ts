import { adminRequest } from '../../../lib/api';
import type {
  BlogCategorySetting,
  BlogCategoryInput,
  ActivateTimeframeInput,
  ProcedureSetting,
  ProcedureFormData,
  CreateTimeframeInput,
  ReorderTimeframesInput,
  TimeframeDeleteResponse,
  TimeframeListResponse,
  TimeframeReorderResponse,
  TimeframeSingleResponse,
  UpdateTimeframeInput,
} from '../types/settings.types';

const timeframePath = (id: string) =>
  `/admin/api/settings/timeframes/${encodeURIComponent(id)}` as const;

export const settingsApi = {
  listBlogCategories(signal?: AbortSignal): Promise<{ data: BlogCategorySetting[] }> { return adminRequest('/admin/api/settings/blog-categories', { signal }); },
  saveBlogCategory(input: BlogCategoryInput, id?: string): Promise<unknown> { return adminRequest(id ? `/admin/api/settings/blog-categories/${encodeURIComponent(id)}` : '/admin/api/settings/blog-categories', { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) }); },
  blogCategoryAction(id: string, action: 'retire' | 'delete'): Promise<unknown> { return adminRequest(`/admin/api/settings/blog-categories/${encodeURIComponent(id)}${action === 'retire' ? '/retire' : ''}`, { method: action === 'retire' ? 'POST' : 'DELETE' }); },
  listProcedures(signal?: AbortSignal): Promise<{ data: ProcedureSetting[] }> {
    return adminRequest('/admin/api/settings/procedures', { signal });
  },
  createProcedure(input: ProcedureFormData): Promise<{ data: ProcedureSetting }> {
    return adminRequest('/admin/api/settings/procedures', { method: 'POST', body: JSON.stringify(input) });
  },
  updateProcedure(id: string, input: Omit<ProcedureFormData, 'code'>): Promise<{ data: ProcedureSetting }> {
    return adminRequest(`/admin/api/settings/procedures/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
  },
  procedureAction(id: string, action: 'activate' | 'retire' | 'delete'): Promise<unknown> {
    const suffix = action === 'delete' ? '' : `/${action}`;
    return adminRequest(`/admin/api/settings/procedures/${encodeURIComponent(id)}${suffix}`, { method: action === 'delete' ? 'DELETE' : 'POST' });
  },
  reorderProcedures(ordered_ids: string[]): Promise<unknown> {
    return adminRequest('/admin/api/settings/procedures/reorder', { method: 'PUT', body: JSON.stringify({ ordered_ids }) });
  },

  listTimeframes(status?: string, signal?: AbortSignal): Promise<TimeframeListResponse> {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return adminRequest<TimeframeListResponse>(`/admin/api/settings/timeframes${query}`, { signal });
  },

  createTimeframe(input: CreateTimeframeInput): Promise<TimeframeSingleResponse> {
    return adminRequest<TimeframeSingleResponse>('/admin/api/settings/timeframes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateTimeframe(id: string, input: UpdateTimeframeInput): Promise<TimeframeSingleResponse> {
    return adminRequest<TimeframeSingleResponse>(timeframePath(id), {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  activateTimeframe(id: string, input: ActivateTimeframeInput): Promise<TimeframeSingleResponse> {
    return adminRequest<TimeframeSingleResponse>(`${timeframePath(id)}/activate`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  retireTimeframe(id: string): Promise<TimeframeSingleResponse> {
    return adminRequest<TimeframeSingleResponse>(`${timeframePath(id)}/retire`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  deleteTimeframe(id: string): Promise<TimeframeDeleteResponse> {
    return adminRequest<TimeframeDeleteResponse>(timeframePath(id), {
      method: 'DELETE',
    });
  },

  reorderTimeframes(orderedIds: string[]): Promise<TimeframeReorderResponse> {
    const payload: ReorderTimeframesInput = { ordered_ids: orderedIds };
    return adminRequest<TimeframeReorderResponse>('/admin/api/settings/timeframes/reorder', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

