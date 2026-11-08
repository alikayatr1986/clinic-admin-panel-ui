import type { MutableRefObject, ReactNode } from 'react';
export type BlogLocale = 'en' | 'ar';
export type BlogStatus = 'draft' | 'published' | 'published_with_changes';
export type BlogStatusFilter = BlogStatus | 'needs_action';

export interface BlogCategory { id: string; key: string; name_en: string; name_ar: string }
export interface BlogOptions { limits: Record<string, number>; categories: BlogCategory[]; generation_enabled: boolean }
export interface BlogEditionStatus { revision: number; complete: boolean; reviewed: boolean; updated_at?: string }
export interface BlogSummary {
  id: string; slug: string; title: string; category_id: string; category_key: string; status: BlogStatus;
  next_action: string; next_action_label: string;
  aggregate_revision: number; first_published_at: string | null; created_at: string; updated_at: string;
  en_status: BlogEditionStatus; ar_status: BlogEditionStatus;
}
export interface BlogBodyMark { type: 'strong' | 'em' | 'link'; start: number; end: number; href?: string }
export interface BlogBodyBlock { type: 'paragraph' | 'heading' | 'list' | 'blockquote'; level?: 2 | 3; style?: 'ordered' | 'unordered'; text?: string; anchor?: string; items?: string[]; marks?: BlogBodyMark[] }
export interface BlogBody { schema_version: 1; blocks: BlogBodyBlock[] }
export interface BlogReference { label: string; url: string; source_id?: string }
export interface BlogEdition {
  language: BlogLocale; id: string; edition_revision: number; title: string; excerpt: string; body: BlogBody;
  cover_media_id: string | null; cover_alt: string; author_name: string; reviewer_attribution: string | null;
  seo_title: string; seo_description: string; references: BlogReference[]; origin: string; updated_at: string;
}
export type BlogReviewKind = 'editorial' | 'medical' | 'translation' | 'media_rights';
export interface BlogReadiness { revision_id: string | null; revision: number; required_reviews: BlogReviewKind[]; completed_reviews: BlogReviewKind[]; missing_fields: string[] }
export interface BlogDetail extends Omit<BlogSummary, 'en_status' | 'ar_status' | 'title' | 'next_action' | 'next_action_label'> { category_name_en?: string; category_name_ar?: string; en?: BlogEdition; ar?: BlogEdition; active_publication?: { id: string }; readiness?: Record<BlogLocale, BlogReadiness> }
export interface BlogHomeSettings { featured_post_id: string | null; revision: number; updated_at: string }
export interface BlogPreviewDetail {
  id: string; slug: string; lang: BlogLocale; title: string; excerpt: string; category: { key: string; label: string };
  first_published_at: string; last_published_at: string; reading_time_minutes: number; author_name: string;
  reviewer_attribution?: string; body: BlogBody; references: BlogReference[];
  cover: { url: string; alt: string; width: number; height: number; focal_point: { x: number; y: number } } | null;
}
export interface BlogFilters { page?: number; page_size?: number; status?: BlogStatusFilter; category?: string; q?: string }
export interface BlogList { data: BlogSummary[]; page: number; page_size: number; total: number }
export interface BlogSaveInput {
  expected_revision: number; lang: BlogLocale; slug?: string; category_id?: string; title: string; excerpt: string;
  body: BlogBody; cover_media_id: string | null; cover_alt: string; author_name: string;
  reviewer_attribution: string | null; seo_title: string; seo_description: string; references: BlogReference[];
}
export interface BlogSaveResult { id: string; aggregate_revision: number; edition_revision: number; updated_at: string }
export interface BlogMediaResult { media_id: string; aggregate_revision: number; width: number; height: number; focal_x: number; focal_y: number }

export interface BlogGenerationSource { source_id: string; text: string; citation_label: string; citation_url?: string }
export interface BlogGenerationBrief { topic: string; audience?: string; instructions: string; target_length?: number; clinic_facts?: string; source_excerpts: BlogGenerationSource[] }
export interface BlogGeneratedDraft { title: string; excerpt: string; body: BlogBody; seo_title: string; seo_description: string; source_ids: string[] }
export type GenerationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled' | 'applied' | 'discarded';
export interface BlogGenerationJob {
  id: string; post_id: string; language: BlogLocale; status: GenerationJobStatus;
  brief?: BlogGenerationBrief; result?: BlogGeneratedDraft; source_ids: string[];
  created_at: string; updated_at: string; provider?: string; model?: string; error_category?: string;
}

export interface BlogGenerationSelection {
  scope: string;
  id: string;
}

export interface BlogCreateData {
  categoryID: string;
  slug: string;
  title: string;
}

export interface BlogCreateMutationInput {
  categoryID: string;
  slug: string;
  idempotencyKey: string;
  title?: string;
}

