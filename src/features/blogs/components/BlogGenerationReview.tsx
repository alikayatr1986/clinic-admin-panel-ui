import type { BlogGenerationReviewProps } from '../types/blogs.types';
import type { BlogGenerationJob, BlogLocale } from '../types/blogs.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';



export function BlogGenerationReview({
  job,
  selected,
  onSelectedChange,
  currentDraft,
  locale,
  dirty,
  applying,
  discarding,
  onApply,
  onDiscard,
}: BlogGenerationReviewProps) {
  const result = job.result;


  if (!result) return null;

  function toggle(field: string) {
    onSelectedChange({ ...selected, [field]: !selected[field] });
  }

  const selectedFields = Object.keys(selected).filter((k) => selected[k]);

  return (
    <Card aria-label="Generated result review" className="mt-4 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Generated result (review needed)</h3>
          {job.provider && (
            <p className="text-xs text-slate-500">
              Provider: {job.provider} {job.model ? `· Model: ${job.model}` : ''}
            </p>
          )}
        </div>
        <Badge variant="outline">
          Unapproved draft
        </Badge>
      </div>

      {locale === 'ar' && (
        <div role="note" className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
          Generated Arabic content requires certified medical and translation review before publication.
        </div>
      )}

      {dirty && (
        <div role="alert" className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
          Save or discard your unsaved manual edits before applying generated fields.
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div className="rounded-lg border border-slate-100 p-4 bg-slate-50">
          <Checkbox
            label={<>Title</>}
            checked={Boolean(selected.title)}
            onChange={() => toggle('title')}
            aria-label="Select title"
          />
          <div className="mt-2 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Current</p>
              <p className="mt-1 text-slate-700">{currentDraft.title || '<empty>'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Generated</p>
              <p className="mt-1 font-medium text-slate-900">{result.title}</p>
            </div>
          </div>
        </div>

        {/* Excerpt */}
        <div className="rounded-lg border border-slate-100 p-4 bg-slate-50">
          <Checkbox
            label={<>Excerpt</>}
            checked={Boolean(selected.excerpt)}
            onChange={() => toggle('excerpt')}
            aria-label="Select excerpt"
          />
          <div className="mt-2 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Current</p>
              <p className="mt-1 text-slate-700">{currentDraft.excerpt || '<empty>'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Generated</p>
              <p className="mt-1 font-medium text-slate-900">{result.excerpt}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="rounded-lg border border-slate-100 p-4 bg-slate-50">
          <Checkbox
            label={<>Body ({result.body.blocks.length} blocks generated)</>}
            checked={Boolean(selected.body)}
            onChange={() => toggle('body')}
            aria-label="Select body"
          />
          <div className="mt-2 text-sm">
            <div className="max-h-48 overflow-y-auto rounded border border-slate-200 bg-white p-3 space-y-2">
              {result.body.blocks.map((b, i) => (
                <div key={i} className="text-xs text-slate-700">
                  <span className="font-semibold uppercase text-slate-500 mr-2">[{b.type}]</span>
                  {b.text ?? (b.items ? b.items.join(', ') : '')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEO Title */}
        <div className="rounded-lg border border-slate-100 p-4 bg-slate-50">
          <Checkbox
            label={<>SEO Title</>}
            checked={Boolean(selected.seo_title)}
            onChange={() => toggle('seo_title')}
            aria-label="Select SEO title"
          />
          <div className="mt-2 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Current</p>
              <p className="mt-1 text-slate-700">{currentDraft.seoTitle || '<empty>'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Generated</p>
              <p className="mt-1 font-medium text-slate-900">{result.seo_title || '<empty>'}</p>
            </div>
          </div>
        </div>

        {/* SEO Description */}
        <div className="rounded-lg border border-slate-100 p-4 bg-slate-50">
          <Checkbox
            label={<>SEO Description</>}
            checked={Boolean(selected.seo_description)}
            onChange={() => toggle('seo_description')}
            aria-label="Select SEO description"
          />
          <div className="mt-2 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Current</p>
              <p className="mt-1 text-slate-700">{currentDraft.seoDescription || '<empty>'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Generated</p>
              <p className="mt-1 font-medium text-slate-900">{result.seo_description || '<empty>'}</p>
            </div>
          </div>
        </div>

        {/* Cited Sources */}
        {result.source_ids.length > 0 && (
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Cited sources: </span>
            {result.source_ids.join(', ')}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="button"
          disabled={dirty || selectedFields.length === 0 || applying || discarding}
          onClick={() => void onApply(selectedFields)}
        >
          {applying ? 'Applying selected…' : 'Apply selected'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={applying || discarding}
          onClick={() => void onDiscard()}
        >
          {discarding ? 'Discarding…' : 'Discard result'}
        </Button>
      </div>
    </Card>
  );
}

