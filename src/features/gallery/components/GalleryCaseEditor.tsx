import type { GalleryPreviewState } from '../types/gallery.types';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../../lib/api';
import { useGalleryActions, useGalleryCase, useGalleryOptions } from '../hooks/useGallery';
import type { GalleryCase, GalleryCaption, GalleryEdit, GalleryOptions, GalleryEditorPageProps, GalleryLocale as Locale, GalleryCaptionForm as CaptionForm, GalleryEditorForm as EditorForm, GalleryBusy as Busy, GalleryFieldErrorProps } from '../types/gallery.types';

function formFromCase(item: GalleryCase): EditorForm {
  function caption(lang: Locale): CaptionForm {
    const value = item.captions.find((entry) => entry.lang === lang);
    return { altText: value?.alt_text ?? '', caption: value?.caption ?? '', approved: value?.approval === 'approved' };
  }
  return {
    signedConsentID: item.signed_consent_id ?? '',
    consentVerified: Boolean(item.signed_consent_id),
    procedureTag: item.procedure_tag ?? '',
    timeframeBadge: item.timeframe_badge ?? '',
    beforePosition: item.before_position ?? '',
    cropAttested: item.crop_attested,
    displayOrder: String(item.display_order),
    captions: { en: caption('en'), ar: caption('ar') },
  };
}

function isClinicalChange(current: EditorForm, saved: EditorForm): boolean {
  return current.signedConsentID !== saved.signedConsentID ||
    current.procedureTag !== saved.procedureTag || current.timeframeBadge !== saved.timeframeBadge ||
    current.beforePosition !== saved.beforePosition || current.cropAttested !== saved.cropAttested ||
    JSON.stringify(current.captions) !== JSON.stringify(saved.captions);
}

function toEdit(form: EditorForm, item: GalleryCase): GalleryEdit {
  const captions: GalleryCaption[] = (['en', 'ar'] as const).filter((lang) => {
    const value = form.captions[lang];
    return Boolean(value.altText || value.caption || value.approved || item.captions.some((entry) => entry.lang === lang));
  }).map((lang) => ({
    lang,
    alt_text: form.captions[lang].altText,
    caption: form.captions[lang].caption,
    approval: form.captions[lang].approved ? 'approved' : 'draft',
  }));
  return {
    expected_revision: item.revision,
    signed_consent_id: form.signedConsentID,
    consent_verified: form.consentVerified,
    procedure_tag: form.procedureTag,
    timeframe_badge: form.timeframeBadge,
    before_position: form.beforePosition,
    crop_attested: form.cropAttested,
    display_order: Number(form.displayOrder),
    captions,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'This case changed elsewhere. Your edits are still here. Copy them before reloading.';
    if (error.status === 403) return 'Access denied. Check your staff permissions or sign in again.';
    if (error.status === 422) return 'Publication requirements are not met. Review the fields below.';
    return error.message;
  }
  return 'The request could not be completed. Try again.';
}

function FieldError({ name, errors }: GalleryFieldErrorProps) {
  return errors[name] ? <p className="mt-1 text-sm text-red-800">{errors[name]}</p> : null;
}

