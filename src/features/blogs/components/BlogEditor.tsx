import { toast } from 'sonner';
import { useAdminNavigation } from '../../../lib/admin-navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { blogEditorSchema } from '../schemas/blog-editor.schema';
import { contentProgress } from '../utils/blog-progress.utils';
import { ApiError } from '../../../lib/api';
import { fieldErrors } from '../../../lib/form-errors';
import { useQueryClient } from '@tanstack/react-query';
import { blogKeys } from '../hooks/blog.keys';
import { useBlogEditorReads } from '../hooks/useBlogReads';
import { useSaveBlogPost, useUploadBlogCover } from '../hooks/useBlogMutations';
import type {
  BlogEditorProps,
  BlogEditorFormValues,
  BlogRequiredProps,
  BlogBodyBlock,
  BlogDraftFormState as FormState,
  BlogDetail,
  BlogEdition,
  BlogLocale,
  BlogSaveInput,
} from '../types/blogs.types';
import { useBlogDraft } from '../context/BlogDraftContext';
import { BlogBody, BlogPreview } from './BlogPreview';
import { BlogPublishPanel } from './BlogPublishPanel';
import { BlogGenerator } from './BlogGenerator';
import { BlogGuidedNavigation } from './guided-editor/BlogGuidedNavigation';
import type { BlogCoverDraft, BlogGuidedStep } from '../types/blogs.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const empty = (post: BlogDetail): FormState => ({
  slug: post.slug,
  categoryID: post.category_id,
  title: '',
  excerpt: '',
  author: '',
  reviewer: '',
  coverMediaID: null,
  coverAlt: '',
  seoTitle: '',
  seoDescription: '',
  blocks: [],
  references: [],
});

function fromEdition(post: BlogDetail, edition?: BlogEdition): FormState {
  return edition
    ? {
        slug: post.slug,
        categoryID: post.category_id,
        title: edition.title,
        excerpt: edition.excerpt,
        author: edition.author_name,
        reviewer: edition.reviewer_attribution ?? '',
        coverMediaID: edition.cover_media_id,
        coverAlt: edition.cover_alt,
        seoTitle: edition.seo_title,
        seoDescription: edition.seo_description,
        blocks: edition.body.blocks,
        references: edition.references,
      }
    : empty(post);
}

function rebaseForms(all: Record<BlogLocale, FormState>, baseline: Record<BlogLocale, FormState>, nextSaved: Record<BlogLocale, FormState>) {
  const next = structuredClone(all);
  for (const lang of ['en', 'ar'] as const) {
    for (const key of Object.keys(next[lang]) as (keyof FormState)[]) {
      if (JSON.stringify(all[lang][key]) === JSON.stringify(baseline[lang][key])) {
        Object.assign(next[lang], { [key]: nextSaved[lang][key] });
      }
    }
  }
  return next;
}

const LOCALES = ['en', 'ar'] as const;
const LOCALE_NAME: Record<BlogLocale, string> = { en: 'English', ar: 'Arabic' };

function Req({ children }: BlogRequiredProps) {
  return <span className="after:ml-1 after:text-crimson after:content-['*']">{children}</span>;
}

function failureMessage(error: unknown, onExpired: () => void) {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'This draft changed elsewhere. Copy your work, or reload the latest revision and deliberately reapply it.';
    if (error.status === 401) {
      onExpired();
      return 'Your session expired. Your text remains in this tab; sign in again to retry or copy it.';
    }
    return error.message;
  }
  return 'The request failed. Your entered values are still available.';
}

export function BlogEditor(props: BlogEditorProps) {
  return <BlogEditorContent key={props.postID} {...props} />;
}

