import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionGeneration } from "../../../lib/session-generation";
import { galleryApi } from "../services/gallery.service";
import { galleryKeys } from "./gallery.keys";
import type {
  GalleryContentUpdate,
  GalleryFilters,
} from "../types/gallery.types";

export { useGalleryActions } from "./useGalleryActions";

export function useGalleryOptions() {
  return useQuery({
    queryKey: [...galleryKeys.all, "options"],
    queryFn: ({ signal }) => galleryApi.options(signal),
    retry: false,
  });
}

export function useGalleryList(filters: GalleryFilters | null) {
  return useQuery({
    queryKey: galleryKeys.list(filters ?? {}),
    queryFn: ({ signal }) => galleryApi.list(filters!, signal),
    enabled: filters !== null,
    retry: false,
  });
}

export function useGalleryCase(id: string) {
  return useQuery({
    queryKey: galleryKeys.detail(id),
    queryFn: ({ signal }) => galleryApi.get(id, signal),
    enabled: Boolean(id) && id !== "new",
    retry: false,
  });
}

export function useGalleryContent(lang: "en" | "ar") {
  return useQuery({
    queryKey: galleryKeys.content(lang),
    queryFn: ({ signal }) => galleryApi.content(lang, signal),
    retry: false,
  });
}

export function useSaveGalleryContent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: GalleryContentUpdate) =>
      galleryApi.updateContent(input),
    retry: false,
    onMutate: () => getSessionGeneration(),
    onSuccess: (data, input, generation) => {
      if (generation === getSessionGeneration())
        client.setQueryData(galleryKeys.content(input.lang), data);
    },
  });
}
