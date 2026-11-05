import { Fragment, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { useBlogHome } from '../hooks/useBlogReads';
import {
  useDeleteBlogPost,
  useFeatureBlogPost,
  usePublishBlogPost,
  useReviewBlogPost,
  useUnpublishBlogPost,
} from '../hooks/useBlogMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type {
  BlogPublishPanelProps,
  BlogReviewSelection,
  BlogLocale,
  BlogReviewKind,
} from '../types/blogs.types';

const LOCALE_NAME: Record<BlogLocale, string> = { en: 'English', ar: 'Arabic' };
// Known readiness keys in checklist order: [key, checklist label, short name used in sentences, editor field to jump to].
const CHECKLIST: [string, string, string, string][] = [
  ['title', 'Title', 'title', 'title'],
  ['excerpt', 'Excerpt', 'excerpt', 'excerpt'],
  ['body', 'Article body (at least one paragraph)', 'body', 'body'],
  ['author_name', 'Public author', 'public author', 'author'],
  ['cover_media_id', 'Cover image uploaded', 'cover image', 'cover'],
  ['cover_media_ready', 'Cover image processed', 'cover image', 'cover'],
  ['cover_alt', 'Cover alt text', 'cover alt text', 'cover-alt'],
  ['cover_rights_source', 'Cover rights confirmed', 'cover rights record', 'cover'],
];
const REVIEW_LABEL: Record<BlogReviewKind, string> = {
  editorial: 'Editorial review',
  medical: 'Medical review',
  translation: 'Translation review',
  media_rights: 'Media rights review',
};
const humanise = (key: string) => {
  const text = key.replaceAll('_', ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function checklistItems(missing: string[]) {
  if (missing.includes('saved_revision')) {
    return [{ key: 'saved_revision', label: 'Save this edition first', short: 'saved edition', field: 'title', met: false }];
  }
  const known = CHECKLIST.map(([key, label, short, field]) => ({
    key,
    label,
    short,
    field,
    met: !missing.includes(key),
  }));
  const extra = missing
    .filter((key) => !CHECKLIST.some(([known]) => known === key))
    .map((key) => ({ key, label: humanise(key), short: humanise(key).toLowerCase(), field: 'title', met: false }));
  return [...known, ...extra];
}

export function BlogPublishPanel({
  post,
  locked,
  lock,
  onBusy,
  onRefresh,
  onDeleted,
  onJump,
}: BlogPublishPanelProps) {
  const homeQuery = useBlogHome();
  const home = homeQuery.data ?? null;
  const publishPost = usePublishBlogPost();
  const unpublishPost = useUnpublishBlogPost();
  const deletePost = useDeleteBlogPost();
  const reviewPost = useReviewBlogPost();
  const featurePost = useFeatureBlogPost();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<'unpublish' | 'delete' | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [review, setReview] = useState<BlogReviewSelection | null>(null);
  const [attested, setAttested] = useState(false);
  const [reference, setReference] = useState('');
  const [summary, setSummary] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const isLocked = locked || inFlight;
  const confirmPublish = useRef<HTMLButtonElement>(null);
  const publishTrigger = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  const title = post.en?.title || post.ar?.title || post.slug;

  useEffect(() => {
    mounted.current = true;
    void loadHome();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (summary) {
      confirmPublish.current?.focus();
    }
  }, [summary]);

  function closeSummary() {
    setSummary(false);
    window.setTimeout(() => publishTrigger.current?.focus(), 0);
  }

  const reviewCurrent = Boolean(
    review && review.revisionID === post[review.locale]?.id && review.categoryID === post.category_id
  );

  useEffect(() => {
    if (review && !reviewCurrent) {
      setReview(null);
      setAttested(false);
      setReference('');
    }
  }, [review, reviewCurrent]);

  async function loadHome() {
    const result = await homeQuery.refetch();
    if (result.isError && mounted.current) setError('Homepage settings are unavailable. Retry settings to choose a feature.');
  }

  async function run(action: () => Promise<unknown>, success: string, deleted = false, refreshAfter = true) {
    if (lock.current) return;
    lock.current = true;
    setInFlight(true);
    onBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (deleted) {
        onDeleted();
        return;
      }
      setNotice(success);
      setConfirmation(null);
      setReview(null);
      if (refreshAfter) {
        try {
          await onRefresh();
        } catch {
          setError('Action succeeded, but saved details could not be refreshed. Retry saved details before another publication action.');
        }
      }
      await loadHome();
    } catch (failure) {
      const message =
        failure instanceof ApiError && failure.status === 409
          ? 'Conflict: saved revisions or homepage settings changed. Your local EN/AR text is preserved. Reload saved details or retry settings, compare, and try again.'
          : failure instanceof ApiError && failure.status === 401
          ? 'Your session expired. Your local EN/AR text remains in this tab. Sign in in another tab, then retry.'
          : failure instanceof ApiError && failure.status === 403
          ? 'Access denied. Your role or security token does not permit this action. Your local text is preserved.'
          : failure instanceof Error
          ? failure.message
          : 'Request failed. Your local text is preserved.';
      setError(
        message +
          (failure instanceof ApiError && failure.fields
            ? ` ${Object.entries(failure.fields)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' ')}`
            : '')
      );
    } finally {
      lock.current = false;
      setInFlight(false);
      onBusy(false);
    }
  }

  const ready =
    post.readiness &&
    (['en', 'ar'] as const).every((lang) => {
      const value = post.readiness![lang];
      return (
        value.revision_id === post[lang]?.id &&
        value.missing_fields.length === 0 &&
        value.required_reviews.every((kind) => value.completed_reviews.includes(kind))
      );
    });

  const reason = (() => {
    if (!post.readiness) return 'Readiness is unavailable. Reload saved details.';
    for (const lang of ['en', 'ar'] as const) {
      const value = post.readiness[lang];
      const first = checklistItems(value.missing_fields).find((item) => !item.met);
      if (first) {
        return first.key === 'saved_revision'
          ? `${LOCALE_NAME[lang]} edition has not been saved.`
          : `${LOCALE_NAME[lang]} ${first.short} is missing.`;
      }
      if (value.revision_id !== post[lang]?.id) {
        return `${LOCALE_NAME[lang]} readiness is out of date. Reload saved details.`;
      }
    }
    for (const lang of ['en', 'ar'] as const) {
      const value = post.readiness[lang];
      const kind = value.required_reviews.find((item) => !value.completed_reviews.includes(item));
      if (kind) return `${LOCALE_NAME[lang]} ${REVIEW_LABEL[kind].toLowerCase()} is not recorded.`;
    }
    return '';
  })();

  return (
    <Card aria-label="Publication controls" className="space-y-4 p-6">
      <h2 className="text-xl font-semibold">Publication readiness</h2>
      <p className="text-sm text-slate-600">
        Only saved editions and the saved category are reviewed and published. Local unsaved edits stay in the editor. An admin records that qualified medical and Arabic review occurred.
      </p>

      {(['en', 'ar'] as const).map((lang) => {
        const readiness = post.readiness?.[lang];
        const items = readiness ? checklistItems(readiness.missing_fields) : [];
        const incomplete = items.some((item) => !item.met);
        return (
          <section key={lang} aria-label={`${lang.toUpperCase()} readiness`} className="space-y-2">
            <h3 className="font-semibold">
              {LOCALE_NAME[lang]} · saved revision {post[lang]?.edition_revision ?? 'missing'}
            </h3>
            {!readiness ? (
              <p>Readiness unavailable; reload saved details.</p>
            ) : (
              <>
                <ul aria-label={`${LOCALE_NAME[lang]} checklist`} className="space-y-1">
                  {items.map((item) => (
                    <li key={item.key}>
                      {item.met ? (
                        <span>✓ {item.label}</span>
                      ) : (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => onJump?.(lang, item.field)}
                          className="min-h-12 p-0 h-auto text-left underline"
                        >
                          ✗ {item.label}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <h4 className="mt-2 font-medium">Reviews</h4>
                {incomplete ? (
                  <p className="text-sm text-slate-600">Complete the items above first.</p>
                ) : (
                  <>
                    <ul className="space-y-1">
                      {readiness.required_reviews.map((kind) => (
                        <li key={kind}>
                          {readiness.completed_reviews.includes(kind) ? '✓' : '✗'} {REVIEW_LABEL[kind]}:{' '}
                          {readiness.completed_reviews.includes(kind)
                            ? 'recorded for this revision/category'
                            : 'required'}
                        </li>
                      ))}
                    </ul>
                    {readiness.required_reviews.some((kind) => !readiness.completed_reviews.includes(kind)) && (
                      <Button
                        variant="link"
                        size="sm"
                        disabled={locked || !post[lang]}
                        onClick={() => {
                          setReview({
                            locale: lang,
                            revisionID: post[lang]!.id,
                            categoryID: post.category_id,
                          });
                          setAttested(false);
                          setReference('');
                        }}
                        className="min-h-12 p-0 h-auto underline"
                      >
                        Record {lang.toUpperCase()} reviews
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        );
      })}

      {review && reviewCurrent && (() => {
        const readiness = post.readiness?.[review.locale];
        const pending = (readiness?.required_reviews ?? []).filter((kind) => !readiness!.completed_reviews.includes(kind));
        return (
          <fieldset className="space-y-3 rounded-md border p-4">
            <legend className="font-medium text-sm">
              Attest {LOCALE_NAME[review.locale]} reviews · revision {post[review.locale]?.edition_revision}
            </legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                I confirm these reviews were completed for this exact saved revision and category:{' '}
                {pending.map((kind) => REVIEW_LABEL[kind]).join(', ')}.
              </span>
            </label>
            <div>
              <Label htmlFor="review-reference">Private review reference (optional)</Label>
              <Input
                id="review-reference"
                maxLength={2048}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-2 w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                disabled={locked || !attested || !reviewCurrent || pending.length === 0}
                onClick={() => {
                  if (reviewCurrent) {
                    void run(
                      async () => {
                        try {
                          for (const kind of pending) {
                            await reviewPost.mutateAsync({ id: post.id, revisionID: review.revisionID, kind, reference: reference.trim() || undefined });
                          }
                        } catch (failure) {
                          try {
                            await onRefresh();
                          } catch {
                            /* keep the original failure */
                          }
                          throw failure;
                        }
                      },
                      'Reviews recorded for the saved revision and category.'
                    );
                  }
                }}
              >
                Confirm attestation
              </Button>
              <Button variant="outline" disabled={locked} onClick={() => setReview(null)}>
                Cancel attestation
              </Button>
            </div>
          </fieldset>
        );
      })()}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          ref={publishTrigger}
          disabled={locked || !ready}
          onClick={() => setSummary(true)}
          aria-describedby="publish-reason"
        >
          {post.active_publication ? 'Publish update' : 'Publish'}
        </Button>
        <p id="publish-reason" role="status" className="basis-full text-sm text-slate-700">
          {reason || 'Everything is ready to publish.'}
        </p>

        <Dialog
          open={summary}
          onOpenChange={(val) => {
            if (!val && !isLocked) {
              closeSummary();
            }
          }}
        >
          <DialogContent
            aria-modal="true"
            onEscapeKeyDown={(e) => {
              if (isLocked) {
                e.preventDefault();
              } else {
                closeSummary();
              }
            }}
            onPointerDownOutside={(e) => {
              if (isLocked) {
                e.preventDefault();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Publish summary</DialogTitle>
              <DialogDescription>
                {post.active_publication ? 'Publish update?' : 'Publish this article?'}{' '}
                Both editions go live together. Only the saved revisions shown here are published.
              </DialogDescription>
            </DialogHeader>

            <dl className="grid gap-1 sm:grid-cols-[auto_1fr] sm:gap-x-4 text-sm">
              <dt className="font-medium">Category</dt>
              <dd>{post.category_key}</dd>
              {(['en', 'ar'] as const).map((lang) => (
                <Fragment key={lang}>
                  <dt className="font-medium">{LOCALE_NAME[lang]} edition</dt>
                  <dd dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    {post[lang]?.title} · revision {post[lang]?.edition_revision}
                  </dd>
                  <dt className="font-medium">{LOCALE_NAME[lang]} cover</dt>
                  <dd>
                    {post[lang]?.cover_media_id ? `Uploaded · alt: ${post[lang]?.cover_alt}` : 'None'}
                  </dd>
                </Fragment>
              ))}
            </dl>
            <p className="text-sm text-slate-600">
              Both editions go live together. Only the saved revisions shown here are published.
            </p>

            <DialogFooter>
              <Button
                ref={confirmPublish}
                autoFocus
                disabled={isLocked}
                onClick={() => {
                  void run(
                    async () => {
                      try {
                        await publishPost.mutateAsync({
                          id: post.id,
                          expectedAggregateRevision: post.aggregate_revision,
                          categoryID: post.category_id,
                          enRevisionID: post.en!.id,
                          arRevisionID: post.ar!.id,
                        });
                      } finally {
                        setSummary(false);
                      }
                    },
                    'Publication succeeded. Both reviewed editions are now live.'
                  );
                }}
              >
                Confirm publish
              </Button>
              <Button variant="outline" disabled={isLocked} onClick={closeSummary}>
                Cancel publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="link"
          disabled={locked}
          onClick={() => void run(onRefresh, 'Saved details reloaded; local text remains available for comparison.', false, false)}
          className="p-0 h-auto underline"
        >
          Reload saved details
        </Button>
      </div>

      <details className="rounded-md border p-4">
        <summary className="min-h-12 cursor-pointer font-semibold">Manage</summary>
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-3">
            {post.active_publication && (
              <Button
                variant="outline"
                disabled={locked}
                onClick={() => {
                  setConfirmation('unpublish');
                  setTitleInput('');
                }}
              >
                Unpublish
              </Button>
            )}
            <Button
              variant="outline"
              disabled={locked}
              onClick={() => {
                setConfirmation('delete');
                setTitleInput('');
              }}
            >
              Delete article
            </Button>
          </div>

          {confirmation && (
            <fieldset className="space-y-3 rounded-md border p-4">
              <legend className="font-medium text-sm">
                Confirm {confirmation}: {title}
              </legend>
              <p className="text-sm text-slate-600">
                {confirmation === 'delete'
                  ? 'Delete removes this article from public pages and the library, retains private history, and does not release its slug.'
                  : 'Unpublish removes the live article and cover from new public reads; the draft and history remain.'}{' '}
                Any homepage feature falls back to the newest eligible article. Already downloaded copies cannot be recalled.
              </p>
              <div>
                <Label htmlFor="blog-confirm-title">Type the article title: {title}</Label>
                <Input
                  id="blog-confirm-title"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="mt-2 w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={locked || titleInput !== title}
                  onClick={() =>
                    void run(
                      () =>
                        confirmation === 'delete'
                          ? deletePost.mutateAsync(post.id)
                          : unpublishPost.mutateAsync({ id: post.id, revision: post.aggregate_revision }),
                      'Article unpublished. Homepage selection reloaded; automatic fallback uses the newest eligible article.',
                      confirmation === 'delete'
                    )
                  }
                >
                  Confirm {confirmation}
                </Button>
                <Button variant="outline" disabled={locked} onClick={() => setConfirmation(null)}>
                  Cancel
                </Button>
              </div>
            </fieldset>
          )}

          <section aria-label="Homepage feature" className="space-y-2">
            <h3 className="font-semibold">Homepage feature</h3>
            <p className="text-sm text-slate-600">
              {!home
                ? 'Settings unavailable.'
                : home.featured_post_id === post.id
                ? 'This article is selected.'
                : home.featured_post_id
                ? 'Another live article is selected.'
                : 'Automatic: newest eligible article.'}{' '}
              Withdrawal/deletion clears a selected article and uses the newest eligible fallback.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={locked || !home || !post.active_publication}
                onClick={() =>
                  void run(
                    () => featurePost.mutateAsync({ revision: home!.revision, postID: post.id }),
                    'Homepage feature selected.'
                  )
                }
              >
                Feature this article
              </Button>
              <Button
                variant="outline"
                disabled={locked || !home}
                onClick={() =>
                  void run(
                    () => featurePost.mutateAsync({ revision: home!.revision, postID: null }),
                    'Homepage now uses the automatic newest eligible article.'
                  )
                }
              >
                Use automatic newest
              </Button>
              <Button
                variant="link"
                disabled={locked}
                onClick={() => void loadHome()}
                className="p-0 h-auto underline"
              >
                Retry settings
              </Button>
            </div>
          </section>
        </div>
      </details>

      {notice && (
        <p role="status" className="rounded-md bg-green-50 p-4 text-green-900">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-md bg-red-50 p-4 text-red-900">
          <p>{error}</p>
          {error.includes('session expired') && (
            <a href="/admin/login" target="_blank" rel="noreferrer" className="underline">
              Sign in in another tab, then retry
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
