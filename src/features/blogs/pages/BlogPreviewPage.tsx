import { useState } from 'react';
import { useBlogDetail } from '../hooks/useBlogDetail';
import { useBlogDraft } from '../context/BlogDraftContext';
import { BlogPreview } from '../components/BlogPreview';
import { describeError } from '../../../lib/api';
import type { BlogLocale, BlogPreviewPageProps } from '../types/blogs.types';

const LOCALES: BlogLocale[] = ['en', 'ar'];

export function BlogPreviewPage({ postID, onExpired, onClose }: BlogPreviewPageProps) {
  const { data: post, isLoading, error: detailError, refetch } = useBlogDetail(postID, onExpired);
  const { isDirty, draft } = useBlogDraft(postID);
  const [locale, setLocale] = useState<BlogLocale>(draft?.locale ?? 'en');

  if (isLoading) {
    return <p role="status" className="mt-8 text-slate-600">Loading article preview…</p>;
  }

  if (detailError || !post) {
    return (
      <div role="alert" className="mt-8 rounded-xl border border-red-200 bg-white p-6 text-red-800">
        <p>{detailError ? describeError(detailError) : 'Article not found.'}</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Return to editor
          </button>
        </div>
      </div>
    );
  }

  const editionRevision = post[locale]?.edition_revision;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ← Return to editor
        </button>

        <div className="flex items-center gap-2" role="tablist" aria-label="Preview language">
          {LOCALES.map((lang) => (
            <button
              key={lang}
              role="tab"
              aria-selected={locale === lang}
              onClick={() => setLocale(lang)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                locale === lang
                  ? 'border-crimson bg-crimson/5 text-crimson font-semibold'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {lang === 'en' ? 'English' : 'العربية'}
            </button>
          ))}
        </div>
      </div>

      <BlogPreview
        postID={postID}
        locale={locale}
        revision={editionRevision}
        dirty={isDirty}
        onClose={onClose}
      />
    </div>
  );
}

