import { GalleryCaseEditor } from '../components/GalleryCaseEditor';
import type { GalleryEditorPageProps } from '../types/gallery.case-editor.types';

export function GalleryCreatePage(props: GalleryEditorPageProps) {
  return <GalleryCaseEditor {...props} caseID="new" />;
}
