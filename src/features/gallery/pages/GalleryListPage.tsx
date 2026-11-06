import { GalleryCaseList } from '../components/case-list/GalleryCaseList';
import type { GalleryListPageProps } from '../types/gallery.types';

export function GalleryListPage(props: GalleryListPageProps) {
  return <GalleryCaseList {...props} />;
}
