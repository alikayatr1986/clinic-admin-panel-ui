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
export interface BlogDetail extends Omit<BlogSummary, 'en_status' | 'ar_status' | 'title' | 'next_action' | 'next_action_label'> { en?: BlogEdition; ar?: BlogEdition; active_publication?: { id: string }; readiness?: Record<BlogLocale, BlogReadiness> }
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
