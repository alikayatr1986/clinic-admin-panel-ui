import { useMutation, useQueryClient } from "@tanstack/react-query";
import { galleryApi } from "../services/gallery.service";
import { galleryKeys } from "./gallery.keys";
import type {
  GalleryEditMutationParams,
  GalleryPublishMutationParams,
  GalleryRevisionMutationParams,
  GalleryUploadMutationParams,
} from "../types/gallery.actions.types";

export function useGalleryActions() {
  const client = useQueryClient();
  const invalidate = () => {
    void client.invalidateQueries({
      queryKey: galleryKeys.all,
      refetchType: "none",
    });
    void client.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const create = useMutation({
    mutationFn: () => galleryApi.create(),
    onSuccess: invalidate,
    retry: false,
  });
  const edit = useMutation({
    mutationFn: ({ id, input }: GalleryEditMutationParams) =>
      galleryApi.edit(id, input),
    onSuccess: invalidate,
    retry: false,
  });
  const upload = useMutation({
    mutationFn: ({
      id,
      file,
      revision,
      progress,
    }: GalleryUploadMutationParams) =>
      galleryApi.upload(id, file, revision, progress),
    onSuccess: invalidate,
    retry: false,
  });
  const preview = useMutation({
    mutationFn: ({ id, revision }: GalleryRevisionMutationParams) =>
      galleryApi.preview(id, revision),
    retry: false,
  });
  const publish = useMutation({
    mutationFn: ({
      id,
      revision,
      published,
    }: GalleryPublishMutationParams) =>
      galleryApi.publish(id, revision, published),
    onSuccess: invalidate,
    retry: false,
  });
  const remove = useMutation({
    mutationFn: ({ id, revision }: GalleryRevisionMutationParams) =>
      galleryApi.remove(id, revision),
    onSuccess: invalidate,
    retry: false,
  });
  const withdraw = useMutation({
    mutationFn: (id: string) => galleryApi.withdrawConsent(id),
    onSuccess: invalidate,
    retry: false,
  });
  return { create, edit, upload, preview, publish, remove, withdraw };
}
