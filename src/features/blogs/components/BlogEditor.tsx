import { useAdminNavigation } from '../../../lib/admin-navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import type { BlogEditorProps, BlogRequiredProps, BlogBodyBlock, BlogDraftFormState as FormState, BlogDetail, BlogEdition, BlogLocale, BlogOptions, BlogSaveInput } from '../types/blogs.types';
import { useBlogDraft } from '../context/BlogDraftContext';
import { BlogBody, BlogPreview } from './BlogPreview';
import { BlogPublishPanel } from './BlogPublishPanel';
import { BlogGenerator } from './BlogGenerator';


const empty = (post: BlogDetail): FormState => ({ slug: post.slug, categoryID: post.category_id, title: '', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] });
function fromEdition(post: BlogDetail, edition?: BlogEdition): FormState { return edition ? { slug: post.slug, categoryID: post.category_id, title: edition.title, excerpt: edition.excerpt, author: edition.author_name, reviewer: edition.reviewer_attribution ?? '', coverMediaID: edition.cover_media_id, coverAlt: edition.cover_alt, seoTitle: edition.seo_title, seoDescription: edition.seo_description, blocks: edition.body.blocks, references: edition.references } : empty(post); }
const LOCALES = ['en', 'ar'] as const;
const LOCALE_NAME: Record<BlogLocale, string> = { en: 'English', ar: 'Arabic' };
function Req({ children }: BlogRequiredProps) { return <span className="after:ml-1 after:text-crimson after:content-['*']">{children}</span>; }
function failureMessage(error: unknown, onExpired: () => void) { if (error instanceof ApiError) { if (error.status === 409) return 'This draft changed elsewhere. Copy your work, or reload the latest revision and deliberately reapply it.'; if (error.status === 401) { onExpired(); return 'Your session expired. Your text remains in this tab; sign in again to retry or copy it.'; } return error.message; } return 'The request failed. Your entered values are still available.'; }

