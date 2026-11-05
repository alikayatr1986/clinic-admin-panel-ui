export interface GalleryCaption {
  lang: 'en' | 'ar';
  alt_text: string;
  caption: string;
  approval: string;
}

export interface GalleryCase {
  id: string;
  revision: number;
  published: boolean;
  display_order: number;
  procedure_tag?: string;
  timeframe_badge?: string;
  before_position?: 'left' | 'right';
  crop_attested: boolean;
  consent_id?: string;
  signed_consent_id?: string;
  consent_status?: string;
  media_ready: boolean;
  width?: number;
  height?: number;
  url?: string;
  thumbnail_url?: string;
  captions: GalleryCaption[];
  created_at: string;
  updated_at: string;
}

export interface GalleryList {
  data: GalleryCase[];
  page: number;
  page_size: number;
  total: number;
}

export interface GalleryFilters {
  page?: number;
  page_size?: number;
  status?: 'draft' | 'unpublished' | 'published';
  procedure_tag?: string;
  timeframe_badge?: string;
}

export interface GalleryOption {
  code: string;
  en: string;
  ar: string;
  status?: 'draft' | 'active' | 'retired' | string;
  retired?: boolean;
}

export interface GalleryOptions {
  procedures: GalleryOption[];
  timeframes: GalleryOption[];
}

export interface GalleryEdit {
  expected_revision: number;
  signed_consent_id?: string;
  consent_verified?: boolean;
  procedure_tag?: string;
  timeframe_badge?: string;
  before_position?: '' | 'left' | 'right';
  crop_attested?: boolean;
  display_order?: number;
  captions?: GalleryCaption[];
}

export interface GalleryStatistic {
  key: string;
  value: string;
  label: string;
}

export interface GalleryContent {
  type: string;
  lang: 'en' | 'ar';
  eyebrow: string;
  heading: string;
  introduction: string;
  statistics: GalleryStatistic[];
  revision: number;
  published: boolean;
  approval: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface GalleryContentUpdate {
  lang: 'en' | 'ar';
  expected_revision: number;
  eyebrow?: string;
  heading?: string;
  introduction?: string;
  statistics?: GalleryStatistic[];
  approval?: string;
}

export interface GalleryUploadResult {
  id: string;
  revision: number;
  published: boolean;
  display_order: number;
  media_ready: boolean;
  width: number;
  height: number;
  url: string;
  thumbnail_url: string;
}

export interface GalleryListPageProps {
  onExpired: () => void;
  onCreate?: () => void;
  onContent?: () => void;
  onEdit?: (id: string) => void;
}
export interface GalleryEditorPageProps {
  caseID: string;
  onExpired: () => void;
  onNavigate: (view: 'gallery' | 'editor', options?: { replace?: boolean; id?: string; bypassBlock?: boolean }) => void;
  registerBlocker: (blocker: (() => boolean) | null) => void;
}
export interface GalleryDetailPageProps {
  caseID: string;
  onExpired: () => void;
  onEdit: (id: string) => void;
  onBack: () => void;
}

export type GalleryFilterKey = 'status' | 'procedure_tag' | 'timeframe_badge';
export type GalleryLocale = 'en' | 'ar';
export type GalleryCaptionForm = { altText: string; caption: string; approved: boolean };
export type GalleryEditorForm = {
  signedConsentID: string; consentVerified: boolean; procedureTag: string; timeframeBadge: string;
  beforePosition: '' | 'left' | 'right'; cropAttested: boolean; displayOrder: string;
  captions: Record<GalleryLocale, GalleryCaptionForm>;
};
export type GalleryBusy = 'create' | 'save' | 'upload' | 'preview' | 'publish' | null;
export interface GalleryThumbnailProps { item: GalleryCase }
export interface GalleryCardProps { item: GalleryCase; options: GalleryOptions; search: string; onEdit?: (id: string) => void }
export interface GalleryFieldErrorProps { name: string; errors: Record<string, string> }
export interface GalleryParsedQuery { filters: GalleryFilters; invalid: boolean }


export interface GalleryPreviewState { url: string; expires_at: string }

export interface GalleryContentEditorProps { username: string; onExpired: () => void; onBack: () => void; registerBlocker: (blocker: (() => boolean) | null) => void }
export type GalleryContentForm = { eyebrow: string; heading: string; introduction: string; statistics: GalleryStatistic[] };
export interface GalleryContentRecovery { lang: GalleryLocale; form: GalleryContentForm; revision: number }
