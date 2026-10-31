import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { describeError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import { useBlogDetail } from '../hooks/useBlogDetail';
import { useBlogOptions } from '../hooks/useBlogOptions';
import { blogKeys } from '../hooks/blog.keys';
import { BlogBody } from '../components/BlogPreview';
import type { BlogDetailPageProps, BlogLocale } from '../types/blogs.types';

const LOCALES: BlogLocale[] = ['en', 'ar'];

export function BlogDetailPage({
  postID,
  role = 'staff',
  onExpired,
  onEdit,
  onPreview,
  onBack,
  onDeleted = onBack,
}: BlogDetailPageProps) {
  const queryClient = useQueryClient();
  const { data: post, isLoading, error: detailError, refetch } = useBlogDetail(postID, onExpired);
  const { data: options } = useBlogOptions(onExpired);
  const [selectedLocale, setSelectedLocale] = useState<BlogLocale>('en');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (isLoading) {
    return <p role="status" className="mt-8 text-slate-600">Loading article detail…</p>;
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
            onClick={onBack}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Back to blog library
          </button>
        </div>
      </div>
    );
  }

  const category = options?.categories?.find((c) => c.id === post.category_id);
  const categoryLabel = selectedLocale === 'ar' ? category?.name_ar ?? post.category_key : category?.name_en ?? post.category_key;
  const edition = post[selectedLocale];
  const readiness = post.readiness?.[selectedLocale];

  async function handleDelete() {
    if (!window.confirm('Delete this article? This action cannot be undone.')) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await blogsApi.delete(postID);
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
      onDeleted();
    } catch (err) {
      setDeleteError(describeError(err));
    } finally {
      setDeleting(false);
    }
  }

  const badgeText = (lang: BlogLocale) => {
    const missing = post.readiness?.[lang]?.missing_fields;
    if (!missing) return '';
    if (missing.includes('saved_revision')) return 'Not started';
    return missing.length ? `${missing.length} missing` : 'Complete';
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ← Back to blog library
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onPreview(post.id)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Preview saved revision
          </button>
          <button
            type="button"
            onClick={() => onEdit(post.id)}
            className="rounded-md bg-crimson px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Edit article
          </button>
          {role === 'admin' && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete article'}
            </button>
          )}
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="rounded-md bg-red-50 p-4 text-red-800">
          {deleteError}
        </p>
      )}

      {/* Metadata card */}
      <section
        aria-label="Article metadata"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {post.en?.title || post.ar?.title || post.slug}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Slug: <span className="font-mono">{post.slug}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 capitalize">
              {post.status.replaceAll('_', ' ')}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
              Revision {post.aggregate_revision}
            </span>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-800">
              {categoryLabel}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:grid-cols-4">
          <div>
            <span className="block font-medium text-slate-500">Created</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="block font-medium text-slate-500">Last updated</span>
            <span>{new Date(post.updated_at).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="block font-medium text-slate-500">First published</span>
            <span>{post.first_published_at ? new Date(post.first_published_at).toLocaleDateString() : 'Never'}</span>
          </div>
        </div>
      </section>

      {/* Language tabs */}
      <div className="flex gap-2" role="tablist" aria-label="Article language">
        {LOCALES.map((lang) => (
          <button
            key={lang}
            role="tab"
            aria-selected={selectedLocale === lang}
            onClick={() => setSelectedLocale(lang)}
            className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              selectedLocale === lang
                ? 'border-crimson bg-crimson/5 text-crimson font-semibold'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{lang === 'en' ? 'English' : 'العربية'}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                badgeText(lang) === 'Complete'
                  ? 'bg-green-100 text-green-900'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {badgeText(lang)}
            </span>
          </button>
        ))}
      </div>

      {/* Selected edition detail */}
      <section
        aria-label={`${selectedLocale.toUpperCase()} edition`}
        dir={selectedLocale === 'ar' ? 'rtl' : 'ltr'}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
      >
        {!edition ? (
          <p className="text-slate-500">No {selectedLocale === 'en' ? 'English' : 'Arabic'} draft has been created yet.</p>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{edition.title || 'Untitled'}</h2>
              <p className="mt-2 text-slate-700 leading-relaxed">{edition.excerpt || 'No excerpt provided.'}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                <span>Author: {edition.author_name || 'Anonymous'}</span>
                {edition.reviewer_attribution && <span>Reviewer: {edition.reviewer_attribution}</span>}
                <span>Edition revision: {edition.edition_revision}</span>
              </div>
            </div>

            {/* Readiness breakdown */}
            {readiness && (
              <div className="rounded-lg bg-slate-50 p-4 text-sm" dir="ltr">
                <h3 className="font-semibold text-slate-800">Readiness & Reviews</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div>
                    <span className="block font-medium text-slate-600">Required reviews</span>
                    <span className="text-slate-700">
                      {readiness.required_reviews.length ? readiness.required_reviews.join(', ') : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="block font-medium text-slate-600">Completed reviews</span>
                    <span className="text-slate-700">
                      {readiness.completed_reviews.length ? readiness.completed_reviews.join(', ') : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="block font-medium text-slate-600">Missing fields</span>
                    <span className="text-slate-700">
                      {readiness.missing_fields.length ? readiness.missing_fields.join(', ') : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Body */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Body Content</h3>
              {edition.body && edition.body.blocks?.length > 0 ? (
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <BlogBody body={edition.body} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">No structured body blocks.</p>
              )}
            </div>

            {/* References */}
            {edition.references?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">References</h3>
                <ul className="list-disc ps-5 space-y-1 text-sm text-slate-700">
                  {edition.references.map((ref, idx) => (
                    <li key={idx}>
                      <a href={ref.url} target="_blank" rel="noreferrer" className="text-crimson underline">
                        {ref.label || ref.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

