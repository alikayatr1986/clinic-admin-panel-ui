import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGalleryActions } from './useGalleryActions';
import { galleryKeys } from './gallery.keys';
import type { GalleryCase } from '../types/gallery.types';
import type { UseFormReset } from 'react-hook-form';
import type { GalleryBusy, GalleryEditorForm } from '../types/gallery.case-editor.types';
import { formFromCase } from '../utils/gallery.case-editor.utils';

export function useCaseEditorUpload({
  item,
  busy,
  setBusy,
  onFail,
  setNotice,
  refetchCase,
  getIsDirty,
  reset,
}: {
  item: GalleryCase | null;
  busy: GalleryBusy;
  setBusy: (b: GalleryBusy) => void;
  onFail: (f: unknown) => void;
  setNotice: (s: string) => void;
  refetchCase: () => Promise<GalleryCase | null>;
  getIsDirty: () => boolean;
  reset: UseFormReset<GalleryEditorForm>;
}) {
  const actions = useGalleryActions();
  const queryClient = useQueryClient();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [imageBroken, setImageBroken] = useState(false);

  async function upload() {
    if (!item || !pendingFile || busy) return;
    if (item.published && !window.confirm('Replacing this image will unpublish the case and reset reviews. Continue?')) {
      return;
    }
    setBusy('upload');
    setNotice('');
    setProgress(0);
    try {
      const r = await actions.upload.mutateAsync({
        id: item.id,
        file: pendingFile,
        revision: item.revision,
        progress: setProgress,
      });
      queryClient.setQueryData(galleryKeys.detail(item.id), (old: { data: GalleryCase } | undefined) =>
        old ? { data: { ...old.data, ...r.data } } : old
      );
      setPendingFile(null);
      setProgress(100);
      setImageBroken(false);
      setNotice('Upload complete. Review the new image and save any pending form changes.');
      try {
        const refCase = await refetchCase();
        if (refCase) {
          queryClient.setQueryData(galleryKeys.detail(item.id), { data: refCase });
          if (!getIsDirty()) reset(formFromCase(refCase));
        }
      } catch (f) {
        onFail(f);
      }
    } catch (f) {
      onFail(f);
    } finally {
      setBusy(null);
    }
  }

  return { pendingFile, setPendingFile, progress, setProgress, imageBroken, setImageBroken, upload };
}
