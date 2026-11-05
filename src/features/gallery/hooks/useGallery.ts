import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { galleryApi } from '../services/gallery.service';
import { galleryKeys } from './gallery.keys';
import type { GalleryContentUpdate, GalleryEdit, GalleryFilters } from '../types/gallery.types';

export function useGalleryOptions() {
  return useQuery({ queryKey: [...galleryKeys.all, 'options'], queryFn: ({ signal }) => galleryApi.options(signal), retry: false });
}
export function useGalleryList(filters: GalleryFilters | null) {
  return useQuery({ queryKey: galleryKeys.list(filters ?? {}), queryFn: ({ signal }) => galleryApi.list(filters!, signal), enabled: filters !== null, retry: false });
}
export function useGalleryCase(id: string) {
  return useQuery({ queryKey: galleryKeys.detail(id), queryFn: ({ signal }) => galleryApi.get(id, signal), enabled: Boolean(id) && id !== 'new', retry: false });
}
export function useGalleryActions() {
  const client = useQueryClient();
  const invalidate = () => { void client.invalidateQueries({ queryKey: galleryKeys.all, refetchType: 'none' }); void client.invalidateQueries({ queryKey: ['dashboard'] }); };
  const create = useMutation({ mutationFn: () => galleryApi.create(), onSuccess: invalidate, retry: false });
  const edit = useMutation({ mutationFn: ({ id, input }: { id: string; input: GalleryEdit }) => galleryApi.edit(id, input), onSuccess: invalidate, retry: false });
  const upload = useMutation({ mutationFn: ({ id, file, revision, progress }: { id: string; file: File; revision: number; progress: (percent: number) => void }) => galleryApi.upload(id, file, revision, progress), onSuccess: invalidate, retry: false });
  const preview = useMutation({ mutationFn: ({ id, revision }: { id: string; revision: number }) => galleryApi.preview(id, revision), retry: false });
  const publish = useMutation({ mutationFn: ({ id, revision, published }: { id: string; revision: number; published: boolean }) => galleryApi.publish(id, revision, published), onSuccess: invalidate, retry: false });
  const remove = useMutation({ mutationFn: ({ id, revision }: { id: string; revision: number }) => galleryApi.remove(id, revision), onSuccess: invalidate, retry: false });
  const withdraw = useMutation({ mutationFn: (id: string) => galleryApi.withdrawConsent(id), onSuccess: invalidate, retry: false });
  return { create, edit, upload, preview, publish, remove, withdraw };
}

export function useGalleryContent(lang: 'en' | 'ar') {
  return useQuery({ queryKey: galleryKeys.content(lang), queryFn: ({ signal }) => galleryApi.content(lang, signal), retry: false });
}
export function useSaveGalleryContent() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: GalleryContentUpdate) => galleryApi.updateContent(input), retry: false, onSuccess: (data, input) => client.setQueryData(galleryKeys.content(input.lang), data) });
}
