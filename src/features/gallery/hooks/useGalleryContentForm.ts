import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../../../lib/api';
import { fieldErrors } from '../../../lib/form-errors';
import type { GalleryContentForm, UseGalleryContentFormParams, UseGalleryContentFormReturn } from '../types/gallery.content.types';
import { DEFAULT_CONTENT_FORM, galleryContentFormSchema } from '../schemas/gallery.content-editor.schema';

export function useGalleryContentForm({
  locale, query, save, onSave401, onClearRecovery, onExpired, recoveryCheck,
}: UseGalleryContentFormParams): UseGalleryContentFormReturn {
  const [revision, setRevision] = useState(1);
  const [status, setStatus] = useState('');
  const [conflict, setConflict] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState<'draft' | 'approved' | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState(''); const [noticeMessage, setNoticeMessage] = useState('');
  const initialized = useRef(false);

  const form = useForm<GalleryContentForm>({
    resolver: zodResolver(galleryContentFormSchema),
    defaultValues: DEFAULT_CONTENT_FORM,
  });

  useEffect(() => {
    if (!query.data || initialized.current) return;
    initialized.current = true;
    const item = query.data.data.find((e) => e.lang === locale);
    const initial: GalleryContentForm = item
      ? { eyebrow: item.eyebrow, heading: item.heading, introduction: item.introduction, statistics: item.statistics ?? [] }
      : DEFAULT_CONTENT_FORM;
    const restored = recoveryCheck(locale, item);
    if (restored) {
      form.reset(initial);
      form.reset(restored.form, { keepDefaultValues: true });
      setRevision(restored.revision);
      if (restored.conflict) setConflict(true);
      if (restored.notice) setNoticeMessage(restored.notice);
    } else {
      form.reset(initial);
      setRevision(item?.revision ?? 1);
    }
    setStatus(item?.approval ?? '');
  }, [query.data, locale, recoveryCheck, form]);

  const submit = async (approval: 'draft' | 'approved') => {
    if (save.isPending || recovering || conflict) return;
    setServerErrors({}); setErrorMessage(''); setNoticeMessage('');
    let validData: GalleryContentForm | null = null;
    await form.handleSubmit((d) => { validData = d; }, () => { setErrorMessage('Check the highlighted fields.'); })();
    if (!validData) return;
    const dataToSave: GalleryContentForm = validData;
    setSubmittingApproval(approval);
    try {
      const res = await save.mutateAsync({ lang: locale, expected_revision: revision, ...dataToSave, approval });
      const item = res.data.find((e) => e.lang === locale);
      if (!item) throw new Error('The server did not return the saved content.');
      form.reset({ eyebrow: item.eyebrow, heading: item.heading, introduction: item.introduction, statistics: item.statistics ?? [] });
      setRevision(item.revision); setStatus(item.approval); onClearRecovery();
      toast.success(approval === 'approved' ? 'Gallery content approved.' : 'Gallery content saved.');
      setNoticeMessage(`Server saved revision ${item.revision} with status ${item.approval}.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        if (onSave401()) onExpired();
        else setErrorMessage('Your session expired and your edits could not be stored. Copy them before signing in again.');
      } else {
        toast.error('Could not save gallery content. Check the details and try again.');
        const is409 = err instanceof ApiError && err.status === 409;
        setConflict(is409); setServerErrors(fieldErrors(err));
        setErrorMessage(is409 ? 'This content changed elsewhere. Your edits are still here; copy them before leaving.' : err instanceof Error ? err.message : 'Save failed. Try again.');
      }
    } finally { setSubmittingApproval(null); }
  };

  const recover = async (reload: boolean) => {
    if (recovering || save.isPending) return;
    if (reload && !window.confirm('Discard your edits and reload the server content?')) return;
    setRecovering(true);
    try {
      const res = await query.refetch();
      if (res.error || !res.data) throw res.error ?? new Error('Reload failed');
      const item = res.data.data.find((e) => e.lang === locale);
      const current = item ? { eyebrow: item.eyebrow, heading: item.heading, introduction: item.introduction, statistics: item.statistics ?? [] } : DEFAULT_CONTENT_FORM;
      setRevision(item?.revision ?? 1); setStatus(item?.approval ?? '');
      if (reload) { form.reset(current); onClearRecovery(); }
      setConflict(false); setServerErrors({}); setErrorMessage('');
      setNoticeMessage(reload ? 'Server content reloaded.' : 'Edits retained. Saving or publishing will overwrite the current server draft.');
    } catch {
      setErrorMessage('Could not load server content. Your edits are retained; try again.');
    } finally { setRecovering(false); }
  };

  return {
    form, revision, status, conflict, recovering, serverErrors, errorMessage, noticeMessage,
    isDirty: form.formState.isDirty, isPending: save.isPending, initialized: initialized.current,
    submittingApproval, submit, recover, getFormData: () => form.getValues(),
  };
}