export function BlogEditor({ postID, role = 'staff', onExpired, onNavigate, onDeleted = onNavigate, registerBlocker }: BlogEditorProps) {
  const routerNavigation = useAdminNavigation();
  const { draft, saveForPost, clearForPost } = useBlogDraft(postID);
  const initialDraft = useRef(draft);
  const [post, setPost] = useState<BlogDetail | null>(null); const [options, setOptions] = useState<BlogOptions | null>(null);
  const [locale, setLocale] = useState<BlogLocale>('en'); const [forms, setForms] = useState<Record<BlogLocale, FormState> | null>(null); const [saved, setSaved] = useState<Record<BlogLocale, FormState> | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [fields, setFields] = useState<Record<string, string>>({}); const [busy, setBusy] = useState<null | 'save' | 'upload' | 'lifecycle' | 'refresh'>(null); const [attempt, setAttempt] = useState(0);
  const refreshVersion = useRef(0); const previewTrigger = useRef<HTMLButtonElement>(null); const wasPreview = useRef(false);
  const operationLock = useRef(false); const [fresh, setFresh] = useState(true); const [localPreview, setLocalPreview] = useState(false); const preview = routerNavigation ? routerNavigation.routeId === 'blog-preview' : localPreview;
  const [file, setFile] = useState<File | null>(null); const [rights, setRights] = useState(''); const [focalX, setFocalX] = useState(.5); const [focalY, setFocalY] = useState(.5); const [progress, setProgress] = useState(0); const fileRef = useRef<HTMLInputElement>(null);
  const dirty = useMemo(() => Boolean(forms && saved && JSON.stringify(forms) !== JSON.stringify(saved)) || Boolean(file), [forms, saved, file]);
  useEffect(() => { let active = true; const version = ++refreshVersion.current; setLoading(true); Promise.all([blogsApi.get(postID), blogsApi.options()]).then(([detail, opts]) => { if (!active || version !== refreshVersion.current) return; const p = detail.data; const value = { en: fromEdition(p, p.en), ar: fromEdition(p, p.ar) }; setPost(p); const stored = initialDraft.current; setForms(stored?.forms ?? value); setSaved(stored?.saved ?? structuredClone(value)); if (stored) { setLocale(stored.locale); setFile(stored.file); setRights(stored.rights); setFocalX(stored.focalX); setFocalY(stored.focalY); } setOptions(opts.data); setFresh(true); setError(''); setLoading(false); }).catch((failure) => { if (!active) return; setError(failureMessage(failure, onExpired)); setLoading(false); }); return () => { active = false; ++refreshVersion.current; }; }, [postID, attempt]);
  useEffect(() => { if (forms && saved) saveForPost(postID, { forms, saved, locale, file, rights, focalX, focalY, dirty }); }, [postID, forms, saved, locale, file, rights, focalX, focalY, dirty, saveForPost]);
  useEffect(() => { if (!preview && wasPreview.current) previewTrigger.current?.focus(); wasPreview.current = preview; }, [preview]);
  useEffect(() => { const block = () => { const allowed = !dirty || window.confirm('You have unsaved blog changes. Leave and discard them?'); if (allowed) clearForPost(postID); return allowed; }; registerBlocker(block); const unload = (event: BeforeUnloadEvent) => { if (!dirty) return; event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', unload); return () => { registerBlocker(null); window.removeEventListener('beforeunload', unload); }; }, [dirty, registerBlocker]);
  if (loading) return <p role="status" className="mt-8">Loading blog editor…</p>;
  if (!post || !forms || !saved || !options) return <div className="mt-8"><p role="alert">{error || 'Article data is unavailable.'}</p><button onClick={() => setAttempt((v) => v + 1)} className="mt-3 rounded-md border px-4 py-2">Retry</button></div>;
  const currentPost = post;
  const form = forms[locale];
  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForms((all) => {
    if (!all) return all;
    if (key === 'slug' || key === 'categoryID') return { en: { ...all.en, [key]: value }, ar: { ...all.ar, [key]: value } };
    return { ...all, [locale]: { ...all[locale], [key]: value } };
  }); setNotice(''); }
  function setBlock(index: number, patch: Partial<BlogBodyBlock>) { const clean = patch.marks ? { ...patch, marks: patch.marks.map((mark) => mark.type === 'link' ? mark : { type: mark.type, start: mark.start, end: mark.end }) } : patch; update('blocks', form.blocks.map((block, i) => i === index ? { ...block, ...clean } : block)); }
  function addBlock(type: BlogBodyBlock['type']) { const block: BlogBodyBlock = type === 'heading' ? { type, level: 2, text: '' } : type === 'list' ? { type, style: 'unordered', items: [''] } : { type, text: '' }; update('blocks', [...form.blocks, block]); }
  function changePreview(open: boolean) {
    const target = `/admin/blogs/${encodeURIComponent(postID)}${open ? '/preview' : '/edit'}${routerNavigation?.search ?? ''}`;
    if (routerNavigation) routerNavigation.navigate(target); else setLocalPreview(open);
  }
  async function retrySavedDetails() {
    if (operationLock.current) return; operationLock.current = true; setBusy('refresh'); setError('');
    try { await refresh(); } catch (failure) { setError(failureMessage(failure, onExpired)); } finally { operationLock.current = false; setBusy(null); }
  }
  async function refresh(expectedRevision?: number, baseline = saved) {
    const version = ++refreshVersion.current;
    try {
      const { data } = await blogsApi.get(currentPost.id);
      if (version !== refreshVersion.current) return;
      if (expectedRevision !== undefined && data.aggregate_revision !== expectedRevision) throw new ApiError(409, 'BLOG_CONFLICT', 'Saved detail changed during refresh.');
      const nextSaved = { en: fromEdition(data, data.en), ar: fromEdition(data, data.ar) };
      // Rebase untouched fields only; typing during an in-flight request stays local.
      setForms((all) => {
        if (!all || !baseline) return all;
        const next = structuredClone(all);
        for (const lang of ['en', 'ar'] as const) for (const key of Object.keys(next[lang]) as (keyof FormState)[]) {
          if (JSON.stringify(all[lang][key]) === JSON.stringify(baseline[lang][key])) Object.assign(next[lang], { [key]: nextSaved[lang][key] });
        }
        return next;
      });
      setSaved(nextSaved);
      setPost(data); setFresh(true);
    } catch (failure) { if (version !== refreshVersion.current) return; setFresh(false); throw failure; }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (operationLock.current || !fresh) return;
    const changed = LOCALES.filter((lang) => JSON.stringify(forms![lang]) !== JSON.stringify(saved![lang]));
    if (!changed.length) { setNotice('Nothing to save.'); return; }
    const voided = changed.map((lang) => ({ lang, kinds: currentPost.readiness?.[lang]?.completed_reviews ?? [] })).filter((item) => item.kinds.length > 0);
    if (voided.length && !window.confirm(`Saving voids: ${voided.map((item) => `${item.kinds.map((kind) => kind.replace('_', ' ')).join(', ')} (${LOCALE_NAME[item.lang]})`).join('; ')}. You will need to attest again. Save anyway?`)) return;
    operationLock.current = true; setBusy('save'); setError(''); setFields({}); setNotice('');
    let revision = currentPost.aggregate_revision; let baseline = saved!; const done: BlogLocale[] = [];
    try {
      for (const lang of changed) {
        const f = forms![lang]; const other = lang === 'en' ? 'ar' : 'en';
        const input: BlogSaveInput = { expected_revision: revision, lang, slug: f.slug, category_id: f.categoryID, title: f.title, excerpt: f.excerpt, body: { schema_version: 1, blocks: f.blocks }, cover_media_id: f.coverMediaID, cover_alt: f.coverAlt, author_name: f.author, reviewer_attribution: f.reviewer || null, seo_title: f.seoTitle, seo_description: f.seoDescription, references: f.references };
        try {
          const result = await blogsApi.save(currentPost.id, input);
          revision = result.data.aggregate_revision;
          baseline = { ...baseline, [lang]: structuredClone(f), [other]: { ...baseline[other], slug: f.slug, categoryID: f.categoryID } } as typeof baseline;
          done.push(lang);
        } catch (failure) {
          setError(`${LOCALE_NAME[lang]} was not saved${done.length ? ` (${done.map((l) => LOCALE_NAME[l]).join(', ')} saved)` : ''}. ${failureMessage(failure, onExpired)}`);
          if (failure instanceof ApiError) setFields(failure.fields ?? {});
          break;
        }
      }
      if (done.length) {
        setSaved(baseline);
        setNotice(`${done.map((l) => LOCALE_NAME[l]).join(' and ')} saved.`);
        await refresh(revision, baseline);
      }
    } catch (failure) { setError(failureMessage(failure, onExpired)); } finally { operationLock.current = false; setBusy(null); }
  }
  function jumpToField(lang: BlogLocale, field: string) {
    setLocale(lang);
    // Wait for the locale switch to render before focusing.
    window.setTimeout(() => { const target = document.getElementById(`blog-field-${field}`); target?.scrollIntoView?.({ block: 'center' }); target?.focus(); }, 0);
  }
  async function upload() { if (!file || operationLock.current || !fresh || !rights.trim()) return; operationLock.current = true; setBusy('upload'); setError(''); setProgress(0); try { const result = await blogsApi.upload(currentPost.id, file, currentPost.aggregate_revision, rights, focalX, focalY, setProgress); setPost((p) => p && ({ ...p, aggregate_revision: result.data.aggregate_revision })); setForms((all) => all && ({ ...all, [locale]: { ...all[locale], coverMediaID: result.data.media_id } })); setFile(null); if (fileRef.current) fileRef.current.value = ''; setNotice('Cover uploaded. Save this locale draft to use it; other unsaved fields remain unsaved.'); await refresh(result.data.aggregate_revision); } catch (failure) { setError(failureMessage(failure, onExpired)); } finally { operationLock.current = false; setBusy(null); } }
  const badge = (lang: BlogLocale) => { const missing = currentPost.readiness?.[lang]?.missing_fields; if (!missing) return ''; if (missing.includes('saved_revision')) return 'Not started'; return missing.length ? `${missing.length} missing` : 'Complete'; };
  return <div className="mt-8 space-y-6"><header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><h1 className="text-lg font-semibold">{forms.en.title || forms.ar.title || post.slug}</h1><p className="text-sm text-slate-600">{post.status.replaceAll('_', ' ')} · Revision {post.aggregate_revision}</p></div><div className="flex flex-wrap items-center gap-3">{dirty ? <p role="status" className="text-amber-900">Unsaved changes</p> : <p role="status" className="text-slate-600">All changes saved</p>}<button ref={previewTrigger} type="button" disabled={!fresh || Boolean(busy)} onClick={() => changePreview(true)} className="min-h-12 rounded border px-4">Preview saved revision</button><button type="submit" form="blog-editor-form" disabled={!fresh || Boolean(busy)} className="min-h-12 rounded-md bg-crimson px-5 font-semibold text-white">{busy === 'save' ? 'Saving…' : 'Save'}</button><button onClick={onNavigate} className="min-h-12 rounded-md border border-slate-300 px-4">Back to Blogs</button></div></header>
    {!fresh && <div role="alert"><p>Saved details need refreshing. Local EN/AR text is preserved. Compare the saved preview before saving again.</p><button disabled={Boolean(busy)} onClick={() => void retrySavedDetails()} className="min-h-12 underline">Retry saved details</button></div>}
    {preview && fresh && <><BlogPreview postID={post.id} locale={locale} revision={post[locale]?.edition_revision} dirty={dirty} onClose={() => changePreview(false)} />{dirty && <section aria-label="Unsaved article preview" className="rounded-xl border bg-white p-4"><p>Unsaved {locale.toUpperCase()} draft · Non-public</p><article lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}><h2>{form.title}</h2><p>{form.excerpt}</p><p>{form.author}</p><BlogBody body={{ schema_version: 1, blocks: form.blocks }} /></article></section>}</>}
    {role === 'admin' && fresh && <BlogPublishPanel post={post} locked={Boolean(busy)} lock={operationLock} onBusy={(value) => setBusy(value ? 'lifecycle' : null)} onRefresh={refresh} onDeleted={onDeleted} onJump={jumpToField} />}
    {!options.generation_enabled ? (
      <section aria-label="AI drafting" className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">AI drafting</h2>
        <p className="mt-2 text-slate-600">AI drafting is unavailable. You can continue writing and saving this article manually.</p>
      </section>
    ) : (
      <BlogGenerator
        postID={post.id}
        locale={locale}
        baseRevision={post.aggregate_revision}
        dirty={dirty}
        currentDraft={{
          title: form.title,
          excerpt: form.excerpt,
          seoTitle: form.seoTitle,
          seoDescription: form.seoDescription,
        }}
        onRefresh={refresh}
        onApplied={(msg) => setNotice(msg)}
      />
    )}
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Article language">{LOCALES.map((lang) => <span key={lang} className="flex items-center gap-2"><button role="tab" aria-selected={locale === lang} aria-describedby={`badge-${lang}`} onClick={() => setLocale(lang)} className="min-h-12 rounded-md border px-4 py-2">{lang === 'en' ? 'English' : 'العربية'}</button><span id={`badge-${lang}`} className={`rounded-full px-2 py-1 text-xs ${badge(lang) === 'Complete' ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900'}`}>{badge(lang)}</span></span>)}</div>
    {notice && <p role="status" className="rounded-md bg-green-50 p-4 text-green-900">{notice}</p>}{error && <div role="alert" className="rounded-md bg-red-50 p-4 text-red-900"><p>{error}</p>{Object.entries(fields).map(([k,v]) => <p key={k}>{k}: {v}</p>)}{error.includes('This draft changed') && <button onClick={() => { if (window.confirm('Reload the latest revision and discard your local edits?')) setAttempt((v) => v + 1); }} className="mt-3 rounded-md border px-3 py-2">Reload latest (discard local)</button>}{error.includes('Your session expired') && <a href="/admin/login" target="_blank" rel="noreferrer" className="mt-3 inline-block underline">Sign in in another tab, then retry</a>}</div>}
    <form id="blog-editor-form" onSubmit={save} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-6"><section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2"><label><Req>Title</Req><input id="blog-field-title" aria-required="true" value={form.title} maxLength={180} onChange={(e) => update('title', e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2" /></label><label>Slug<input disabled={Boolean(post.first_published_at)} value={form.slug} onChange={(e) => update('slug', e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2 disabled:bg-slate-100" /></label><label>Category<select value={form.categoryID} onChange={(e) => update('categoryID', e.target.value)} className="mt-2 w-full rounded-md border bg-white px-3 py-2">{options.categories.map((c) => <option key={c.id} value={c.id}>{locale === 'ar' ? c.name_ar : c.name_en}</option>)}</select></label><label><Req>Public author</Req><input id="blog-field-author" aria-required="true" value={form.author} maxLength={120} onChange={(e) => update('author', e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2" /></label><label className="sm:col-span-2"><Req>Excerpt</Req><textarea id="blog-field-excerpt" aria-required="true" value={form.excerpt} maxLength={360} onChange={(e) => update('excerpt', e.target.value)} rows={3} className="mt-2 w-full rounded-md border px-3 py-2" /></label><label>Reviewer attribution (optional)<input value={form.reviewer} onChange={(e) => update('reviewer', e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2" /></label><label><Req>Cover alt text</Req><input id="blog-field-cover-alt" aria-required="true" value={form.coverAlt} maxLength={300} onChange={(e) => update('coverAlt', e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2" /></label></section>
    <section id="blog-field-body" tabIndex={-1} className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Structured body</h2><div className="mt-3 flex flex-wrap gap-2" dir="ltr">{(['paragraph','heading','list','blockquote'] as const).map((type) => <button type="button" key={type} onClick={() => addBlock(type)} className="rounded-md border px-3 py-2">Add {type}</button>)}</div><div className="mt-4 space-y-4">{form.blocks.map((block, i) => <fieldset key={i} className="rounded-md border p-4"><legend>{block.type} {i+1}</legend>{block.type === 'heading' && <select aria-label={`Heading level ${i+1}`} value={block.level} onChange={(e) => setBlock(i,{ level: Number(e.target.value) as 2|3 })}><option value="2">H2</option><option value="3">H3</option></select>}{block.type === 'list' ? <><select aria-label={`List style ${i+1}`} value={block.style} onChange={(e) => setBlock(i,{style:e.target.value as 'ordered'|'unordered'})}><option value="unordered">Bullets</option><option value="ordered">Numbered</option></select><textarea aria-label={`List items ${i+1}`} value={(block.items ?? []).join('\n')} onChange={(e) => setBlock(i,{items:e.target.value.split('\n')})} className="mt-2 w-full rounded-md border px-3 py-2" /></> : <><textarea aria-label={`Block text ${i+1}`} value={block.text ?? ''} onChange={(e) => setBlock(i,{text:e.target.value})} className="mt-2 w-full rounded-md border px-3 py-2" /><div className="mt-2 space-y-2" dir="ltr">{(block.marks ?? []).map((mark,m)=><div key={m} className="flex flex-wrap gap-2"><select aria-label={`Mark type ${i+1}-${m+1}`} value={mark.type} onChange={(e)=>setBlock(i,{marks:(block.marks??[]).map((x,n)=>n===m?{...x,type:e.target.value as typeof x.type}:x)})}><option value="strong">Strong</option><option value="em">Emphasis</option><option value="link">Link</option></select><input aria-label={`Mark start ${i+1}-${m+1}`} type="number" min="0" value={mark.start} onChange={(e)=>setBlock(i,{marks:(block.marks??[]).map((x,n)=>n===m?{...x,start:Number(e.target.value)}:x)})} className="w-20 rounded border px-2"/><input aria-label={`Mark end ${i+1}-${m+1}`} type="number" min="0" value={mark.end} onChange={(e)=>setBlock(i,{marks:(block.marks??[]).map((x,n)=>n===m?{...x,end:Number(e.target.value)}:x)})} className="w-20 rounded border px-2"/>{mark.type==='link'&&<input aria-label={`Mark URL ${i+1}-${m+1}`} value={mark.href??''} onChange={(e)=>setBlock(i,{marks:(block.marks??[]).map((x,n)=>n===m?{...x,href:e.target.value}:x)})} className="min-w-48 flex-1 rounded border px-2"/>}</div>)}<button type="button" onClick={()=>setBlock(i,{marks:[...(block.marks??[]),{type:'strong',start:0,end:0}]})} className="text-sm underline">Add text mark</button></div></>}<button type="button" onClick={() => update('blocks', form.blocks.filter((_,n)=>n!==i))} className="mt-2 text-sm underline">Remove block</button></fieldset>)}</div></section>
    {form.blocks.some((block) => block.marks?.length) && <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold">Remove text marks</h2><div className="mt-3 flex flex-wrap gap-2">{form.blocks.flatMap((block, blockIndex) => (block.marks ?? []).map((_, markIndex) => <button type="button" key={`${blockIndex}-${markIndex}`} onClick={() => setBlock(blockIndex, { marks: (block.marks ?? []).filter((__, index) => index !== markIndex) })} className="rounded-md border px-3 py-2">Remove mark {blockIndex + 1}.{markIndex + 1}</button>))}</div></section>}
    <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">References</h2>{form.references.map((ref,i)=><div key={i} className="mt-3 grid gap-2 sm:grid-cols-2"><input aria-label={`Reference label ${i+1}`} value={ref.label} onChange={(e)=>update('references',form.references.map((r,n)=>n===i?{...r,label:e.target.value}:r))} className="rounded-md border px-3 py-2"/><input aria-label={`Reference URL ${i+1}`} value={ref.url} onChange={(e)=>update('references',form.references.map((r,n)=>n===i?{...r,url:e.target.value}:r))} className="rounded-md border px-3 py-2"/><button type="button" onClick={()=>update('references',form.references.filter((_,n)=>n!==i))} className="text-sm underline sm:col-span-2 sm:w-fit">Remove reference</button></div>)}<button type="button" onClick={()=>update('references',[...form.references,{label:'',url:''}])} className="mt-3 rounded-md border px-3 py-2">Add reference</button></section>
    <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2"><label>SEO title<input value={form.seoTitle} maxLength={70} onChange={(e)=>update('seoTitle',e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2"/></label><label>SEO description<textarea value={form.seoDescription} maxLength={180} onChange={(e)=>update('seoDescription',e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2"/></label></section></form>
    <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">Cover upload for {locale.toUpperCase()}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label>Image<input id="blog-field-cover" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>setFile(e.target.files?.[0]??null)} className="mt-2 block max-w-full"/></label><label>Rights/source record<input value={rights} onChange={(e)=>setRights(e.target.value)} className="mt-2 w-full rounded-md border px-3 py-2"/></label><label>Horizontal focal point<input type="range" min="0" max="1" step="0.01" value={focalX} onChange={(e)=>setFocalX(Number(e.target.value))}/></label><label>Vertical focal point<input type="range" min="0" max="1" step="0.01" value={focalY} onChange={(e)=>setFocalY(Number(e.target.value))}/></label></div><button disabled={!fresh||Boolean(busy)||!file||!rights.trim()} onClick={()=>void upload()} className="mt-4 rounded-md border px-4 py-2">{busy === 'upload' ? `Uploading ${progress}%…` : 'Upload cover'}</button></section>
  </div>;
}
