import type { GalleryCase } from './gallery.types';

export interface GalleryDetailActionsProps {
  item: GalleryCase;
  safeReturn: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  perform: (action: () => Promise<unknown>, done?: () => void) => Promise<void>;
  onRefetch: () => Promise<unknown>;
}

export interface GalleryDetailImageProps {
  url?: string;
  alt: string;
  beforePosition?: 'left' | 'right';
}
