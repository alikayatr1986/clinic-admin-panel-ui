import type { UseFormRegister, Control, UseFormReset, FieldErrors } from 'react-hook-form';
import type { GalleryCase, GalleryOptions, GalleryLocale } from './gallery.types';

export type { GalleryLocale };
export type GalleryCaptionForm = { altText: string; caption: string; approved: boolean };
export type GalleryBusy = 'create' | 'save' | 'upload' | 'preview' | 'publish' | null;
export interface GalleryFieldErrorProps { name?: string; errors?: Record<string, string>; clientError?: string; }
export interface GalleryPreviewState { url: string; expires_at: string; }
export type EditorNavigate = (view: 'gallery' | 'editor', options?: { replace?: boolean; id?: string; bypassBlock?: boolean }) => void;
export type GalleryEditorForm = {
  signedConsentID: string; consentVerified: boolean; procedureTag: string; timeframeBadge: string;
  beforePosition: '' | 'left' | 'right'; cropAttested: boolean; displayOrder: string;
  captions: Record<GalleryLocale, GalleryCaptionForm>;
};
export interface GalleryEditorPageProps {
  caseID: string; onExpired: () => void; onNavigate: EditorNavigate;
  registerBlocker: (blocker: (() => boolean) | null) => void;
}
export interface GalleryEditorStateCardsProps {
  loading: boolean; loadError: string; caseID: string; item: GalleryCase | null;
  busy: GalleryBusy; error: string; onRetry: () => void; onCreateDraft: () => void;
}
export interface GalleryEditorHeaderProps {
  item: GalleryCase; isDirty: boolean; dirty: boolean; error: string; notice: string; onBack: () => void;
}
export interface FormCardCommonProps {
  register: UseFormRegister<GalleryEditorForm>;
  serverErrors: Record<string, string>;
  clientErrors?: FieldErrors<GalleryEditorForm>;
}
export type GalleryCaptionsCardProps = FormCardCommonProps;
export interface GalleryConsentFieldsProps extends FormCardCommonProps {
  control: Control<GalleryEditorForm>;
  onConsentChange: (value: string) => void;
}
export interface GalleryMetadataFieldsProps extends FormCardCommonProps {
  control: Control<GalleryEditorForm>;
  displayOrderError?: string;
  options: GalleryOptions;
}
export type GalleryDetailsCardProps = GalleryConsentFieldsProps & GalleryMetadataFieldsProps;
export type GalleryEditorFormCardProps = GalleryDetailsCardProps & {
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  busy: GalleryBusy;
  isDirty: boolean;
};
export interface GalleryImageCardProps {
  item: GalleryCase; pendingFile: File | null; busy: GalleryBusy; progress: number;
  imageBroken: boolean; beforePosition: string; onFileChange: (file: File | null) => void;
  onUpload: () => void; onImageError: () => void;
}
export interface GalleryPublishCardProps {
  item: GalleryCase; busy: GalleryBusy; dirty: boolean; preview: GalleryPreviewState | null;
  onPreview: () => void; onSetPublished: (published: boolean) => void;
}
export interface UseCaseEditorBaseParams {
  item: GalleryCase | null;
  onNavigate: EditorNavigate;
  reset: UseFormReset<GalleryEditorForm>;
}
export interface UseCaseEditorSaveParams extends UseCaseEditorBaseParams {
  busy: GalleryBusy;
  setBusy: (busy: GalleryBusy) => void;
  setError: (err: string) => void;
  setSErr: (errs: Record<string, string>) => void;
  setNotice: (notice: string) => void;
  onFail: (f: unknown) => void;
}
export interface UseCaseEditorActionsParams extends UseCaseEditorBaseParams {
  getIsDirty: () => boolean;
  onExpired: () => void;
  refetchCase: () => Promise<GalleryCase | null>;
}
