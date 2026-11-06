import { useQueryClient } from '@tanstack/react-query';
import { useGalleryActions } from '../hooks/useGallery';
import { galleryKeys } from '../hooks/gallery.keys';
import type { GalleryEditorForm, UseCaseEditorSaveParams } from '../types/gallery.case-editor.types';
import { formFromCase, isClinicalChange, toEdit } from './gallery.case-editor.utils';

export function useCaseEditorSave({
  item,
  busy,
  setBusy,
  setError,
  setSErr,
  setNotice,
  onFail,
  onNavigate,
  reset,
}: UseCaseEditorSaveParams) {
  const actions = useGalleryActions();
  const queryClient = useQueryClient();

  async function createDraft() {
    if (busy) return;
    setBusy('create');
    setError('');
    setNotice('');
    try {
      const r = await actions.create.mutateAsync();
      onNavigate('editor', { id: r.data.id, replace: true, bypassBlock: true });
    } catch (f) {
      onFail(f);
    } finally {
      setBusy(null);
    }
  }

  async function save(values: GalleryEditorForm) {
    if (!item || busy) return;
    const clinicalDirty = isClinicalChange(values, formFromCase(item));
    if (
      item.published &&
      clinicalDirty &&
      !window.confirm(
        'Saving clinical details or descriptions will unpublish this case and reset relevant approvals. Continue?'
      )
    ) {
      return;
    }
    setBusy('save');
    setError('');
    setSErr({});
    setNotice('');
    try {
      const r = await actions.edit.mutateAsync({ id: item.id, input: toEdit(values, item) });
      const returned = r.data;
      const approvalReset = (['en', 'ar'] as const).some(
        (l) => values.captions[l].approved && returned.captions.find((c) => c.lang === l)?.approval !== 'approved'
      );
      queryClient.setQueryData(galleryKeys.detail(item.id), { data: returned });
      reset(formFromCase(returned));
      setNotice(
        approvalReset
          ? 'Saved. Changed descriptions are drafts; review them and save approval again before publishing.'
          : 'Case saved.'
      );
    } catch (f) {
      onFail(f);
    } finally {
      setBusy(null);
    }
  }

  return { createDraft, save };
}
