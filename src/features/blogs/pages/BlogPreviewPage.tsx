import { useState } from 'react';
import { useBlogDetail } from '../hooks/useBlogDetail';
import { useBlogDraft } from '../context/BlogDraftContext';
import { BlogPreview } from '../components/BlogPreview';
import { describeError } from '../../../lib/api';
import type { BlogLocale, BlogPreviewPageProps } from '../types/blogs.types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
      <div role="alert" className="mt-8 border border-destructive/20 bg-destructive/10 text-destructive rounded-md p-6">
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
            onClick={onClose}
          >
            Return to editor
          </Button>
        </div>
      </div>
    );
  }

  const editionRevision = post[locale]?.edition_revision;

  return (
    <div className="mt-6 space-y-6">
      <Tabs value={locale} onValueChange={(val) => setLocale(val as BlogLocale)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            ← Return to editor
          </Button>

          <TabsList aria-label="Preview language">
            {LOCALES.map((lang) => (
              <TabsTrigger
                key={lang}
                value={lang}
                onClick={() => setLocale(lang)}
              >
                {lang === 'en' ? 'English' : 'العربية'}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={locale} className="mt-6">
          <BlogPreview
            postID={postID}
            locale={locale}
            revision={editionRevision}
            dirty={isDirty}
            onClose={onClose}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

