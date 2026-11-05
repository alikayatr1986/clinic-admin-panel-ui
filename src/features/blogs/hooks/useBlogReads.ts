import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionGeneration } from '../../../lib/session-generation';
import { ApiError } from "../../../lib/api";
import { blogsApi } from "../services/blogs.service";
import { blogKeys } from "./blog.keys";
import type {
  BlogDetail,
  BlogGenerationJob,
  BlogHomeSettings,
  BlogLocale,
  BlogOptions,
  BlogPreviewDetail,
} from "../types/blogs.types";

export function useBlogHome() {
  return useQuery<BlogHomeSettings, Error>({
    queryKey: blogKeys.home(),
    queryFn: async ({ signal }) => (await blogsApi.home(signal)).data,
    staleTime: 0,
    retry: false,
  });
}

export function useBlogPreview(
  postID: string,
  locale: BlogLocale,
  revision?: number,
) {
  return useQuery<BlogPreviewDetail, Error>({
    queryKey: blogKeys.preview(postID, locale, revision ?? 0),
    queryFn: async ({ signal }) =>
      (await blogsApi.preview(postID, locale, revision!, signal)).data,
    enabled: Boolean(postID && revision),
    staleTime: 0,
    retry: false,
  });
}

/**
 * Editor and generation reads are imperative so draft form state stays authoritative:
 * callers decide when fetched server data is applied to local fields.
 */
export function useBlogEditorReads(postID?: string, jobID?: string) {
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: blogKeys.detail(postID ?? ""),
    queryFn: async ({ signal }) => (await blogsApi.get(postID!, signal)).data,
    enabled: false,
  });
  const options = useQuery({
    queryKey: blogKeys.options(),
    queryFn: async ({ signal }) => (await blogsApi.options(signal)).data,
    enabled: false,
  });
  const generation = useQuery({
    queryKey: blogKeys.generation(postID ?? "", jobID ?? ""),
    queryFn: async ({ signal }) =>
      (await blogsApi.getGeneration(postID!, jobID!, signal)).data,
    enabled: false,
  });
  const loadDetail = useCallback(
    (id: string, expectedRevision?: number, current: () => boolean = () => true) => {
      const session = getSessionGeneration();
      return client.fetchQuery<BlogDetail>({
        queryKey: blogKeys.detail(id),
        queryFn: async ({ signal }) => {
          const data = (await blogsApi.get(id, signal)).data;
          if (!current() || session !== getSessionGeneration()) throw new DOMException('Superseded', 'AbortError');
          if (
            expectedRevision !== undefined &&
            data.aggregate_revision !== expectedRevision
          ) {
            throw new ApiError(
              409,
              "BLOG_CONFLICT",
              "Saved detail changed during refresh.",
            );
          }
          return data;
        },
        staleTime: 0,
        retry: false,
      });
    },
    [client],
  );
  const loadOptions = useCallback(() => {
    const session = getSessionGeneration();
    return client.fetchQuery<BlogOptions>({
      queryKey: blogKeys.options(),
      queryFn: async ({ signal }) => {
        const data = (await blogsApi.options(signal)).data;
        if (session !== getSessionGeneration()) throw new DOMException('Superseded', 'AbortError');
        return data;
      },
      staleTime: 0,
      retry: false,
    });
  }, [client]);
  const loadGeneration = useCallback(
    (id: string, jobID: string, current: () => boolean = () => true) => {
      const session = getSessionGeneration();
      return client.fetchQuery<BlogGenerationJob>({
        queryKey: blogKeys.generation(id, jobID),
        gcTime: 300_000,
        queryFn: async ({ signal }) => {
          const data = (await blogsApi.getGeneration(id, jobID, signal)).data;
          if (!current() || session !== getSessionGeneration()) throw new DOMException('Superseded', 'AbortError');
          return data;
        },
        staleTime: 0,
        retry: false,
      });
    },
    [client],
  );
  return {
    detail,
    options,
    generation,
    loadDetail,
    loadOptions,
    loadGeneration,
  };
}
