import { ApiError, describeError } from '../../../lib/api';
import type { GalleryCase, GalleryCaption, GalleryEdit } from '../types/gallery.types';
import type { GalleryEditorForm } from '../types/gallery.case-editor.types';

type Locale = 'en' | 'ar';

export function bannerFor(e: unknown): string {
  if (e instanceof ApiError && e.status === 409) {
    return 'This case changed elsewhere. Your edits are still here. Copy them before reloading.';
  }
  return describeError(e);
}

export function formFromCase(item: GalleryCase): GalleryEditorForm {
  function caption(lang: Locale) {
    const value = item.captions.find((entry) => entry.lang === lang);
    return {
      altText: value?.alt_text ?? '',
      caption: value?.caption ?? '',
      approved: value?.approval === 'approved',
    };
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

function captionsChanged(a: GalleryEditorForm['captions'], b: GalleryEditorForm['captions']): boolean {
  for (const lang of ['en', 'ar'] as const) {
    const cA = a[lang];
    const cB = b[lang];
    if (!cA || !cB) return true;
    if (cA.altText !== cB.altText || cA.caption !== cB.caption || cA.approved !== cB.approved) {
      return true;
    }
  }
  return false;
}

export function isClinicalChange(current: GalleryEditorForm, saved: GalleryEditorForm): boolean {
  return (
    current.signedConsentID !== saved.signedConsentID ||
    current.procedureTag !== saved.procedureTag ||
    current.timeframeBadge !== saved.timeframeBadge ||
    current.beforePosition !== saved.beforePosition ||
    current.cropAttested !== saved.cropAttested ||
    captionsChanged(current.captions, saved.captions)
  );
}

export function toEdit(form: GalleryEditorForm, item: GalleryCase): GalleryEdit {
  const captions: GalleryCaption[] = (['en', 'ar'] as const)
    .filter((lang) => {
      const value = form.captions[lang];
      return Boolean(value.altText || value.caption || value.approved || item.captions.some((e) => e.lang === lang));
    })
    .map((lang) => ({
      lang,
      alt_text: form.captions[lang].altText,
      caption: form.captions[lang].caption,
      approval: form.captions[lang].altText.trim() && form.captions[lang].approved ? 'approved' : 'draft',
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
