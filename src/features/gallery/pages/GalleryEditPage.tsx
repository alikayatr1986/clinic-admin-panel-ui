import { GalleryCaseEditor } from '../components/case-editor/GalleryCaseEditor';
import type { GalleryEditorPageProps } from '../types/gallery.case-editor.types';

export function GalleryEditPage(props: GalleryEditorPageProps) {
  return <GalleryCaseEditor {...props} />;
}
