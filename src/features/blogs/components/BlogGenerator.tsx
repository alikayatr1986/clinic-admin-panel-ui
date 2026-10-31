import type { BlogGeneratorProps } from '../types/blogs.types';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import type { BlogGenerationBrief, BlogGenerationJob, BlogGenerationSource, BlogLocale } from '../types/blogs.types';
import { BlogGenerationReview } from './BlogGenerationReview';



const storageKey = (postID: string, locale: string) => `blog_gen_job_${postID}_${locale}`;

export function BlogGenerator({
  postID,
  locale,
  baseRevision,
  dirty,
  currentDraft,
  onRefresh,
  onApplied,
}: BlogGeneratorProps) {
  // Brief inputs
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [instructions, setInstructions] = useState('');
  const [targetLength, setTargetLength] = useState<number | undefined>(undefined);
  const [clinicFacts, setClinicFacts] = useState('');
  const [sources, setSources] = useState<BlogGenerationSource[]>([]);
  const [confirmedNoPatientData, setConfirmedNoPatientData] = useState(false);

  // Job & UI state
  const [job, setJob] = useState<BlogGenerationJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [applying, setApplying] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  const pollCount = useRef(0);
  const maxPolls = 48; // ~120s with 2.5s interval

  // Reopen persisted job from localStorage on mount or locale change
  useEffect(() => {
    setError('');
    setFieldErrors({});
    const savedJobID = localStorage.getItem(storageKey(postID, locale));
    if (!savedJobID) {
      setJob(null);
      return;
    }

    let active = true;
    blogsApi
      .getGeneration(postID, savedJobID)
      .then((res) => {
        if (!active) return;
        const j = res.data;
        if (j.status === 'applied' || j.status === 'discarded') {
          localStorage.removeItem(storageKey(postID, locale));
          setJob(null);
        } else {
          setJob(j);
        }
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem(storageKey(postID, locale));
        setJob(null);
      });

    return () => {
      active = false;
    };
  }, [postID, locale]);

  // Bounded polling while queued or running
  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'running')) return;

    pollCount.current = 0;
    const interval = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > maxPolls) {
        clearInterval(interval);
        setError('Generation timed out polling. Please check job status or retry.');
        return;
      }
      try {
        const res = await blogsApi.getGeneration(postID, job.id);
        const updated = res.data;
        setJob(updated);
        if (updated.status !== 'queued' && updated.status !== 'running') {
          clearInterval(interval);
          if (updated.status === 'applied' || updated.status === 'discarded') {
            localStorage.removeItem(storageKey(postID, locale));
          }
        }
      } catch (err) {
        clearInterval(interval);
        if (err instanceof ApiError && err.status === 401) {
          setError('Session expired while checking generation progress. Please sign in again.');
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [postID, locale, job?.id, job?.status]);

  function addSource() {
    if (sources.length >= 10) return;
    setSources((prev) => [
      ...prev,
      { source_id: `src-${prev.length + 1}`, text: '', citation_label: '', citation_url: '' },
    ]);
  }

  function updateSource(index: number, patch: Partial<BlogGenerationSource>) {
    setSources((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSource(index: number) {
    setSources((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setNotice('');

    // Client-side length & URL checks
    const errors: Record<string, string> = {};
    if (!topic.trim()) errors.topic = 'Topic is required.';
    else if (topic.length > 300) errors.topic = 'Topic must be ≤ 300 characters.';

    if (audience && audience.length > 500) errors.audience = 'Audience must be ≤ 500 characters.';
    if (!instructions.trim()) errors.instructions = 'Instructions are required.';
    else if (instructions.length > 2000) errors.instructions = 'Instructions must be ≤ 2,000 characters.';

    if (targetLength && (targetLength < 400 || targetLength > 1500)) {
      errors.target_length = 'Target length must be between 400 and 1,500 words.';
    }
    if (clinicFacts && clinicFacts.length > 20000) {
      errors.clinic_facts = 'Clinic facts must be ≤ 20,000 characters.';
    }

    let sourceChars = 0;
    sources.forEach((s, i) => {
      sourceChars += s.text.length;
      if (!s.source_id.trim()) errors[`source_${i}_id`] = 'Source ID is required.';
      if (!s.text.trim()) errors[`source_${i}_text`] = 'Source excerpt text is required.';
      if (!s.citation_label.trim()) errors[`source_${i}_label`] = 'Citation label is required.';
      if (s.citation_url && !s.citation_url.startsWith('https://')) {
        errors[`source_${i}_url`] = 'Citation URL must use HTTPS.';
      }
    });
    if (sourceChars > 20000) {
      errors.sources = 'Total source excerpts must be ≤ 20,000 characters.';
    }

    if (!confirmedNoPatientData) {
      errors.confirmation = 'You must confirm that no patient data is included.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const brief: BlogGenerationBrief = {
      topic: topic.trim(),
      instructions: instructions.trim(),
      source_excerpts: sources.map((s) => ({
        source_id: s.source_id.trim(),
        text: s.text.trim(),
        citation_label: s.citation_label.trim(),
        ...(s.citation_url?.trim() ? { citation_url: s.citation_url.trim() } : {}),
      })),
      ...(audience.trim() ? { audience: audience.trim() } : {}),
      ...(targetLength ? { target_length: targetLength } : {}),
      ...(clinicFacts.trim() ? { clinic_facts: clinicFacts.trim() } : {}),
    };

    setStarting(true);
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await blogsApi.queueGeneration(postID, {
        lang: locale,
        idempotency_key: idempotencyKey,
        base_revision: baseRevision,
        brief,
      });
      const createdJob = res.data;
      setJob(createdJob);
      localStorage.setItem(storageKey(postID, locale), createdJob.id);
      setNotice(`Generation job queued for ${locale.toUpperCase()}.`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'BLOG_BUDGET_EXHAUSTED' || err.status === 422) {
          setError(err.message || 'Daily AI generation budget reached. Try again tomorrow or edit manually.');
        } else if (err.status === 409) {
          setError('A generation job is already active for this post/locale, or aggregate limit reached.');
        } else {
          setError(err.message);
        }
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setError('Failed to start generation. Manual text is preserved.');
      }
    } finally {
      setStarting(false);
    }
  }

  async function handleCancel() {
    if (!job || canceling) return;
    setCanceling(true);
    setError('');
    try {
      await blogsApi.cancelGeneration(postID, job.id);
      setJob((prev) => (prev ? { ...prev, status: 'canceled' } : null));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to cancel generation job.');
    } finally {
      setCanceling(false);
    }
  }

  async function handleDiscard() {
    if (!job || discarding) return;
    setDiscarding(true);
    setError('');
    try {
      await blogsApi.discardGeneration(postID, job.id);
      localStorage.removeItem(storageKey(postID, locale));
      setJob(null);
      setNotice('Generation result discarded.');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to discard generation result.');
    } finally {
      setDiscarding(false);
    }
  }

  async function handleApply(selectedFields: string[]) {
    if (!job || applying) return;
    setApplying(true);
    setError('');
    try {
      await blogsApi.applyGeneration(postID, job.id, selectedFields);
      localStorage.removeItem(storageKey(postID, locale));
      setJob(null);
      await onRefresh();
      onApplied?.(`Applied generated ${selectedFields.join(', ')} as assisted draft.`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Draft changed on server. Please refresh latest revision and retry.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to apply generated draft. Your current draft text is untouched.');
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <section aria-label="AI drafting" className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">AI drafting for {locale.toUpperCase()}</h2>
          <p className="text-xs text-slate-500">
            Assisted drafts are grounded in supplied sources and require review before publication.
          </p>
        </div>
        {job && (
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2.5 py-1 text-xs font-semibold ${
                job.status === 'succeeded'
                  ? 'bg-emerald-100 text-emerald-900'
                  : job.status === 'failed' || job.status === 'canceled'
                  ? 'bg-rose-100 text-rose-900'
                  : 'bg-blue-100 text-blue-900'
              }`}
            >
              Status: {job.status}
            </span>
          </div>
        )}
      </div>

      {notice && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
      {error && <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-900"><p>{error}</p></div>}

      {/* Active Job Status / Review view */}
      {job && (job.status === 'queued' || job.status === 'running') && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900">
              {job.status === 'queued' ? 'Job queued, waiting for worker…' : 'Generating article draft with AI provider…'}
            </p>
            <button
              type="button"
              disabled={canceling}
              onClick={() => void handleCancel()}
              className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-50"
            >
              {canceling ? 'Canceling…' : 'Cancel job'}
            </button>
          </div>
          <p className="text-xs text-blue-700">
            You can safely navigate away. The job runs in the background and will be restored when reopening this article.
          </p>
        </div>
      )}

      {job && job.status === 'succeeded' && (
        <BlogGenerationReview
          job={job}
          currentDraft={currentDraft}
          locale={locale}
          dirty={dirty}
          applying={applying}
          discarding={discarding}
          onApply={handleApply}
          onDiscard={handleDiscard}
        />
      )}

      {job && (job.status === 'failed' || job.status === 'canceled') && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2">
          <p className="text-sm font-medium text-rose-900">
            Generation {job.status}: {job.error_category || 'request did not complete'}.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(storageKey(postID, locale));
                setJob(null);
              }}
              className="rounded border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50"
            >
              Start new generation brief
            </button>
          </div>
        </div>
      )}

      {/* Generation Brief Form — visible when no job, or after completion/failure */}
      {(!job || job.status === 'failed' || job.status === 'canceled') && (
        <form onSubmit={handleStart} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-800">Topic *</span>
              <input
                value={topic}
                maxLength={300}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Rhinoplasty recovery timeline and expectations"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.topic && <p className="mt-1 text-xs text-rose-600">{fieldErrors.topic}</p>}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-800">Audience</span>
              <input
                value={audience}
                maxLength={500}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Prospective international patients considering rhinoplasty"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.audience && <p className="mt-1 text-xs text-rose-600">{fieldErrors.audience}</p>}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-800">Target length (words)</span>
              <select
                value={targetLength ?? ''}
                onChange={(e) => setTargetLength(e.target.value ? Number(e.target.value) : undefined)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Default (balanced)</option>
                <option value="500">Short (500 words)</option>
                <option value="800">Medium (800 words)</option>
                <option value="1200">Long (1,200 words)</option>
                <option value="1500">Comprehensive (1,500 words)</option>
              </select>
              {fieldErrors.target_length && <p className="mt-1 text-xs text-rose-600">{fieldErrors.target_length}</p>}
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-800">Editorial instructions *</span>
              <textarea
                value={instructions}
                maxLength={2000}
                rows={3}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Specific guidance for style, headings, and key points to emphasize"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.instructions && <p className="mt-1 text-xs text-rose-600">{fieldErrors.instructions}</p>}
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-800">Approved clinic facts</span>
              <textarea
                value={clinicFacts}
                maxLength={20000}
                rows={2}
                onChange={(e) => setClinicFacts(e.target.value)}
                placeholder="Doctor credentials, facility certifications, or authorized procedures"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {fieldErrors.clinic_facts && <p className="mt-1 text-xs text-rose-600">{fieldErrors.clinic_facts}</p>}
            </label>
          </div>

          {/* Source excerpts */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">
                Source excerpts ({sources.length}/10)
              </span>
              {sources.length < 10 && (
                <button
                  type="button"
                  onClick={addSource}
                  className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  + Add source excerpt
                </button>
              )}
            </div>

            {sources.map((src, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    aria-label={`Source ID ${i + 1}`}
                    placeholder="Source ID (e.g. src-dr-study)"
                    value={src.source_id}
                    onChange={(e) => updateSource(i, { source_id: e.target.value })}
                    className="rounded border px-2 py-1 text-xs"
                  />
                  <input
                    aria-label={`Citation label ${i + 1}`}
                    placeholder="Citation label (e.g. Clinical Study 2024)"
                    value={src.citation_label}
                    onChange={(e) => updateSource(i, { citation_label: e.target.value })}
                    className="rounded border px-2 py-1 text-xs sm:col-span-2"
                  />
                </div>
                <textarea
                  aria-label={`Source text ${i + 1}`}
                  placeholder="Approved excerpt text for the model to ground its writing"
                  value={src.text}
                  rows={2}
                  onChange={(e) => updateSource(i, { text: e.target.value })}
                  className="w-full rounded border px-2 py-1 text-xs"
                />
                <div className="flex items-center justify-between gap-2">
                  <input
                    aria-label={`Citation URL ${i + 1}`}
                    placeholder="https://... (optional)"
                    value={src.citation_url ?? ''}
                    onChange={(e) => updateSource(i, { citation_url: e.target.value })}
                    className="flex-1 rounded border px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeSource(i)}
                    className="text-xs text-rose-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy confirmation */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={confirmedNoPatientData}
                onChange={(e) => setConfirmedNoPatientData(e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                <strong>No patient data:</strong> I confirm this brief contains no patient records, clinical photographs,
                personal contact details, or private consultation transcripts.
              </span>
            </label>
            {fieldErrors.confirmation && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.confirmation}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={starting || !confirmedNoPatientData}
            className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {starting ? 'Starting generation…' : `Start AI drafting for ${locale.toUpperCase()}`}
          </button>
        </form>
      )}
    </section>
  );
}

