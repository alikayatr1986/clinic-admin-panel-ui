import type { GalleryEdit } from './gallery.types';

export interface GalleryEditMutationParams {
  id: string;
  input: GalleryEdit;
}

export interface GalleryUploadMutationParams {
  id: string;
  file: File;
  revision: number;
  progress: (percent: number) => void;
}

export interface GalleryRevisionMutationParams {
  id: string;
  revision: number;
}

export interface GalleryPublishMutationParams {
  id: string;
  revision: number;
  published: boolean;
}
