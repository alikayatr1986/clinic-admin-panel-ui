import { GalleryCaseEditor } from '../components/case-editor/GalleryCaseEditor';
import type { GalleryEditorPageProps } from '../types/gallery.case-editor.types';

export function GalleryCreatePage(props: GalleryEditorPageProps) {
  return <GalleryCaseEditor {...props} caseID="new" />;
}
