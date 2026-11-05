import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../services/settings.service';
import type {
  ActivateTimeframeParams,
  CreateTimeframeInput,
  UpdateTimeframeParams,
} from '../types/settings.types';

export const settingsKeys = {
  all: ['settings'] as const,
  blogCategories: () => ['settings', 'blog-categories'] as const,
  procedures: () => ['settings', 'procedures'] as const,
  timeframes: () => ['settings', 'timeframes'] as const,
  timeframesList: (status?: string) => ['settings', 'timeframes', status ?? 'all'] as const,
};

export function useTimeframeSettingsQuery(status?: string) {
  return useQuery({
    queryKey: settingsKeys.timeframesList(status),
    queryFn: ({ signal }) => settingsApi.listTimeframes(status, signal),
    retry: false,
  });
}

export function useCreateTimeframeMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimeframeInput) => settingsApi.createTimeframe(input),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: settingsKeys.timeframes() });
      void client.invalidateQueries({ queryKey: ['gallery-options'] });
    },
  });
}

export function useUpdateTimeframeMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: UpdateTimeframeParams) => settingsApi.updateTimeframe(id, input),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: settingsKeys.timeframes() });
      void client.invalidateQueries({ queryKey: ['gallery-options'] });
    },
  });
}

export function useActivateTimeframeMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: ActivateTimeframeParams) => settingsApi.activateTimeframe(id, input),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: settingsKeys.timeframes() });
      void client.invalidateQueries({ queryKey: ['gallery-options'] });
    },
  });
}

export function useRetireTimeframeMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.retireTimeframe(id),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: settingsKeys.timeframes() });
      void client.invalidateQueries({ queryKey: ['gallery-options'] });
    },
  });
}

export function useDeleteTimeframeMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteTimeframe(id),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: settingsKeys.timeframes() });
      void client.invalidateQueries({ queryKey: ['gallery-options'] });
    },
  });
}

export function useReorderTimeframesMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => settingsApi.reorderTimeframes(orderedIds),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: settingsKeys.timeframes() });
      void client.invalidateQueries({ queryKey: ['gallery-options'] });
    },
  });
}


export function useProcedureSettingsQuery() {
  return useQuery({ queryKey: settingsKeys.procedures(), queryFn: ({ signal }) => settingsApi.listProcedures(signal), retry: false });
}

export function useProcedureMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: settingsKeys.procedures() });
      void client.invalidateQueries({ queryKey: ['gallery-options'] });
    },
  });
}

export function useBlogCategorySettingsQuery() { return useQuery({ queryKey: settingsKeys.blogCategories(), queryFn: ({ signal }) => settingsApi.listBlogCategories(signal), retry: false }); }
export function useBlogCategoryMutation() { const client = useQueryClient(); return useMutation({ mutationFn: (operation: () => Promise<unknown>) => operation(), retry: false, onSuccess: () => { void client.invalidateQueries({ queryKey: settingsKeys.blogCategories() }); void client.invalidateQueries({ queryKey: ['blog-options'] }); } }); }