export function GalleryCaseEditor({ caseID, onExpired, onNavigate, registerBlocker }: GalleryEditorPageProps) {
  const optionsQuery = useGalleryOptions();
  const caseQuery = useGalleryCase(caseID);
  const actions = useGalleryActions();
  const [item, setItem] = useState<GalleryCase | null>(null);
  const [options, setOptions] = useState<GalleryOptions | null>(null);
  const [form, setForm] = useState<EditorForm | null>(null);
  const [loading, setLoading] = useState(caseID !== 'new');
  const [loadError, setLoadError] = useState('');
  
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<GalleryPreviewState | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const formDirty = Boolean(item && form && JSON.stringify(form) !== JSON.stringify(formFromCase(item)));
  const dirty = formDirty || Boolean(pendingFile);
  const clinicalDirty = Boolean(item?.published && form && isClinicalChange(form, formFromCase(item)));

  useEffect(() => {
    if (optionsQuery.error || caseQuery.error) {
      const failure = optionsQuery.error || caseQuery.error;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else { setLoadError(errorMessage(failure)); setLoading(false); }
      return;
    }
    if (!optionsQuery.data || (caseID !== 'new' && !caseQuery.data)) return;
    const choices = optionsQuery.data.data;
    if (!Array.isArray(choices?.procedures) || !Array.isArray(choices?.timeframes)) { setLoadError('Invalid options response'); setLoading(false); return; }
    setLoadError('');
    setOptions(choices);
    if (caseQuery.data && !item) { setItem(caseQuery.data.data); setForm(formFromCase(caseQuery.data.data)); }
    setLoading(false);
  }, [caseID, optionsQuery.data, optionsQuery.error, caseQuery.data, caseQuery.error]);

  useEffect(() => {
    const blocker = dirty || busy ? () => window.confirm('You have unsaved changes or an operation in progress. Leave this case?') : null;
    registerBlocker(blocker);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && !busy) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { registerBlocker(null); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, [dirty, busy, registerBlocker]);

  function handleFailure(failure: unknown) {
    if (failure instanceof ApiError && failure.status === 401) { onExpired(); return; }
    setError(errorMessage(failure));
    setFields(failure instanceof ApiError ? failure.fields ?? {} : {});
  }

  async function createDraft() {
    if (busy) return;
    setBusy('create'); setError(''); setNotice('');
    try {
      const response = await actions.create.mutateAsync();
      onNavigate('editor', { id: response.data.id, replace: true, bypassBlock: true });
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(null); }
  }

  function update<K extends keyof EditorForm>(key: K, value: EditorForm[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setNotice(''); setPreview(null);
  }

  function updateConsentReference(value: string) {
    setForm((current) => current ? {
      ...current,
      signedConsentID: value,
      consentVerified: value === (item?.signed_consent_id ?? '') && Boolean(value),
    } : current);
    setNotice(''); setPreview(null);
  }

  function updateCaption(lang: Locale, key: keyof CaptionForm, value: string | boolean) {
    setForm((current) => current ? {
      ...current, captions: { ...current.captions, [lang]: { ...current.captions[lang], [key]: value } },
    } : current);
    setNotice(''); setPreview(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || !form || busy) return;
    const displayOrder = Number(form.displayOrder);
    if (!Number.isSafeInteger(displayOrder) || displayOrder < -2147483648 || displayOrder > 2147483647) {
      setFields({ display_order: 'Enter a whole display order number.' });
      setError('Check the highlighted field.');
      return;
    }
    if (clinicalDirty && !window.confirm('Saving clinical details or descriptions will unpublish this case and reset relevant approvals. Continue?')) return;
    setBusy('save'); setError(''); setFields({}); setNotice('');
    try {
      const response = await actions.edit.mutateAsync({ id: item.id, input: toEdit(form, item) });
      const returned = response.data;
      const approvalReset = (['en', 'ar'] as const).some((lang) => form.captions[lang].approved && returned.captions.find((caption) => caption.lang === lang)?.approval !== 'approved');
      setItem(returned); setForm(formFromCase(returned)); setPreview(null);
      setNotice(approvalReset ? 'Saved. Changed descriptions are drafts; review them and save approval again before publishing.' : 'Case saved.');
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(null); }
  }

  async function upload() {
    if (!item || !pendingFile || busy) return;
    if (item.published && !window.confirm('Replacing this image will unpublish the case and reset reviews. Continue?')) return;
    setBusy('upload'); setError(''); setFields({}); setNotice(''); setProgress(0);
    try {
      const response = await actions.upload.mutateAsync({ id: item.id, file: pendingFile, revision: item.revision, progress: setProgress });
      setItem((current) => current ? { ...current, ...response.data } : current);
      setPendingFile(null); if (fileInput.current) fileInput.current.value = '';
      setPreview(null); setProgress(100); setImageBroken(false);
      setNotice('Upload complete. Review the new image and save any pending form changes.');
      try {
        const refreshed = await caseQuery.refetch().then((result) => { if (!result.data) throw result.error; return result.data; });
        setItem(refreshed.data);
        const hasUnsavedForm = form && JSON.stringify(form) !== JSON.stringify(formFromCase(item));
        if (!hasUnsavedForm) setForm(formFromCase(refreshed.data));
      } catch (failure) { handleFailure(failure); }
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(null); }
  }

  async function issuePreview() {
    if (!item || busy) return;
    if (dirty) { setError('Save changes and upload the selected image before generating a preview.'); return; }
    setBusy('preview'); setError(''); setFields({}); setPreview(null);
    try {
      const response = await actions.preview.mutateAsync({ id: item.id, revision: item.revision });
      setPreview(response.data);
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(null); }
  }

  async function setPublished(published: boolean) {
    if (!item || busy) return;
    if (dirty) { setError('Save changes and upload the selected image before changing publication.'); return; }
    setBusy('publish'); setError(''); setFields({}); setNotice('');
    try {
      const response = await actions.publish.mutateAsync({ id: item.id, revision: item.revision, published });
      setItem(response.data); setForm(formFromCase(response.data)); setPreview(null);
      setNotice(published ? 'Case published.' : 'Case unpublished.');
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(null); }
  }

  if (loading) return <p role="status" className="mt-8">Loading case editor…</p>;
  if (loadError) return <div className="mt-8 rounded-xl border border-red-200 bg-white p-6"><p role="alert">{loadError}</p><button type="button" onClick={() => { void optionsQuery.refetch(); void caseQuery.refetch(); }} className="mt-4 rounded-md border border-slate-300 px-4 py-2">Retry</button></div>;
  if (!options) return null;
  if (caseID === 'new') return <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Create a draft case</h2><p className="mt-2 text-slate-600">A draft stays private until the clinic reviews and publishes it.</p>{error && <p role="alert" className="mt-4 text-red-800">{error}</p>}<button type="button" disabled={busy !== null} onClick={() => void createDraft()} className="mt-5 rounded-md bg-crimson px-4 py-2 font-semibold text-white">{busy ? 'Creating…' : 'Create draft'}</button></section>;
  if (!item || !form) return <p role="alert" className="mt-8">Case data is unavailable.</p>;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="break-all text-sm text-slate-600">Case {item.id} · Revision {item.revision} · {item.published ? 'Published' : 'Unpublished'}</p>
        <button type="button" onClick={() => onNavigate('gallery')} className="rounded-md border border-slate-300 px-4 py-2 font-medium">Back to gallery</button>
      </div>
      {clinicalDirty && <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">Saving clinical details or descriptions will unpublish this case and reset relevant approvals.</p>}
      {dirty && <p role="status" className="text-sm font-medium text-amber-900">You have unsaved changes.</p>}
      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900"><p>{error}</p>{Object.entries(fields).length > 0 && <ul className="mt-2 list-inside list-disc">{Object.entries(fields).map(([key, value]) => <li key={key}>{key}: {value}</li>)}</ul>}</div>}
      {notice && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-green-900">{notice}</p>}

      <section aria-label="Combined image" className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Combined before/after image</h2>
        <p className="mt-2 text-sm text-slate-600">Select one combined JPEG, PNG, or WebP image. The clinic server validates and prepares it without splitting the original composition.</p>
        {item.media_ready && item.url && !imageBroken ? <div className="relative mt-5 overflow-hidden rounded-lg bg-slate-100"><img src={item.url} alt={item.captions.find((caption) => caption.lang === 'en')?.alt_text || 'Combined before and after clinical image'} width={item.width || undefined} height={item.height || undefined} onError={() => setImageBroken(true)} className="max-h-[36rem] w-full object-contain" />{form.beforePosition && <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-sm font-semibold text-white"><span>{form.beforePosition === 'left' ? 'Before' : 'After'}</span><span>{form.beforePosition === 'right' ? 'Before' : 'After'}</span></div>}</div> : <p className="mt-5 rounded-lg bg-slate-100 p-6 text-center text-slate-600">{imageBroken ? 'Image preview unavailable.' : 'No image uploaded yet.'}</p>}
        <div className="mt-5 flex flex-wrap items-end gap-4"><div><label htmlFor="combined-image" className="block text-sm font-medium">Combined image file</label><input ref={fileInput} id="combined-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy !== null} onChange={(event) => { setPendingFile(event.target.files?.[0] ?? null); setProgress(0); setError(''); }} className="mt-2 block max-w-full text-sm" /></div><button type="button" disabled={busy !== null || !pendingFile} onClick={() => void upload()} className="rounded-md border border-slate-300 px-4 py-2 font-medium">{busy === 'upload' ? 'Uploading…' : pendingFile ? 'Upload image' : 'Choose an image'}</button></div>
        {pendingFile && <p className="mt-2 text-sm">Selected: {pendingFile.name}</p>}
        {busy === 'upload' && <div className="mt-4"><label htmlFor="upload-progress" className="block text-sm">Uploading image: {progress}%</label><progress id="upload-progress" max="100" value={progress} className="mt-2 w-full" /></div>}
      </section>

      <form onSubmit={(event) => void save(event)} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Consent and case details</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><label htmlFor="signed-consent" className="block text-sm font-medium">Signed consent reference</label><input id="signed-consent" value={form.signedConsentID} onChange={(event) => updateConsentReference(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" /><FieldError name="signed_consent_id" errors={fields} /></div>
            <label className="flex items-start gap-3 sm:col-span-2"><input type="checkbox" checked={form.consentVerified} onChange={(event) => update('consentVerified', event.target.checked)} className="mt-1" /><span>I verified this reference against the clinic-held signed permission.</span></label><FieldError name="consent_verified" errors={fields} />
            <div><label htmlFor="procedure-tag" className="block text-sm font-medium">Procedure</label><select id="procedure-tag" value={form.procedureTag} onChange={(event) => update('procedureTag', event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option value="">Choose procedure</option>{options.procedures.map((choice) => <option key={choice.code} value={choice.code}>{choice.en}</option>)}</select><FieldError name="procedure_tag" errors={fields} /></div>
            <div><label htmlFor="timeframe-badge" className="block text-sm font-medium">Timeframe</label><select id="timeframe-badge" value={form.timeframeBadge} onChange={(event) => update('timeframeBadge', event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option value="">Choose timeframe</option>{options.timeframes.map((choice) => <option key={choice.code} value={choice.code}>{choice.en}</option>)}</select><FieldError name="timeframe_badge" errors={fields} /></div>
            <div><label htmlFor="before-position" className="block text-sm font-medium">Before image position</label><select id="before-position" value={form.beforePosition} onChange={(event) => update('beforePosition', event.target.value as EditorForm['beforePosition'])} className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"><option value="">Choose side</option><option value="left">Left</option><option value="right">Right</option></select><FieldError name="before_position" errors={fields} /></div>
            <div><label htmlFor="display-order" className="block text-sm font-medium">Display order</label><input id="display-order" type="number" step="1" value={form.displayOrder} onChange={(event) => update('displayOrder', event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" /><FieldError name="display_order" errors={fields} /></div>
            <label className="flex items-start gap-3 sm:col-span-2"><input type="checkbox" checked={form.cropAttested} onChange={(event) => update('cropAttested', event.target.checked)} className="mt-1" /><span>I reviewed image orientation, before/after identity, and publication suitability.</span></label><FieldError name="crop_attested" errors={fields} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Bilingual image descriptions</h2><p className="mt-2 text-sm text-slate-600">Save changed descriptions as drafts, then review and approve them in a second save before publishing.</p>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">{(['en', 'ar'] as const).map((lang) => <fieldset key={lang} className="rounded-lg border border-slate-200 p-4"><legend className="px-1 font-semibold">{lang === 'en' ? 'English' : 'Arabic'}</legend><div><label htmlFor={`${lang}-alt`} className="block text-sm font-medium">{lang.toUpperCase()} image description</label><textarea id={`${lang}-alt`} lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} value={form.captions[lang].altText} onChange={(event) => updateCaption(lang, 'altText', event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" /><FieldError name={`captions.${lang}.alt_text`} errors={fields} /></div><div className="mt-4"><label htmlFor={`${lang}-caption`} className="block text-sm font-medium">{lang.toUpperCase()} caption</label><textarea id={`${lang}-caption`} lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} value={form.captions[lang].caption} onChange={(event) => updateCaption(lang, 'caption', event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" /><FieldError name={`captions.${lang}.caption`} errors={fields} /></div><label className="mt-4 flex items-start gap-3"><input type="checkbox" checked={form.captions[lang].approved} onChange={(event) => updateCaption(lang, 'approved', event.target.checked)} className="mt-1" /><span>{lang.toUpperCase()} description reviewed and approved</span></label><FieldError name={`captions.${lang}.approval`} errors={fields} /></fieldset>)}</div>
        </section>
        <button type="submit" disabled={busy !== null || !formDirty} className="rounded-md bg-crimson px-5 py-2.5 font-semibold text-white">{busy === 'save' ? 'Saving…' : 'Save changes'}</button>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Preview and publication</h2><p className="mt-2 text-sm text-slate-600">Save all changes before previewing or changing publication. The Go server checks consent, media, language review, and current revision.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy !== null || dirty} onClick={() => void issuePreview()} className="rounded-md border border-slate-300 px-4 py-2 font-medium">{busy === 'preview' ? 'Preparing preview…' : 'Generate preview link'}</button><button type="button" disabled={busy !== null || dirty} onClick={() => void setPublished(!item.published)} className="rounded-md bg-crimson px-4 py-2 font-semibold text-white">{busy === 'publish' ? 'Updating…' : item.published ? 'Unpublish case' : 'Publish case'}</button></div>{preview && <p className="mt-4 rounded-md bg-slate-100 p-4"><a href={preview.url} target="_blank" rel="noopener noreferrer" className="font-medium text-crimson underline">Open private preview</a><span className="ml-2 text-sm text-slate-600">Expires {new Date(preview.expires_at).toLocaleString('en')}</span></p>}</section>
    </div>
  );
}
