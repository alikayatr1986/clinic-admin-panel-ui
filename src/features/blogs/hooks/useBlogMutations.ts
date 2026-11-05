import { getSessionGeneration } from "../../../lib/session-generation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { blogsApi } from "../services/blogs.service";
import { blogKeys } from "./blog.keys";
import type {
  BlogCreateMutationInput,
  BlogCreateResult,
  BlogFeatureParams,
  BlogGenerationApplyParams,
  BlogGenerationJob,
  BlogGenerationJobParams,
  BlogGenerationQueueParams,
  BlogHomeSettings,
  BlogMediaResult,
  BlogPublishParams,
  BlogReviewParams,
  BlogSaveParams,
  BlogSaveResult,
  BlogUnpublishParams,
  BlogUploadParams,
} from "../types/blogs.types";

export function useCreateBlogPost() {
  const client = useQueryClient();
  return useMutation<BlogCreateResult, Error, BlogCreateMutationInput>({
    mutationFn: async (input) =>
      (
        await blogsApi.create(
          input.categoryID,
          input.slug,
          input.idempotencyKey,
          input.title,
        )
      ).data,
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: blogKeys.lists() });
    },
  });
}

export function useSaveBlogPost() {
  const client = useQueryClient();
  return useMutation<BlogSaveResult, Error, BlogSaveParams>({
    mutationFn: async ({ id, input }) => (await blogsApi.save(id, input)).data,
    retry: false,
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: blogKeys.detail(id) });
      void client.invalidateQueries({ queryKey: blogKeys.lists() });
    },
  });
}

export function useUploadBlogCover() {
  const client = useQueryClient();
  return useMutation<BlogMediaResult, Error, BlogUploadParams>({
    mutationFn: async ({
      id,
      file,
      expectedRevision,
      rights,
      focalX,
      focalY,
      onProgress,
    }) =>
      (
        await blogsApi.upload(
          id,
          file,
          expectedRevision,
          rights,
          focalX,
          focalY,
          onProgress,
        )
      ).data,
    retry: false,
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: blogKeys.detail(id) });
    },
  });
}

export function usePublishBlogPost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      expectedAggregateRevision,
      categoryID,
      enRevisionID,
      arRevisionID,
    }: BlogPublishParams) =>
      blogsApi.publish(id, {
        expected_aggregate_revision: expectedAggregateRevision,
        category_id: categoryID,
        en_revision_id: enRevisionID,
        ar_revision_id: arRevisionID,
      }),
    retry: false,
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: blogKeys.detail(id) });
      void client.invalidateQueries({ queryKey: blogKeys.lists() });
    },
  });
}

export function useUnpublishBlogPost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision }: BlogUnpublishParams) =>
      blogsApi.unpublish(id, revision),
    retry: false,
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: blogKeys.detail(id) });
      void client.invalidateQueries({ queryKey: blogKeys.lists() });
    },
  });
}

export function useDeleteBlogPost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogsApi.delete(id),
    retry: false,
    onSuccess: (_result, id) => {
      void client.invalidateQueries({ queryKey: blogKeys.detail(id) });
      void client.invalidateQueries({ queryKey: blogKeys.lists() });
    },
  });
}

export function useReviewBlogPost() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revisionID, kind, reference }: BlogReviewParams) =>
      blogsApi.review(id, revisionID, kind, reference),
    retry: false,
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: blogKeys.detail(id) });
    },
  });
}

export function useFeatureBlogPost() {
  const client = useQueryClient();
  return useMutation<BlogHomeSettings, Error, BlogFeatureParams>({
    mutationFn: async ({ revision, postID }) =>
      (await blogsApi.feature(revision, postID)).data,
    retry: false,
    onMutate: () => getSessionGeneration(),
    onSuccess: (data, _variables, generation) => {
      if (generation !== getSessionGeneration()) return;
      client.setQueryData(blogKeys.home(), data);
    },
  });
}

export function useQueueBlogGeneration() {
  return useMutation<BlogGenerationJob, Error, BlogGenerationQueueParams>({
    mutationFn: async ({ id, lang, idempotencyKey, baseRevision, brief }) =>
      (
        await blogsApi.queueGeneration(id, {
          lang,
          idempotency_key: idempotencyKey,
          base_revision: baseRevision,
          brief,
        })
      ).data,
    retry: false,
  });
}

export function useCancelBlogGeneration() {
  return useMutation({
    mutationFn: ({ id, jobID }: BlogGenerationJobParams) =>
      blogsApi.cancelGeneration(id, jobID),
    retry: false,
  });
}

export function useDiscardBlogGeneration() {
  return useMutation({
    mutationFn: ({ id, jobID }: BlogGenerationJobParams) =>
      blogsApi.discardGeneration(id, jobID),
    retry: false,
  });
}

export function useApplyBlogGeneration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, jobID, selectedFields }: BlogGenerationApplyParams) =>
      blogsApi.applyGeneration(id, jobID, selectedFields),
    retry: false,
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: blogKeys.detail(id) });
      void client.invalidateQueries({ queryKey: blogKeys.lists() });
    },
  });
}
