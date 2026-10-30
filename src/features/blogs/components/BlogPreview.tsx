import { useEffect, useRef, useState, type ReactNode } from 'react';
import { blogsApi } from '../services/blogs.service';
import type { BlogBody, BlogBodyMark, BlogLocale, BlogPreviewDetail } from '../types/blogs.types';

export function safeBlogHref(value: string): boolean {
  if (!value || /[\\\s\u0000-\u001f\u007f]/u.test(value)) return false;
  try { decodeURI(value); } catch { return false; }
  if (value.startsWith('/')) return !value.startsWith('//');
  try { const url = new URL(value); return value.startsWith('https://') && url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
}

function markedText(text: string, marks: BlogBodyMark[] = []): ReactNode {
  const points = Array.from(text);
  const valid = marks.filter((m) => Number.isInteger(m.start) && Number.isInteger(m.end) && m.start >= 0 && m.end > m.start && m.end <= points.length);
  const boundaries = [...new Set([0, points.length, ...valid.flatMap((m) => [m.start, m.end])])].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, i) => {
    const end = boundaries[i + 1]; const active = valid.filter((m) => m.start <= start && m.end >= end);
    let node: ReactNode = points.slice(start, end).join('');
    if (active.some((m) => m.type === 'strong')) node = <strong>{node}</strong>;
    if (active.some((m) => m.type === 'em')) node = <em>{node}</em>;
    const link = active.find((m) => m.type === 'link' && m.href && safeBlogHref(m.href));
    return <span key={start}>{link ? <a href={link.href} target="_blank" rel="noreferrer noopener" className="underline">{node}</a> : node}</span>;
  });
}

// This renderer and the later public renderer consume fixtures/blog-body-conformance.json.
export function BlogBody({ body }: { body: BlogBody }) {
  if (body.schema_version !== 1) return <p role="alert">Unsupported article body.</p>;
  const anchors = new Set<string>();
  return <div className="space-y-4 break-words leading-relaxed">{body.blocks.map((block, i) => {
    const text = markedText(block.text ?? '', block.marks);
    switch (block.type) {
      case 'heading': {
        const base = (block.text ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `heading-${i + 1}`;
        let anchor = base; let suffix = 2; while (anchors.has(anchor)) anchor = `${base}-${suffix++}`; anchors.add(anchor);
        return block.level === 3 ? <h3 key={i} id={anchor} className="scroll-mt-20 text-xl font-semibold">{text}</h3> : <h2 key={i} id={anchor} className="scroll-mt-20 text-2xl font-semibold">{text}</h2>;
      }
      case 'paragraph': return <p key={i}>{text}</p>;
      case 'blockquote': return <blockquote key={i} className="border-s-4 ps-4">{text}</blockquote>;
      case 'list': return block.style === 'ordered' ? <ol key={i} className="list-decimal ps-6">{block.items?.map((item, n) => <li key={n}>{item}</li>)}</ol> : <ul key={i} className="list-disc ps-6">{block.items?.map((item, n) => <li key={n}>{item}</li>)}</ul>;
      default: return null;
    }
  })}</div>;
}

export function BlogPreview({ postID, locale, revision, dirty, onClose }: { postID: string; locale: BlogLocale; revision?: number; dirty: boolean; onClose: () => void }) {
  const region = useRef<HTMLElement>(null);
  useEffect(() => { region.current?.focus(); }, []);
  const [article, setArticle] = useState<BlogPreviewDetail | null>(null); const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0); const [mobile, setMobile] = useState(false);
  useEffect(() => {
    let active = true; setArticle(null); setError('');
    if (!revision) { setError('No saved revision exists for this edition. Save it before previewing.'); return; }
    blogsApi.preview(postID, locale, revision).then(({ data }) => { if (active) setArticle(data); }).catch(() => { if (active) setError('Saved preview could not be loaded. Your editor text remains available. Sign in again if your session expired, then retry.'); });
    return () => { active = false; };
  }, [postID, locale, revision, attempt]);
  return <section ref={region} tabIndex={-1} aria-label="Saved article preview" className="space-y-4 rounded-xl border bg-white p-4">
    <div className="flex flex-wrap gap-3"><p>Private preview · {locale.toUpperCase()} · Saved revision {revision ?? 'unavailable'} · Non-public</p><button onClick={onClose} className="min-h-12 rounded border px-3">Return to editor</button><button aria-pressed={!mobile} onClick={() => setMobile(false)} className="min-h-12 rounded border px-3">Desktop width</button><button aria-pressed={mobile} onClick={() => setMobile(true)} className="min-h-12 rounded border px-3">Mobile width</button></div>
    {dirty && <p role="status">Preview shows saved revision {revision ?? 'unavailable'}; unsaved edits are not included.</p>}
    {error ? <div role="alert"><p>{error}</p><button onClick={() => setAttempt((v) => v + 1)} className="min-h-12 underline">Retry preview</button></div> : !article ? <p role="status">Loading saved preview…</p> : <article lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} data-preview-width={mobile ? 'mobile' : 'desktop'} className={`mx-auto w-full space-y-5 break-words ${mobile ? 'max-w-[375px]' : 'max-w-4xl'}`}>
      <p>{article.category.label}</p><h2 className="text-3xl font-semibold">{article.title}</h2><p>{article.excerpt}</p><p>{article.author_name}{article.reviewer_attribution && ` · ${article.reviewer_attribution}`} · {article.reading_time_minutes} min</p>
      {article.first_published_at && <p>First published: {new Date(article.first_published_at).toLocaleDateString(locale)}{article.last_published_at !== article.first_published_at && article.last_published_at && ` · Updated: ${new Date(article.last_published_at).toLocaleDateString(locale)}`}</p>}
      {article.cover && <img src={article.cover.url} alt={article.cover.alt} width={article.cover.width} height={article.cover.height} referrerPolicy="no-referrer" className="h-auto w-full" />}
      <BlogBody body={article.body} />{article.references.length > 0 && <section><h3>References</h3><ul>{article.references.map((ref, i) => <li key={i}>{safeBlogHref(ref.url) ? <a href={ref.url} target="_blank" rel="noreferrer noopener" className="break-all underline">{ref.label}</a> : ref.label}</li>)}</ul></section>}
    </article>}
  </section>;
}
