import type { Control, FieldErrors, UseFormReturn } from 'react-hook-form';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { GalleryLocale } from './gallery.types';

export type { GalleryLocale };
export interface StatisticsFieldError { message?: string; }
export interface GalleryStatistic { key: string; value: string; label: string; }
export interface GalleryContent {
  type: string; lang: GalleryLocale; eyebrow: string; heading: string;
  introduction: string; statistics: GalleryStatistic[]; revision: number;
  published: boolean; approval: string; reviewed_by?: string; reviewed_at?: string;
}
export interface GalleryContentUpdate {
  lang: GalleryLocale; expected_revision: number; eyebrow?: string;
  heading?: string; introduction?: string; statistics?: GalleryStatistic[]; approval?: string;
}
export interface GalleryContentEditorProps {
  username: string; onExpired: () => void; onBack: () => void;
  registerBlocker: (blocker: (() => boolean) | null) => void;
}
export type GalleryContentForm = {
  eyebrow: string; heading: string; introduction: string; statistics: GalleryStatistic[];
};
export interface GalleryContentRecovery {
  lang: GalleryLocale; form?: GalleryContentForm;
  forms?: Record<GalleryLocale, GalleryContentForm | null>;
  revision?: number; revisions?: Record<GalleryLocale, number>;
}
export interface GalleryContentHeaderProps { onBack: () => void; }
export interface GalleryContentStateCardsProps {
  loading?: boolean; error?: unknown; onRetry: () => void;
}
export interface GalleryContentConflictAlertProps {
  recovering: boolean; onReload: () => void; onReapply: () => void;
}
export interface GalleryContentStatsFieldsProps {
  locale: GalleryLocale; control: Control<GalleryContentForm>;
  serverErrors: Record<string, string>; clientErrors?: FieldErrors<GalleryContentForm>;
  disabled?: boolean;
}
export interface UseGalleryContentFormReturn {
  form: UseFormReturn<GalleryContentForm>;
  revision: number; status: string; conflict: boolean; recovering: boolean;
  serverErrors: Record<string, string>; errorMessage: string; noticeMessage: string;
  isDirty: boolean; isPending: boolean; initialized: boolean;
  submittingApproval: 'draft' | 'approved' | null;
  submit: (approval: 'draft' | 'approved') => Promise<void>;
  recover: (reload: boolean) => Promise<void>; getFormData: () => GalleryContentForm;
}
export interface GalleryContentFormCardProps {
  locale: GalleryLocale; form: UseGalleryContentFormReturn; storageError?: string;
}
export interface RestoredContent {
  form: GalleryContentForm; revision: number; conflict: boolean; notice: string;
}
export interface UseGalleryContentRecoveryParams {
  username: string; onExpired: () => void;
  queryEnError: unknown; queryArError: unknown;
  getSnapshot: () => {
    lang: GalleryLocale;
    forms: Record<GalleryLocale, GalleryContentForm | null>;
    revisions: Record<GalleryLocale, number>;
    initializedOrDirty?: boolean;
  };
}
export interface UseGalleryContentFormParams {
  locale: GalleryLocale;
  query: UseQueryResult<{ data: GalleryContent[] }>;
  save: UseMutationResult<{ data: GalleryContent[] }, unknown, GalleryContentUpdate>;
  onSave401: () => boolean;
  onClearRecovery: () => void;
  onExpired: () => void;
  recoveryCheck: (locale: GalleryLocale, serverItem?: GalleryContent) => RestoredContent | null;
}
