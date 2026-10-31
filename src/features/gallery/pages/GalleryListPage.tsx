import { GalleryCaseList } from '../components/GalleryCaseList';
import type { GalleryListPageProps } from '../types/gallery.types';

export function GalleryListPage(props: GalleryListPageProps) {
  return <GalleryCaseList {...props} />;
}
