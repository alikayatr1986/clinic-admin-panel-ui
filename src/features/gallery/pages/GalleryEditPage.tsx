import { GalleryCaseEditor } from '../components/GalleryCaseEditor';
import type { GalleryEditorPageProps } from '../types/gallery.types';

export function GalleryEditPage(props: GalleryEditorPageProps) {
  return <GalleryCaseEditor {...props} />;
}