function BlogEditorContent({
  postID,
  role = 'staff',
  onExpired,
  onNavigate,
  onDeleted = onNavigate,
  registerBlocker,
}: BlogEditorProps) {
  const routerNavigation = useAdminNavigation();
  const { draft, saveForPost, clearForPost } = useBlogDraft(postID);
  const { detail, options: optionsQuery, loadDetail, loadOptions } = useBlogEditorReads(postID);
  const queryClient = useQueryClient();
  const post = detail.data ?? null;
  const options = optionsQuery.data ?? null;
  const savePost = useSaveBlogPost();
  const uploadCover = useUploadBlogCover();
  const initialDraft = useRef(draft);
  const [locale, setLocale] = useState<BlogLocale>('en');
  const [step, setStep] = useState<BlogGuidedStep>('Details');
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const editorForm = useForm<BlogEditorFormValues>({ defaultValues: { forms: null }, resolver: zodResolver(blogEditorSchema) });
  const forms = useWatch({ control: editorForm.control, name: 'forms' });
  function setForms(value: Record<BlogLocale, FormState> | null | ((previous: Record<BlogLocale, FormState> | null) => Record<BlogLocale, FormState> | null)) {
    editorForm.setValue('forms', typeof value === 'function' ? value(editorForm.getValues('forms')) : value);
  }
  const [saved, setSaved] = useState<Record<BlogLocale, FormState> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [errorLocale, setErrorLocale] = useState<BlogLocale>('en');
  const [busy, setBusy] = useState<null | 'save' | 'upload' | 'lifecycle' | 'refresh'>(null);
  const [attempt, setAttempt] = useState(0);
  const refreshVersion = useRef(0);
  const appliedPost = useRef<BlogDetail | null>(null);
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const wasPreview = useRef(false);
  const operationLock = useRef(false);
  const [fresh, setFresh] = useState(true);
  const [localPreview, setLocalPreview] = useState(false);
  const preview = routerNavigation ? routerNavigation.routeId === 'blog-preview' : localPreview;
  const [covers, setCovers] = useState<Record<BlogLocale, BlogCoverDraft>>({
    en: { file: null, rights: '', focalX: 0.5, focalY: 0.5 },
    ar: { file: null, rights: '', focalX: 0.5, focalY: 0.5 },
  });
  const { file, rights, focalX, focalY } = covers[locale];
  function updateCover(patch: Partial<BlogCoverDraft>) {
    setCovers((previous) => ({ ...previous, [locale]: { ...previous[locale], ...patch } }));
  }
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = useMemo(
    () => Boolean(forms && saved && JSON.stringify(forms) !== JSON.stringify(saved)) || Boolean(covers.en.file || covers.ar.file),
    [forms, saved, covers]
  );

  useEffect(() => {
    let active = true;
    const version = ++refreshVersion.current;
    setLoading(true);
    Promise.all([loadDetail(postID, undefined, () => active && version === refreshVersion.current), loadOptions()])
      .then(([p]) => {
        if (!active || version !== refreshVersion.current) return;
        const value = { en: fromEdition(p, p.en), ar: fromEdition(p, p.ar) };
        appliedPost.current = p;
        const stored = initialDraft.current;
        setForms(stored ? rebaseForms(stored.forms, stored.saved, value) : value);
        setSaved(structuredClone(value));
        if (stored) {
          setLocale(stored.locale);
          setCovers(stored.covers ?? {
            en: stored.locale === 'en' ? { file: stored.file, rights: stored.rights, focalX: stored.focalX, focalY: stored.focalY } : { file: null, rights: '', focalX: 0.5, focalY: 0.5 },
            ar: stored.locale === 'ar' ? { file: stored.file, rights: stored.rights, focalX: stored.focalX, focalY: stored.focalY } : { file: null, rights: '', focalX: 0.5, focalY: 0.5 },
          });
        }
        setFresh(true);
        setError('');
        setLoading(false);
      })
      .catch((failure) => {
        if (!active) return;
        setError(failureMessage(failure, onExpired));
        setLoading(false);
      });
    return () => {
      active = false;
      ++refreshVersion.current;
      void queryClient.cancelQueries({ queryKey: blogKeys.detail(postID), exact: true });
    };
  }, [postID, attempt, loadDetail, loadOptions]);

  useEffect(() => {
    if (!post || !saved || !fresh || busy || !appliedPost.current || appliedPost.current === post) return;
    const nextSaved = { en: fromEdition(post, post.en), ar: fromEdition(post, post.ar) };
    appliedPost.current = post;
    setForms((all) => all ? rebaseForms(all, saved, nextSaved) : all);
    setSaved(nextSaved);
  }, [post, saved, fresh, busy]);

  useEffect(() => {
    if (forms && saved) saveForPost(postID, { forms, saved, locale, file, rights, focalX, focalY, covers, dirty });
  }, [postID, forms, saved, locale, file, rights, focalX, focalY, covers, dirty, saveForPost]);

  useEffect(() => {
    if (!preview && wasPreview.current) previewTrigger.current?.focus();
    wasPreview.current = preview;
  }, [preview]);

  useEffect(() => {
    const block = () => {
      const allowed = !dirty || window.confirm('You have unsaved blog changes. Leave and discard them?');
      if (allowed) clearForPost(postID);
      return allowed;
    };
    registerBlocker(block);
    const unload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', unload);
    return () => {
      registerBlocker(null);
      window.removeEventListener('beforeunload', unload);
    };
  }, [dirty, registerBlocker]);

  if (loading) return <p role="status" className="mt-8">Loading blog editor…</p>;
  if (!post || !forms || !saved || !options) {
    return (
      <Card className="mt-8 p-6">
        <p role="alert" className="text-destructive font-medium">{error || 'Article data is unavailable.'}</p>
        <Button variant="outline" onClick={() => setAttempt((v) => v + 1)} className="mt-3">
          Retry
        </Button>
      </Card>
    );
  }

  const currentPost = post;
  const form = forms[locale];

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForms((all) => {
      if (!all) return all;
      if (key === 'slug' || key === 'categoryID') {
        return { en: { ...all.en, [key]: value }, ar: { ...all.ar, [key]: value } };
      }
      return { ...all, [locale]: { ...all[locale], [key]: value } };
    });
    if (locale === errorLocale) {
      const serverKey = ({ categoryID: 'category_id', author: 'author_name', reviewer: 'reviewer_attribution', coverAlt: 'cover_alt', seoTitle: 'seo_title', seoDescription: 'seo_description', blocks: 'body' } as Partial<Record<keyof FormState, string>>)[key] ?? key;
      setFields((previous) => Object.fromEntries(Object.entries(previous).filter(([field]) => field !== serverKey && !field.startsWith(`${serverKey}.`))));
    }
    setNotice('');
  }

  function setBlock(index: number, patch: Partial<BlogBodyBlock>) {
    const clean = patch.marks
      ? {
          ...patch,
          marks: patch.marks.map((mark) => (mark.type === 'link' ? mark : { type: mark.type, start: mark.start, end: mark.end })),
        }
      : patch;
    update(
      'blocks',
      form.blocks.map((block, i) => (i === index ? { ...block, ...clean } : block))
    );
  }

  function addBlock(type: BlogBodyBlock['type']) {
    const block: BlogBodyBlock =
      type === 'heading'
        ? { type, level: 2, text: '' }
        : type === 'list'
        ? { type, style: 'unordered', items: [''] }
        : { type, text: '' };
    update('blocks', [...form.blocks, block]);
  }

  function changePreview(open: boolean) {
    const target = `/admin/blogs/${encodeURIComponent(postID)}${open ? '/preview' : '/edit'}${routerNavigation?.search ?? ''}`;
    if (routerNavigation) routerNavigation.navigate(target);
    else setLocalPreview(open);
  }

  async function retrySavedDetails() {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusy('refresh');
    setError('');
    try {
      await refresh();
    } catch (failure) {
      setError(failureMessage(failure, onExpired));
    } finally {
      operationLock.current = false;
      setBusy(null);
    }
  }

  async function refresh(expectedRevision?: number, baseline = saved) {
    const version = ++refreshVersion.current;
    try {
      const data = await loadDetail(currentPost.id, expectedRevision, () => version === refreshVersion.current);
      if (version !== refreshVersion.current) return;
      const nextSaved = { en: fromEdition(data, data.en), ar: fromEdition(data, data.ar) };
      // Rebase untouched fields only; typing during an in-flight request stays local.
      setForms((all) => all && baseline ? rebaseForms(all, baseline, nextSaved) : all);
      appliedPost.current = data;
      setSaved(nextSaved);
      setFresh(true);
    } catch (failure) {
      if (version !== refreshVersion.current) return;
      setFresh(false);
      throw failure;
    }
  }

  async function save() {
    if (operationLock.current || !fresh) return;
    const changed = LOCALES.filter((lang) => JSON.stringify(forms![lang]) !== JSON.stringify(saved![lang]));
    if (!changed.length) {
      setNotice('Nothing to save.');
      return;
    }
    const voided = changed
      .map((lang) => ({ lang, kinds: currentPost.readiness?.[lang]?.completed_reviews ?? [] }))
      .filter((item) => item.kinds.length > 0);
    if (
      voided.length &&
      !window.confirm(
        `Saving voids: ${voided.map((item) => `${item.kinds.map((kind) => kind.replace('_', ' ')).join(', ')} (${LOCALE_NAME[item.lang]})`).join('; ')}. You will need to attest again. Save anyway?`
      )
    )
      return;
    operationLock.current = true;
    setBusy('save');
    setError('');
    setFields({});
    setNotice('');
    let revision = currentPost.aggregate_revision;
    let baseline = saved!;
    const done: BlogLocale[] = [];
    try {
      for (const lang of changed) {
        const f = forms![lang];
        const other = lang === 'en' ? 'ar' : 'en';
        const input: BlogSaveInput = {
          expected_revision: revision,
          lang,
          slug: f.slug,
          category_id: f.categoryID,
          title: f.title,
          excerpt: f.excerpt,
          body: { schema_version: 1, blocks: f.blocks },
          cover_media_id: f.coverMediaID,
          cover_alt: f.coverAlt,
          author_name: f.author,
          reviewer_attribution: f.reviewer || null,
          seo_title: f.seoTitle,
          seo_description: f.seoDescription,
          references: f.references,
        };
        try {
          const result = await savePost.mutateAsync({ id: currentPost.id, input });
          revision = result.aggregate_revision;
          baseline = {
            ...baseline,
            [lang]: structuredClone(f),
            [other]: { ...baseline[other], slug: f.slug, categoryID: f.categoryID },
          } as typeof baseline;
          done.push(lang);
        } catch (failure) {
          if (!(failure instanceof ApiError && failure.status === 401)) toast.error(`${LOCALE_NAME[lang]} was not saved${done.length ? `; ${done.map((l) => LOCALE_NAME[l]).join(', ')} saved` : ''}. Check the details and try again.`);
          setError(
            `${LOCALE_NAME[lang]} was not saved${done.length ? ` (${done.map((l) => LOCALE_NAME[l]).join(', ')} saved)` : ''}. ${failureMessage(failure, onExpired)}`
          );
          const mapped = fieldErrors(failure);
          setFields(mapped);
          setErrorLocale(lang);
          const firstField = Object.keys(mapped)[0];
          if (firstField) jumpToField(lang, firstField);
          else { setLocale(lang); window.setTimeout(() => document.getElementById('blog-error-summary')?.focus(), 0); }
          break;
        }
      }
      if (done.length) {
        setSaved(baseline);
        setNotice(`${done.map((l) => LOCALE_NAME[l]).join(' and ')} saved.`);
        if (done.length === changed.length) toast.success(`${done.map((l) => LOCALE_NAME[l]).join(' and ')} saved.`);
        await refresh(revision, baseline);
      }
    } catch (failure) {
      setError(failureMessage(failure, onExpired));
    } finally {
      operationLock.current = false;
      setBusy(null);
    }
  }

  function selectStep(next: BlogGuidedStep) {
    if (next === step || next === 'Start') return;
    setStep(next);
    window.setTimeout(() => stageHeading.current?.focus(), 0);
  }

  function jumpToField(lang: BlogLocale, field: string) {
    setLocale(lang);
    const root = field.split(/[.[]/)[0];
    const aliases: Record<string, string> = { author_name: 'author', reviewer_attribution: 'reviewer', category_id: 'category', cover_alt: 'cover-alt', cover_media_id: 'cover', seo_title: 'seo-title', seo_description: 'seo-description', references: 'references' };
    const targetField = aliases[root] ?? root;
    setStep(['body', 'references', 'seo-title', 'seo-description'].includes(targetField) ? 'Content' : ['cover', 'cover-alt'].includes(targetField) ? 'Cover' : 'Details');
    // Wait for the locale and stage switch to render before focusing.
    window.setTimeout(() => {
      const target = document.getElementById(`blog-field-${targetField}`) ?? document.getElementById('blog-error-summary');
      target?.scrollIntoView?.({ block: 'center' });
      target?.focus();
    }, 0);
  }

  async function upload() {
    if (!file || operationLock.current || !fresh || !rights.trim()) return;
    operationLock.current = true;
    setBusy('upload');
    setError('');
    setProgress(0);
    let uploaded = false;
    try {
      const result = await uploadCover.mutateAsync({ id: currentPost.id, file, expectedRevision: currentPost.aggregate_revision, rights, focalX, focalY, onProgress: setProgress });
      queryClient.setQueryData<BlogDetail>(blogKeys.detail(currentPost.id), (p) => p && { ...p, aggregate_revision: result.aggregate_revision });
      setForms((all) => all && { ...all, [locale]: { ...all[locale], coverMediaID: result.media_id } });
      setCovers((previous) => ({ ...previous, [locale]: { ...previous[locale], file: null } }));
      if (fileRef.current && fileRef.current.dataset.locale === locale) fileRef.current.value = '';
      uploaded = true;
      toast.success('Cover uploaded.');
      setNotice('Cover uploaded. Save this locale draft to use it; other unsaved fields remain unsaved.');
      await refresh(result.aggregate_revision);
    } catch (failure) {
      if (!(failure instanceof ApiError && failure.status === 401) && !uploaded) toast.error('Cover upload failed. Try again.');
      setError(uploaded && !(failure instanceof ApiError && failure.status === 401) ? 'Cover uploaded, but saved details could not be refreshed. Retry saved details.' : failureMessage(failure, onExpired));
    } finally {
      operationLock.current = false;
      setBusy(null);
    }
  }

  const badge = (lang: BlogLocale) => {
    const missing = currentPost.readiness?.[lang]?.missing_fields;
    if (!missing) return '';
    if (missing.includes('saved_revision')) return 'Not started';
    return missing.length ? `${missing.length} missing` : 'Complete';
  };

  return (
    <div className="mt-8 space-y-6">
      <Card className="sticky top-0 z-10 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{forms.en.title || forms.ar.title || post.slug}</h1>
            <p className="text-sm text-slate-600">
              {post.status.replaceAll('_', ' ')} · Revision {post.aggregate_revision}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {dirty ? (
              <p role="status" className="text-amber-900">
                Unsaved changes
              </p>
            ) : (
              <p role="status" className="text-slate-600">
                All changes saved
              </p>
            )}
            <Button
              ref={previewTrigger}
              type="button"
              variant="outline"
              disabled={!fresh || Boolean(busy)}
              onClick={() => changePreview(true)}
            >
              Preview saved revision
            </Button>
            <Button
              type="submit"
              form="blog-editor-form"
              disabled={!fresh || Boolean(busy)}
            >
              {busy === 'save' ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="outline" onClick={onNavigate}>
              Back to Blogs
            </Button>
          </div>
        </header>
      </Card>

      <Card className="p-4 space-y-4">
        <BlogGuidedNavigation current={step} onSelect={selectStep} />
        <h2 ref={stageHeading} tabIndex={-1} className="text-xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          Step {['Start', 'Details', 'Content', 'Cover', 'Review and publish'].indexOf(step) + 1} of 5: {step}
        </h2>
        <p className="text-sm text-slate-600">Local progress is based on the current {LOCALE_NAME[locale]} draft, not saved publication readiness.</p>
        {(step === 'Details' || step === 'Content') && <p role="status" className="text-sm">{step} · {locale === errorLocale && Object.keys(fields).length ? 'Needs attention: check server validation' : step === 'Details' ? (form.slug.trim() && form.categoryID && form.title.trim() && form.excerpt.trim() && form.author.trim() ? 'Required information present' : 'Incomplete') : contentProgress(form)}</p>}
        {step === 'Cover' && <p role="status" className="text-sm">Cover · {file && !rights.trim() ? 'Needs attention: add a rights/source record' : !form.coverAlt.trim() || (!file && !form.coverMediaID) ? 'Incomplete' : file ? 'Required information present locally' : 'Saved media readiness unknown'}</p>}
      </Card>

      {!fresh && (
        <Card role="alert" className="p-4">
          <p>Saved details need refreshing. Local EN/AR text is preserved. Compare the saved preview before saving again.</p>
          <Button variant="link" disabled={Boolean(busy)} onClick={() => void retrySavedDetails()} className="mt-2 p-0 h-auto">
            Retry saved details
          </Button>
        </Card>
      )}

      {preview && fresh && (
        <>
          <BlogPreview
            postID={post.id}
            locale={locale}
            revision={post[locale]?.edition_revision}
            dirty={dirty}
            onClose={() => changePreview(false)}
          />
          {dirty && (
            <Card role="region" aria-label="Unsaved article preview" className="p-4">
              <p className="text-sm text-muted-foreground">Unsaved {locale.toUpperCase()} draft · Non-public</p>
              <article lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="mt-2 space-y-2">
                <h2 className="text-xl font-bold">{form.title}</h2>
                <p className="text-slate-700">{form.excerpt}</p>
                <p className="text-sm text-slate-500">{form.author}</p>
                <BlogBody body={{ schema_version: 1, blocks: form.blocks }} />
              </article>
            </Card>
          )}
        </>
      )}

      {role === 'admin' && fresh && (
        <BlogPublishPanel
          post={post}
          locked={Boolean(busy)}
          lock={operationLock}
          onBusy={(value) => setBusy(value ? 'lifecycle' : null)}
          onRefresh={refresh}
          onDeleted={onDeleted}
          onExpired={onExpired}
          onJump={jumpToField}
        />
      )}

      <div hidden={step !== 'Content'}>
      {!options.generation_enabled ? (
        <Card aria-label="AI drafting" className="p-6">
          <h2 className="text-xl font-semibold">AI drafting</h2>
          <p className="mt-2 text-slate-600">AI drafting is unavailable. You can continue writing and saving this article manually.</p>
        </Card>
      ) : (
        LOCALES.map((language) => (
          <BlogGenerator
              key={language}
              active={step === 'Content' && locale === language}
              postID={post.id}
              locale={language}
              baseRevision={post.aggregate_revision}
              dirty={dirty}
              currentDraft={{
                title: forms[language].title,
                excerpt: forms[language].excerpt,
                seoTitle: forms[language].seoTitle,
                seoDescription: forms[language].seoDescription,
              }}
              onRefresh={refresh}
              onExpired={onExpired}
              onApplied={(msg) => setNotice(msg)}
            />
        ))
      )}

      </div>

      <Tabs value={locale} onValueChange={(val) => setLocale(val as BlogLocale)}>
        <div className="flex flex-wrap items-center gap-3">
          <TabsList aria-label="Article language">
            {LOCALES.map((lang) => (
              <TabsTrigger
                key={lang}
                value={lang}
                aria-describedby={`badge-${lang}`}
                onClick={() => setLocale(lang)}
              >
                {lang === 'en' ? 'English' : 'العربية'}
              </TabsTrigger>
            ))}
          </TabsList>
          {LOCALES.map((lang) => (
            <Badge
              key={lang}
              id={`badge-${lang}`}
              variant={badge(lang) === 'Complete' ? 'default' : 'outline'}
            >
              {badge(lang)}
            </Badge>
          ))}
        </div>

        {notice && (
          <p role="status" className="mt-4 rounded-md bg-green-50 p-4 text-green-900">
            {notice}
          </p>
        )}
        {error && (
          <div id="blog-error-summary" tabIndex={-1} role="alert" className="mt-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-md p-4">
            <p>{error}</p>
            {Object.keys(fields).length > 0 && <p>Fields for {LOCALE_NAME[errorLocale]}:</p>}
            {Object.entries(fields).map(([k, v]) => (
              <p key={k}><Button type="button" variant="link" className="p-0 h-auto" onClick={() => jumpToField(errorLocale, k)}>{k}: {v}</Button></p>
            ))}
            {error.includes('This draft changed') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm('Reload the latest revision and discard your local edits?')) setAttempt((v) => v + 1);
                }}
                className="mt-3"
              >
                Reload latest (discard local)
              </Button>
            )}
            {error.includes('Your session expired') && (
              <a href="/admin/login" target="_blank" rel="noreferrer" className="mt-3 inline-block underline">
                Sign in in another tab, then retry
              </a>
            )}
          </div>
        )}

        <TabsContent value={locale} className="mt-6">
          <form id="blog-editor-form" onSubmit={editorForm.handleSubmit(save)} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-6">
        <div hidden={step !== 'Details'}>
        <Card className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="blog-field-title">
                <Req>Title</Req>
              </Label>
              {locale === errorLocale && fields.title && <p id="blog-error-title" className="text-sm text-destructive">{fields.title}</p>}
              <Input
                id="blog-field-title"
                aria-invalid={locale === errorLocale && Boolean(fields.title)}
                aria-describedby={locale === errorLocale && fields.title ? "blog-error-title" : undefined}
                aria-required="true"
                value={form.title}
                maxLength={180}
                onChange={(e) => update('title', e.target.value)}
                className="mt-2 w-full"
              />
            </div>
            <div>
              <Label htmlFor="blog-field-slug"><Req>Slug</Req></Label>
              {locale === errorLocale && fields.slug && <p id="blog-error-slug" className="text-sm text-destructive">{fields.slug}</p>}
              <Input
                id="blog-field-slug"
                aria-invalid={locale === errorLocale && Boolean(fields.slug)}
                aria-describedby={locale === errorLocale && fields.slug ? "blog-error-slug" : undefined}
                disabled={Boolean(post.first_published_at)}
                value={form.slug}
                onChange={(e) => update('slug', e.target.value)}
                className="mt-2 w-full"
              />
            </div>
            <div>
              <Label htmlFor="blog-field-category"><Req>Category</Req></Label>
              {locale === errorLocale && fields.category_id && <p id="blog-error-category" className="text-sm text-destructive">{fields.category_id}</p>}
              <select
                id="blog-field-category"
                aria-invalid={locale === errorLocale && Boolean(fields.category_id)}
                aria-describedby={locale === errorLocale && fields.category_id ? "blog-error-category" : undefined}
                value={form.categoryID}
                onChange={(e) => update('categoryID', e.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {!options.categories.some((c) => c.id === post.category_id) && (
                  <option value={post.category_id}>
                    {(locale === 'ar' ? post.category_name_ar : post.category_name_en) || post.category_key} (Retired)
                  </option>
                )}
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === 'ar' ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="blog-field-author">
                <Req>Public author</Req>
              </Label>
              {locale === errorLocale && fields.author_name && <p id="blog-error-author" className="text-sm text-destructive">{fields.author_name}</p>}
              <Input
                id="blog-field-author"
                aria-invalid={locale === errorLocale && Boolean(fields.author_name)}
                aria-describedby={locale === errorLocale && fields.author_name ? "blog-error-author" : undefined}
                aria-required="true"
                value={form.author}
                maxLength={120}
                onChange={(e) => update('author', e.target.value)}
                className="mt-2 w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="blog-field-excerpt">
                <Req>Excerpt</Req>
              </Label>
              {locale === errorLocale && fields.excerpt && <p id="blog-error-excerpt" className="text-sm text-destructive">{fields.excerpt}</p>}
              <Textarea
                id="blog-field-excerpt"
                aria-invalid={locale === errorLocale && Boolean(fields.excerpt)}
                aria-describedby={locale === errorLocale && fields.excerpt ? "blog-error-excerpt" : undefined}
                aria-required="true"
                value={form.excerpt}
                maxLength={360}
                onChange={(e) => update('excerpt', e.target.value)}
                rows={3}
                className="mt-2 w-full"
              />
            </div>
            <div>
              <Label htmlFor="blog-field-reviewer">Reviewer attribution (optional)</Label>
              {locale === errorLocale && fields.reviewer_attribution && <p id="blog-error-reviewer" className="text-sm text-destructive">{fields.reviewer_attribution}</p>}
              <Input
                id="blog-field-reviewer"
                aria-invalid={locale === errorLocale && Boolean(fields.reviewer_attribution)}
                aria-describedby={locale === errorLocale && fields.reviewer_attribution ? "blog-error-reviewer" : undefined}
                value={form.reviewer}
                onChange={(e) => update('reviewer', e.target.value)}
                className="mt-2 w-full"
              />
            </div>

          </div>
        </Card>

        </div>
        <div hidden={step !== 'Content'}>
        <Card id="blog-field-body" tabIndex={-1} className="p-6">
          <h2 className="text-xl font-semibold">Structured body (required)</h2>
          <div className="mt-3 flex flex-wrap gap-2" dir="ltr">
            {(['paragraph', 'heading', 'list', 'blockquote'] as const).map((type) => (
              <Button type="button" variant="outline" size="sm" key={type} onClick={() => addBlock(type)}>
                Add {type}
              </Button>
            ))}
          </div>
          <div className="mt-4 space-y-4">
            {form.blocks.map((block, i) => (
              <fieldset key={i} className="rounded-md border p-4 space-y-3">
                <legend className="font-medium text-sm">
                  {block.type} {i + 1}
                </legend>
                {block.type === 'heading' && (
                  <select
                    aria-label={`Heading level ${i + 1}`}
                    value={block.level}
                    onChange={(e) => setBlock(i, { level: Number(e.target.value) as 2 | 3 })}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                  >
                    <option value="2">H2</option>
                    <option value="3">H3</option>
                  </select>
                )}
                {block.type === 'list' ? (
                  <>
                    <select
                      aria-label={`List style ${i + 1}`}
                      value={block.style}
                      onChange={(e) => setBlock(i, { style: e.target.value as 'ordered' | 'unordered' })}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                    >
                      <option value="unordered">Bullets</option>
                      <option value="ordered">Numbered</option>
                    </select>
                    <Textarea
                      aria-label={`List items ${i + 1}`}
                      value={(block.items ?? []).join('\n')}
                      onChange={(e) => setBlock(i, { items: e.target.value.split('\n') })}
                      className="mt-2 w-full"
                    />
                  </>
                ) : (
                  <>
                    <Textarea
                      aria-label={`Block text ${i + 1}`}
                      value={block.text ?? ''}
                      onChange={(e) => setBlock(i, { text: e.target.value })}
                      className="mt-2 w-full"
                    />
                    <div className="mt-2 space-y-2" dir="ltr">
                      {(block.marks ?? []).map((mark, m) => (
                        <div key={m} className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`Mark type ${i + 1}-${m + 1}`}
                            value={mark.type}
                            onChange={(e) =>
                              setBlock(i, {
                                marks: (block.marks ?? []).map((x, n) =>
                                  n === m ? { ...x, type: e.target.value as typeof x.type } : x
                                ),
                              })
                            }
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                          >
                            <option value="strong">Strong</option>
                            <option value="em">Emphasis</option>
                            <option value="link">Link</option>
                          </select>
                          <Input
                            aria-label={`Mark start ${i + 1}-${m + 1}`}
                            type="number"
                            min="0"
                            value={mark.start}
                            onChange={(e) =>
                              setBlock(i, {
                                marks: (block.marks ?? []).map((x, n) =>
                                  n === m ? { ...x, start: Number(e.target.value) } : x
                                ),
                              })
                            }
                            className="w-20"
                          />
                          <Input
                            aria-label={`Mark end ${i + 1}-${m + 1}`}
                            type="number"
                            min="0"
                            value={mark.end}
                            onChange={(e) =>
                              setBlock(i, {
                                marks: (block.marks ?? []).map((x, n) =>
                                  n === m ? { ...x, end: Number(e.target.value) } : x
                                ),
                              })
                            }
                            className="w-20"
                          />
                          {mark.type === 'link' && (
                            <Input
                              aria-label={`Mark URL ${i + 1}-${m + 1}`}
                              value={mark.href ?? ''}
                              onChange={(e) =>
                                setBlock(i, {
                                  marks: (block.marks ?? []).map((x, n) =>
                                    n === m ? { ...x, href: e.target.value } : x
                                  ),
                                })
                              }
                              className="min-w-48 flex-1"
                            />
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() =>
                          setBlock(i, {
                            marks: [...(block.marks ?? []), { type: 'strong', start: 0, end: 0 }],
                          })
                        }
                        className="p-0 h-auto"
                      >
                        Add text mark
                      </Button>
                    </div>
                  </>
                )}
                <div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => update('blocks', form.blocks.filter((_, n) => n !== i))}
                    className="p-0 h-auto"
                  >
                    Remove block
                  </Button>
                </div>
              </fieldset>
            ))}
          </div>
        </Card>

        {form.blocks.some((block) => block.marks?.length) && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Remove text marks</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {form.blocks.flatMap((block, blockIndex) =>
                (block.marks ?? []).map((_, markIndex) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    key={`${blockIndex}-${markIndex}`}
                    onClick={() =>
                      setBlock(blockIndex, {
                        marks: (block.marks ?? []).filter((__, index) => index !== markIndex),
                      })
                    }
                  >
                    Remove mark {blockIndex + 1}.{markIndex + 1}
                  </Button>
                ))
              )}
            </div>
          </Card>
        )}

        <Card id="blog-field-references" tabIndex={-1} className="p-6">
          <h2 className="text-xl font-semibold">References (optional)</h2>
          {form.references.map((ref, i) => (
            <div key={i} className="mt-3 grid gap-2 sm:grid-cols-2">
              <Input
                aria-label={`Reference label ${i + 1}`}
                value={ref.label}
                onChange={(e) =>
                  update(
                    'references',
                    form.references.map((r, n) => (n === i ? { ...r, label: e.target.value } : r))
                  )
                }
              />
              <Input
                aria-label={`Reference URL ${i + 1}`}
                value={ref.url}
                onChange={(e) =>
                  update(
                    'references',
                    form.references.map((r, n) => (n === i ? { ...r, url: e.target.value } : r))
                  )
                }
              />
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => update('references', form.references.filter((_, n) => n !== i))}
                className="p-0 h-auto sm:col-span-2 sm:w-fit"
              >
                Remove reference
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update('references', [...form.references, { label: '', url: '' }])}
            className="mt-3"
          >
            Add reference
          </Button>
        </Card>

        <Card className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="blog-field-seo-title">SEO title (optional)</Label>
              {locale === errorLocale && fields.seo_title && <p id="blog-error-seo-title" className="text-sm text-destructive">{fields.seo_title}</p>}
              <Input
                id="blog-field-seo-title"
                aria-invalid={locale === errorLocale && Boolean(fields.seo_title)}
                aria-describedby={locale === errorLocale && fields.seo_title ? "blog-error-seo-title" : undefined}
                value={form.seoTitle}
                maxLength={70}
                onChange={(e) => update('seoTitle', e.target.value)}
                className="mt-2 w-full"
              />
            </div>
            <div>
              <Label htmlFor="blog-field-seo-description">SEO description (optional)</Label>
              {locale === errorLocale && fields.seo_description && <p id="blog-error-seo-description" className="text-sm text-destructive">{fields.seo_description}</p>}
              <Textarea
                id="blog-field-seo-description"
                aria-invalid={locale === errorLocale && Boolean(fields.seo_description)}
                aria-describedby={locale === errorLocale && fields.seo_description ? "blog-error-seo-description" : undefined}
                value={form.seoDescription}
                maxLength={180}
                onChange={(e) => update('seoDescription', e.target.value)}
                className="mt-2 w-full"
              />
            </div>
          </div>
        </Card>
        </div>
        <div hidden={step !== 'Cover'}><Card className="p-6">            <div>
              <Label htmlFor="blog-field-cover-alt">
                <Req>Cover alt text</Req>
              </Label>
              {locale === errorLocale && fields.cover_alt && <p id="blog-error-cover-alt" className="text-sm text-destructive">{fields.cover_alt}</p>}
              <Input
                id="blog-field-cover-alt"
                aria-invalid={locale === errorLocale && Boolean(fields.cover_alt)}
                aria-describedby={locale === errorLocale && fields.cover_alt ? "blog-error-cover-alt" : undefined}
                aria-required="true"
                value={form.coverAlt}
                maxLength={300}
                onChange={(e) => update('coverAlt', e.target.value)}
                className="mt-2 w-full"
              />
            </div></Card></div>
      </form>
        </TabsContent>
      </Tabs>

      <Card className="p-6" hidden={step !== 'Cover'}>
        <h2 className="text-xl font-semibold">Cover upload for {locale.toUpperCase()}</h2>
        <p className="mt-2 text-sm text-slate-600">Upload the image separately, then save this edition to use the uploaded cover.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="blog-field-cover">Image</Label>
            <input
              id="blog-field-cover"
              key={locale}
              ref={fileRef}
              data-locale={locale}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => updateCover({ file: e.target.files?.[0] ?? null })}
              className="mt-2 block max-w-full text-sm"
            />
            {file && <p className="mt-1 text-sm">Selected: {file.name}</p>}
          </div>
          <div>
            <Label htmlFor="blog-field-rights">Rights/source record</Label>
            <Input
              id="blog-field-rights"
              value={rights}
              onChange={(e) => updateCover({ rights: e.target.value })}
              className="mt-2 w-full"
            />
          </div>
          <div>
            <Label htmlFor="blog-field-focal-x">Horizontal focal point ({Math.round(focalX * 100)}%)</Label>
            <input
              id="blog-field-focal-x"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={focalX}
              onChange={(e) => updateCover({ focalX: Number(e.target.value) })}
              className="mt-2 w-full cursor-pointer accent-primary"
            />
          </div>
          <div>
            <Label htmlFor="blog-field-focal-y">Vertical focal point ({Math.round(focalY * 100)}%)</Label>
            <input
              id="blog-field-focal-y"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={focalY}
              onChange={(e) => updateCover({ focalY: Number(e.target.value) })}
              className="mt-2 w-full cursor-pointer accent-primary"
            />
          </div>
        </div>
        <Button
          disabled={!fresh || Boolean(busy) || !file || !rights.trim()}
          onClick={() => void upload()}
          className="mt-4"
        >
          {busy === 'upload' ? `Uploading ${progress}%…` : 'Upload cover'}
        </Button>
      </Card>
    </div>
  );
}
