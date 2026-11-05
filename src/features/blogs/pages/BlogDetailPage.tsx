import { useState } from 'react';
import { describeError } from '../../../lib/api';
import { useBlogDetail } from '../hooks/useBlogDetail';
import { useBlogOptions } from '../hooks/useBlogOptions';
import { useDeleteBlogPost } from '../hooks/useBlogMutations';
import { BlogBody } from '../components/BlogPreview';
import type { BlogDetailPageProps, BlogLocale } from '../types/blogs.types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  const { data: post, isLoading, error: detailError, refetch } = useBlogDetail(postID, onExpired);
  const { data: options } = useBlogOptions(onExpired);
  const deletePost = useDeleteBlogPost();
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
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
          >
            Back to blog library
          </Button>
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
      await deletePost.mutateAsync(postID);
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
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
        >
          ← Back to blog library
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onPreview(post.id)}
          >
            Preview saved revision
          </Button>
          <Button
            type="button"
            onClick={() => onEdit(post.id)}
          >
            Edit article
          </Button>
          {role === 'admin' && (
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? 'Deleting…' : 'Delete article'}
            </Button>
          )}
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="border border-destructive/20 bg-destructive/10 text-destructive rounded-md p-4">
          {deleteError}
        </p>
      )}

      {/* Metadata card */}
      <Card
        aria-label="Article metadata"
        className="p-6"
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
            <Badge variant="outline" className="capitalize">
              {post.status.replaceAll('_', ' ')}
            </Badge>
            <Badge variant="outline">
              Revision {post.aggregate_revision}
            </Badge>
            <Badge variant="outline">
              {categoryLabel}
            </Badge>
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
      </Card>

      {/* Language tabs */}
      <Tabs value={selectedLocale} onValueChange={(val) => setSelectedLocale(val as BlogLocale)}>
        <TabsList aria-label="Article language">
          {LOCALES.map((lang) => (
            <TabsTrigger
              key={lang}
              value={lang}
              onClick={() => setSelectedLocale(lang)}
              className="flex items-center gap-2"
            >
              <span>{lang === 'en' ? 'English' : 'العربية'}</span>
              <Badge variant={badgeText(lang) === 'Complete' ? 'secondary' : 'outline'}>
                {badgeText(lang)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedLocale} className="mt-6">
          {/* Selected edition detail */}
          <Card
            aria-label={`${selectedLocale.toUpperCase()} edition`}
            dir={selectedLocale === 'ar' ? 'rtl' : 'ltr'}
            className="p-6 space-y-6"
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
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

