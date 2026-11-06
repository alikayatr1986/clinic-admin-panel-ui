import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '../../../../lib/api';
import { useGalleryCase, useGalleryOptions } from '../../hooks/useGallery';
import type { GalleryEditorPageProps, GalleryEditorForm } from '../../types/gallery.case-editor.types';
import { caseEditorSchema, DEFAULT_EDITOR_VALUES } from '../../schemas/gallery.case-editor.schema';
import { bannerFor, formFromCase } from '../../utils/gallery.case-editor.utils';
import { useCaseEditorActions } from '../../hooks/useCaseEditorActions';
import { useEditorBlocker } from '../../hooks/useEditorBlocker';
import { GalleryEditorStateCards } from './GalleryEditorStateCards';
import { GalleryEditorHeader } from './GalleryEditorHeader';
import { GalleryEditorFormCard } from './GalleryEditorFormCard';
import { GalleryImageCard } from './GalleryImageCard';
import { GalleryPublishCard } from './GalleryPublishCard';

export function GalleryCaseEditor({ caseID, onExpired, onNavigate, registerBlocker }: GalleryEditorPageProps) {
  const oq = useGalleryOptions(), cq = useGalleryCase(caseID);
  const item = cq.data?.data ?? null, options = oq.data?.data ?? null;
  const loading = oq.isLoading || (caseID !== 'new' && cq.isLoading);
  const loadedIdRef = useRef<string | null>(null);

  const { register, control, handleSubmit, reset, setValue, formState: { isDirty, errors } } =
    useForm<GalleryEditorForm>({ resolver: zodResolver(caseEditorSchema), defaultValues: DEFAULT_EDITOR_VALUES });

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const h = useCaseEditorActions({
    item,
    getIsDirty: () => isDirtyRef.current,
    reset,
    onExpired,
    onNavigate,
    refetchCase: async () => (await cq.refetch()).data?.data ?? null,
  });

  const beforePosition = useWatch({ control, name: 'beforePosition' });
  const dirty = isDirty || Boolean(h.pendingFile);

  useEffect(() => {
    if (item && loadedIdRef.current !== item.id) {
      loadedIdRef.current = item.id;
      reset(formFromCase(item));
    }
  }, [item, reset]);

  const queryError = oq.error || (caseID !== 'new' ? cq.error : null);
  useEffect(() => {
    if (queryError instanceof ApiError && queryError.status === 401) onExpired();
  }, [queryError, onExpired]);

  const loadError = queryError ? bannerFor(queryError) : (!options && !loading ? 'Invalid options response' : '');
  useEditorBlocker(dirty || Boolean(h.busy), registerBlocker);

  if (loading || loadError || caseID === 'new' || !item || !options) {
    return (
      <GalleryEditorStateCards
        loading={loading} loadError={loadError} caseID={caseID} item={item} busy={h.busy} error={h.error}
        onRetry={() => { void oq.refetch(); if (caseID !== 'new') void cq.refetch(); }}
        onCreateDraft={() => void h.createDraft()}
      />
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <GalleryEditorHeader
        item={item} isDirty={isDirty} dirty={dirty} error={h.error} notice={h.notice} onBack={() => onNavigate('gallery')}
      />
      <GalleryImageCard
        item={item} pendingFile={h.pendingFile} busy={h.busy} progress={h.progress} imageBroken={h.imageBroken}
        beforePosition={beforePosition ?? ''}
        onFileChange={(f) => { h.setPendingFile(f); h.setProgress(0); h.setError(''); }}
        onUpload={() => void h.upload()} onImageError={() => h.setImageBroken(true)}
      />
      <GalleryEditorFormCard
        onSubmit={handleSubmit((v) => void h.save(v), () => h.setError('Check the highlighted field.'))}
        register={register} control={control} displayOrderError={errors.displayOrder?.message}
        serverErrors={h.sErr} clientErrors={errors} options={options}
        onConsentChange={(val) => setValue('consentVerified', val === (item.signed_consent_id ?? '') && Boolean(val), { shouldDirty: true })}
        busy={h.busy} isDirty={isDirty}
      />
      <GalleryPublishCard
        item={item} busy={h.busy} dirty={dirty} preview={h.preview}
        onPreview={() => void h.issuePreview(dirty)} onSetPublished={(p) => void h.setPublished(p, dirty)}
      />
    </div>
  );
}