export interface BlogCreateResult { id: string; aggregate_revision: number }
export interface BlogSaveParams { id: string; input: BlogSaveInput }
export interface BlogUploadParams {
  id: string;
  file: File;
  expectedRevision: number;
  rights: string;
  focalX: number;
  focalY: number;
  onProgress: (percent: number) => void;
}
export interface BlogReviewParams { id: string; revisionID: string; kind: BlogReviewKind; reference?: string }
export interface BlogPublishParams {
  id: string;
  expectedAggregateRevision: number;
  categoryID: string;
  enRevisionID: string;
  arRevisionID: string;
}
export interface BlogUnpublishParams { id: string; revision: number }
export interface BlogFeatureParams { revision: number; postID: string | null }
export interface BlogGenerationQueueParams {
  id: string;
  lang: BlogLocale;
  idempotencyKey: string;
  baseRevision: number;
  brief: BlogGenerationBrief;
}
export interface BlogGenerationJobParams { id: string; jobID: string }
export interface BlogGenerationApplyParams extends BlogGenerationJobParams { selectedFields: string[] }

export interface BlogCreateFormProps {
  options: BlogOptions | null;
  creating: boolean;
  createError: string;
  onSubmit: (data: BlogCreateData) => Promise<void>;
  onCancel?: () => void;
}

export interface BlogCreatePageProps {
  onExpired: () => void;
  onCreated: (id: string) => void;
  onCancel: () => void;
}

export interface BlogListPageProps {
  onExpired: () => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
}

export interface BlogListProps {
  onExpired: () => void;
  onEdit: (id: string) => void;
  createOpen?: boolean;
  embeddedCreate?: boolean;
}

export interface BlogDraftFormState {
  slug: string;
  categoryID: string;
  title: string;
  excerpt: string;
  author: string;
  reviewer: string;
  coverMediaID: string | null;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  blocks: BlogBodyBlock[];
  references: BlogReference[];
}

export interface BlogCoverDraft {
  file: File | null;
  rights: string;
  focalX: number;
  focalY: number;
}

export interface BlogDraftRecord {
  forms: Record<BlogLocale, BlogDraftFormState>;
  saved: Record<BlogLocale, BlogDraftFormState>;
  locale: BlogLocale;
  file: File | null;
  rights: string;
  focalX: number;
  focalY: number;
  covers?: Record<BlogLocale, BlogCoverDraft>;
  dirty: boolean;
}

export interface BlogDetailPageProps {
  postID: string;
  role?: 'admin' | 'staff';
  onExpired: () => void;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onBack: () => void;
  onDeleted?: () => void;
}

export interface BlogEditPageProps {
  postID: string;
  role?: 'admin' | 'staff';
  onExpired: () => void;
  onNavigate: () => void;
  onPreview: (id: string) => void;
  onDetail?: (id: string) => void;
  onDeleted?: () => void;
  registerBlocker: (blocker: (() => boolean) | null) => void;
}

export interface BlogPreviewPageProps {
  postID: string;
  onExpired: () => void;
  onClose: () => void;
}



export interface BlogGeneratorProps {
  postID: string;
  locale: BlogLocale;
  active?: boolean;
  baseRevision: number;
  dirty: boolean;
  currentDraft: { title: string; excerpt: string; seoTitle: string; seoDescription: string };
  onRefresh: (expectedRevision?: number) => Promise<void>;
  onApplied?: (notice: string) => void;
  onExpired?: () => void;
}

export interface BlogGenerationReviewProps {
  selected: Record<string, boolean>;
  onSelectedChange: (value: Record<string, boolean>) => void;
  job: BlogGenerationJob;
  currentDraft: { title: string; excerpt: string; seoTitle: string; seoDescription: string };
  locale: BlogLocale;
  dirty: boolean;
  applying: boolean;
  discarding: boolean;
  onApply: (selectedFields: string[]) => void | Promise<void>;
  onDiscard: () => void | Promise<void>;
}

export interface BlogDraftContextValue {
  getDraft: (postID: string) => BlogDraftRecord | undefined;
  saveDraft: (postID: string, draft: BlogDraftRecord) => void;
  clearDraft: (postID: string) => void;
  isDirty: (postID: string) => boolean;
}

export interface BlogDraftProviderProps { children: ReactNode }
export interface BlogBodyProps { body: BlogBody }
export interface BlogPreviewProps { postID: string; locale: BlogLocale; revision?: number; dirty: boolean; onClose: () => void }
export interface BlogEditorProps { postID: string; role?: 'admin' | 'staff'; onExpired: () => void; onNavigate: () => void; onDeleted?: () => void; registerBlocker: (blocker: (() => boolean) | null) => void }
export interface BlogRequiredProps { children: string }
export interface BlogPublishPanelProps { post: BlogDetail; onJump?: (locale: BlogLocale, field: string) => void; locked: boolean; lock: MutableRefObject<boolean>; onBusy: (busy: boolean) => void; onRefresh: () => Promise<void>; onDeleted: () => void; onExpired?: () => void }
export interface BlogReviewSelection { locale: BlogLocale; revisionID: string; categoryID: string }

export interface BlogGenerationSelection { scope: string; id: string }

export type BlogGuidedStep = 'Start' | 'Details' | 'Content' | 'Cover' | 'Review and publish';
export interface BlogGuidedNavigationProps {
  current: BlogGuidedStep;
  onSelect?: (step: BlogGuidedStep) => void;
}

export type BlogEditorFormValues = { forms: Record<BlogLocale, BlogDraftFormState> | null };
