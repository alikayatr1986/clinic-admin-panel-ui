import { useState } from 'react';
import { ApiError } from '../../../lib/api';
import { fieldErrors } from '../../../lib/form-errors';
import type { GalleryBusy, UseCaseEditorActionsParams } from '../types/gallery.case-editor.types';
import { bannerFor } from '../utils/gallery.case-editor.utils';
import { useCaseEditorUpload } from './useCaseEditorUpload';
import { useCaseEditorPublication } from './useCaseEditorPublication';
import { useCaseEditorSave } from './useCaseEditorSave';

export function useCaseEditorActions({
  item,
  getIsDirty,
  reset,
  onExpired,
  onNavigate,
  refetchCase,
}: UseCaseEditorActionsParams) {
  const [busy, setBusy] = useState<GalleryBusy>(null);
  const [error, setError] = useState('');
  const [sErr, setSErr] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  function onFail(f: unknown) {
    if (f instanceof ApiError && f.status === 401) {
      onExpired();
      return;
    }
    setError(bannerFor(f));
    setSErr(fieldErrors(f));
  }

  const { createDraft, save } = useCaseEditorSave({
    item,
    busy,
    setBusy,
    setError,
    setSErr,
    setNotice,
    onFail,
    onNavigate,
    reset,
  });

  const uploader = useCaseEditorUpload({
    item,
    busy,
    setBusy,
    onFail,
    setNotice,
    refetchCase,
    getIsDirty,
    reset,
  });

  const publisher = useCaseEditorPublication({
    item,
    busy,
    setBusy,
    setError,
    setNotice,
    onFail,
    reset,
  });

  return {
    busy,
    error,
    setError,
    sErr,
    notice,
    pendingFile: uploader.pendingFile,
    setPendingFile: uploader.setPendingFile,
    progress: uploader.progress,
    setProgress: uploader.setProgress,
    imageBroken: uploader.imageBroken,
    setImageBroken: uploader.setImageBroken,
    preview: publisher.preview,
    createDraft,
    save,
    upload: uploader.upload,
    issuePreview: publisher.issuePreview,
    setPublished: publisher.setPublished,
  };
}
