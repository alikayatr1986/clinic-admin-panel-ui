import { toast } from 'sonner';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGalleryActions } from './useGalleryActions';
import { galleryKeys } from './gallery.keys';
import type { GalleryCase } from '../types/gallery.types';
import type { UseFormReset } from 'react-hook-form';
import type { GalleryBusy, GalleryEditorForm, GalleryPreviewState } from '../types/gallery.case-editor.types';
import { formFromCase } from '../utils/gallery.case-editor.utils';

export function useCaseEditorPublication({
  item,
  busy,
  setBusy,
  setError,
  setNotice,
  onFail,
  reset,
}: {
  item: GalleryCase | null;
  busy: GalleryBusy;
  setBusy: (b: GalleryBusy) => void;
  setError: (s: string) => void;
  setNotice: (s: string) => void;
  onFail: (f: unknown) => void;
  reset: UseFormReset<GalleryEditorForm>;
}) {
  const actions = useGalleryActions();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<GalleryPreviewState | null>(null);

  async function issuePreview(dirty: boolean) {
    if (!item || busy) return;
    if (dirty) {
      setError('Save changes and upload the selected image before generating a preview.');
      return;
    }
    setBusy('preview');
    setError('');
    setPreview(null);
    try {
      const r = await actions.preview.mutateAsync({ id: item.id, revision: item.revision });
      setPreview(r.data);
      toast.success('Preview created.');
    } catch (f) {
      onFail(f);
    } finally {
      setBusy(null);
    }
  }

  async function setPublished(published: boolean, dirty: boolean) {
    if (!item || busy) return;
    if (dirty) {
      setError('Save changes and upload the selected image before changing publication.');
      return;
    }
    setBusy('publish');
    setError('');
    setNotice('');
    try {
      const r = await actions.publish.mutateAsync({ id: item.id, revision: item.revision, published });
      queryClient.setQueryData(galleryKeys.detail(item.id), { data: r.data });
      reset(formFromCase(r.data));
      setPreview(null);
      toast.success(published ? 'Case published.' : 'Case unpublished.');
      setNotice(published ? 'Case published.' : 'Case unpublished.');
    } catch (f) {
      onFail(f);
    } finally {
      setBusy(null);
    }
  }

  return { preview, setPreview, issuePreview, setPublished };
}
