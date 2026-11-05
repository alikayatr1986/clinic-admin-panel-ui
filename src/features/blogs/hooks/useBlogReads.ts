import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { blogsApi } from '../services/blogs.service';
import { blogKeys } from './blog.keys';
import type {
  BlogDetail,
  BlogGenerationJob,
  BlogHomeSettings,
  BlogLocale,
  BlogOptions,
  BlogPreviewDetail,
} from '../types/blogs.types';

export function useBlogHome() {
  return useQuery<BlogHomeSettings, Error>({
    queryKey: blogKeys.home(),
    queryFn: async ({ signal }) => (await blogsApi.home(signal)).data,
    staleTime: 0,
    retry: false,
  });
}

export function useBlogPreview(postID: string, locale: BlogLocale, revision?: number) {
  return useQuery<BlogPreviewDetail, Error>({
    queryKey: blogKeys.preview(postID, locale, revision ?? 0),
    queryFn: async ({ signal }) => (await blogsApi.preview(postID, locale, revision!, signal)).data,
    enabled: Boolean(postID && revision),
    staleTime: 0,
    retry: false,
  });
}

/**
 * Editor and generation reads are imperative so draft form state stays authoritative:
 * callers decide when fetched server data is applied to local fields.
 */
export function useBlogEditorReads() {
  const client = useQueryClient();
  const loadDetail = useCallback(
    (id: string) =>
      client.fetchQuery<BlogDetail>({
        queryKey: blogKeys.detail(id),
        queryFn: async ({ signal }) => (await blogsApi.get(id, signal)).data,
        staleTime: 0,
      }),
    [client],
  );
  const loadOptions = useCallback(
    () =>
      client.fetchQuery<BlogOptions>({
        queryKey: blogKeys.options(),
        queryFn: async ({ signal }) => (await blogsApi.options(signal)).data,
        staleTime: 0,
      }),
    [client],
  );
  const loadGeneration = useCallback(
    (id: string, jobID: string) =>
      client.fetchQuery<BlogGenerationJob>({
        queryKey: blogKeys.generation(id, jobID),
        queryFn: async ({ signal }) => (await blogsApi.getGeneration(id, jobID, signal)).data,
        staleTime: 0,
      }),
    [client],
  );
  return { loadDetail, loadOptions, loadGeneration };
}
