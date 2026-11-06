import type { GalleryFilterKey, GalleryOptions } from './gallery.types';

export interface GalleryCaseFilterBarProps {
  options: GalleryOptions;
  invalid: boolean;
  status: string;
  procedure: string;
  timeframe: string;
  onChangeFilter: (key: GalleryFilterKey, value: string) => void;
  onClearFilters: () => void;
}

export interface GalleryCasePaginationProps {
  page: number;
  totalPages: number;
  onChangePage: (page: number) => void;
}

export interface GalleryErrorCardProps {
  error: string;
  onRetry: () => void;
}

export interface GalleryResetCardProps {
  onReset: () => void;
}

export interface GalleryOutOfBoundsCardProps {
  onGoFirst: () => void;
}

export interface GalleryListStateHookProps {
  onExpired: () => void;
}
