import type { BlogGeneratorProps } from "../types/blogs.types";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../../lib/api";
import { useBlogEditorReads } from "../hooks/useBlogReads";
import {
  useApplyBlogGeneration,
  useCancelBlogGeneration,
  useDiscardBlogGeneration,
  useQueueBlogGeneration,
} from "../hooks/useBlogMutations";
import type {
  BlogGenerationBrief,
  BlogGenerationJob,
  BlogGenerationSource,
  BlogLocale,
} from "../types/blogs.types";
import { BlogGenerationReview } from "./BlogGenerationReview";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const storageKey = (postID: string, locale: string) =>
  `blog_gen_job_${postID}_${locale}`;

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
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [instructions, setInstructions] = useState("");
  const [targetLength, setTargetLength] = useState<number | undefined>(
    undefined,
  );
  const [clinicFacts, setClinicFacts] = useState("");
  const [sources, setSources] = useState<BlogGenerationSource[]>([]);
  const [confirmedNoPatientData, setConfirmedNoPatientData] = useState(false);

  // Job & UI state
  const [job, setJob] = useState<BlogGenerationJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [applying, setApplying] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const pollCount = useRef(0);
  const maxPolls = 48; // ~120s with 2.5s interval
  const { loadGeneration } = useBlogEditorReads();
  const queueGeneration = useQueueBlogGeneration();
  const cancelGeneration = useCancelBlogGeneration();
  const discardGeneration = useDiscardBlogGeneration();
  const applyGeneration = useApplyBlogGeneration();

  // Reopen persisted job from localStorage on mount or locale change
  useEffect(() => {
    setError("");
    setFieldErrors({});
    const savedJobID = localStorage.getItem(storageKey(postID, locale));
    if (!savedJobID) {
      setJob(null);
      return;
    }

    let active = true;
    loadGeneration(postID, savedJobID)
      .then((j) => {
        if (!active) return;
        if (j.status === "applied" || j.status === "discarded") {
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
  }, [postID, locale, loadGeneration]);

  // Bounded polling while queued or running
  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "running")) return;

    pollCount.current = 0;
    const interval = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > maxPolls) {
        clearInterval(interval);
        setError(
          "Generation timed out polling. Please check job status or retry.",
        );
        return;
      }
      try {
        const updated = await loadGeneration(postID, job.id);
        setJob(updated);
        if (updated.status !== "queued" && updated.status !== "running") {
          clearInterval(interval);
          if (updated.status === "applied" || updated.status === "discarded") {
            localStorage.removeItem(storageKey(postID, locale));
          }
        }
      } catch (err) {
        clearInterval(interval);
        if (err instanceof ApiError && err.status === 401) {
          setError(
            "Session expired while checking generation progress. Please sign in again.",
          );
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [postID, locale, job?.id, job?.status, loadGeneration]);

  function addSource() {
    if (sources.length >= 10) return;
    setSources((prev) => [
      ...prev,
      {
        source_id: `src-${prev.length + 1}`,
        text: "",
        citation_label: "",
        citation_url: "",
      },
    ]);
  }

  function updateSource(index: number, patch: Partial<BlogGenerationSource>) {
    setSources((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function removeSource(index: number) {
    setSources((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setNotice("");

    // Client-side length & URL checks
    const errors: Record<string, string> = {};
    if (!topic.trim()) errors.topic = "Topic is required.";
    else if (topic.length > 300)
      errors.topic = "Topic must be ≤ 300 characters.";

    if (audience && audience.length > 500)
      errors.audience = "Audience must be ≤ 500 characters.";
    if (!instructions.trim())
      errors.instructions = "Instructions are required.";
    else if (instructions.length > 2000)
      errors.instructions = "Instructions must be ≤ 2,000 characters.";

    if (targetLength && (targetLength < 400 || targetLength > 1500)) {
      errors.target_length =
        "Target length must be between 400 and 1,500 words.";
    }
    if (clinicFacts && clinicFacts.length > 20000) {
      errors.clinic_facts = "Clinic facts must be ≤ 20,000 characters.";
    }

    let sourceChars = 0;
    sources.forEach((s, i) => {
      sourceChars += s.text.length;
      if (!s.source_id.trim())
        errors[`source_${i}_id`] = "Source ID is required.";
      if (!s.text.trim())
        errors[`source_${i}_text`] = "Source excerpt text is required.";
      if (!s.citation_label.trim())
        errors[`source_${i}_label`] = "Citation label is required.";
      if (s.citation_url && !s.citation_url.startsWith("https://")) {
        errors[`source_${i}_url`] = "Citation URL must use HTTPS.";
      }
    });
    if (sourceChars > 20000) {
      errors.sources = "Total source excerpts must be ≤ 20,000 characters.";
    }

    if (!confirmedNoPatientData) {
      errors.confirmation =
        "You must confirm that no patient data is included.";
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
        ...(s.citation_url?.trim()
          ? { citation_url: s.citation_url.trim() }
          : {}),
      })),
      ...(audience.trim() ? { audience: audience.trim() } : {}),
      ...(targetLength ? { target_length: targetLength } : {}),
      ...(clinicFacts.trim() ? { clinic_facts: clinicFacts.trim() } : {}),
    };

    setStarting(true);
    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const createdJob = await queueGeneration.mutateAsync({
        id: postID,
        lang: locale,
        idempotencyKey,
        baseRevision,
        brief,
      });
      setJob(createdJob);
      localStorage.setItem(storageKey(postID, locale), createdJob.id);
      setNotice(`Generation job queued for ${locale.toUpperCase()}.`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "BLOG_BUDGET_EXHAUSTED" || err.status === 422) {
          setError(
            err.message ||
              "Daily AI generation budget reached. Try again tomorrow or edit manually.",
          );
        } else if (err.status === 409) {
          setError(
            "A generation job is already active for this post/locale, or aggregate limit reached.",
          );
        } else {
          setError(err.message);
        }
        if (err.fields) setFieldErrors(err.fields);
      } else {
        setError("Failed to start generation. Manual text is preserved.");
      }
    } finally {
      setStarting(false);
    }
  }

  async function handleCancel() {
    if (!job || canceling) return;
    setCanceling(true);
    setError("");
    try {
      await cancelGeneration.mutateAsync({ id: postID, jobID: job.id });
      setJob((prev) => (prev ? { ...prev, status: "canceled" } : null));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to cancel generation job.");
    } finally {
      setCanceling(false);
    }
  }

  async function handleDiscard() {
    if (!job || discarding) return;
    setDiscarding(true);
    setError("");
    try {
      await discardGeneration.mutateAsync({ id: postID, jobID: job.id });
      localStorage.removeItem(storageKey(postID, locale));
      setJob(null);
      setNotice("Generation result discarded.");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to discard generation result.");
    } finally {
      setDiscarding(false);
    }
  }

  async function handleApply(selectedFields: string[]) {
    if (!job || applying) return;
    setApplying(true);
    setError("");
    try {
      await applyGeneration.mutateAsync({
        id: postID,
        jobID: job.id,
        selectedFields,
      });
      localStorage.removeItem(storageKey(postID, locale));
      setJob(null);
      await onRefresh();
      onApplied?.(
        `Applied generated ${selectedFields.join(", ")} as assisted draft.`,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(
            "Draft changed on server. Please refresh latest revision and retry.",
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(
          "Failed to apply generated draft. Your current draft text is untouched.",
        );
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card aria-label="AI drafting" className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            AI drafting for {locale.toUpperCase()}
          </h2>
          <p className="text-xs text-slate-500">
            Assisted drafts are grounded in supplied sources and require review
            before publication.
          </p>
        </div>
        {job && (
          <div className="flex items-center gap-2">
            <Badge
              variant={
                job.status === "succeeded"
                  ? "secondary"
                  : job.status === "failed" || job.status === "canceled"
                    ? "destructive"
                    : "outline"
              }
            >
              Status: {job.status}
            </Badge>
          </div>
        )}
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-md bg-green-50 p-3 text-sm text-green-900"
        >
          {notice}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-4 text-sm text-red-900"
        >
          <p>{error}</p>
        </div>
      )}

      {/* Active Job Status / Review view */}
      {job && (job.status === "queued" || job.status === "running") && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900">
              {job.status === "queued"
                ? "Job queued, waiting for worker…"
                : "Generating article draft with AI provider…"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={canceling}
              onClick={() => void handleCancel()}
            >
              {canceling ? "Canceling…" : "Cancel job"}
            </Button>
          </div>
          <p className="text-xs text-blue-700">
            You can safely navigate away. The job runs in the background and
            will be restored when reopening this article.
          </p>
        </div>
      )}

      {job && job.status === "succeeded" && (
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

      {job && (job.status === "failed" || job.status === "canceled") && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2">
          <p className="text-sm font-medium text-rose-900">
            Generation {job.status}:{" "}
            {job.error_category || "request did not complete"}.
          </p>
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem(storageKey(postID, locale));
                setJob(null);
              }}
            >
              Start new generation brief
            </Button>
          </div>
        </div>
      )}

      {/* Generation Brief Form — visible when no job, or after completion/failure */}
      {(!job || job.status === "failed" || job.status === "canceled") && (
        <form onSubmit={handleStart} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="blog-gen-topic">Topic *</Label>
              <Input
                id="blog-gen-topic"
                value={topic}
                maxLength={300}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Rhinoplasty recovery timeline and expectations"
              />
              {fieldErrors.topic && (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.topic}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blog-gen-audience">Audience</Label>
              <Input
                id="blog-gen-audience"
                value={audience}
                maxLength={500}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Prospective international patients considering rhinoplasty"
              />
              {fieldErrors.audience && (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.audience}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blog-gen-target-length">
                Target length (words)
              </Label>
              <select
                id="blog-gen-target-length"
                value={targetLength ?? ""}
                onChange={(e) =>
                  setTargetLength(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Default (balanced)</option>
                <option value="500">Short (500 words)</option>
                <option value="800">Medium (800 words)</option>
                <option value="1200">Long (1,200 words)</option>
                <option value="1500">Comprehensive (1,500 words)</option>
              </select>
              {fieldErrors.target_length && (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.target_length}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="blog-gen-instructions">
                Editorial instructions *
              </Label>
              <Textarea
                id="blog-gen-instructions"
                value={instructions}
                maxLength={2000}
                rows={3}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Specific guidance for style, headings, and key points to emphasize"
              />
              {fieldErrors.instructions && (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.instructions}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="blog-gen-clinic-facts">
                Approved clinic facts
              </Label>
              <Textarea
                id="blog-gen-clinic-facts"
                value={clinicFacts}
                maxLength={20000}
                rows={2}
                onChange={(e) => setClinicFacts(e.target.value)}
                placeholder="Doctor credentials, facility certifications, or authorized procedures"
              />
              {fieldErrors.clinic_facts && (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.clinic_facts}
                </p>
              )}
            </div>
          </div>

          {/* Source excerpts */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">
                Source excerpts ({sources.length}/10)
              </span>
              {sources.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSource}
                >
                  + Add source excerpt
                </Button>
              )}
            </div>

            {sources.map((src, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2"
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    aria-label={`Source ID ${i + 1}`}
                    placeholder="Source ID (e.g. src-dr-study)"
                    value={src.source_id}
                    onChange={(e) =>
                      updateSource(i, { source_id: e.target.value })
                    }
                  />
                  <Input
                    aria-label={`Citation label ${i + 1}`}
                    placeholder="Citation label (e.g. Clinical Study 2024)"
                    value={src.citation_label}
                    onChange={(e) =>
                      updateSource(i, { citation_label: e.target.value })
                    }
                    className="sm:col-span-2"
                  />
                </div>
                <Textarea
                  aria-label={`Source text ${i + 1}`}
                  placeholder="Approved excerpt text for the model to ground its writing"
                  value={src.text}
                  rows={2}
                  onChange={(e) => updateSource(i, { text: e.target.value })}
                  className="w-full"
                />
                <div className="flex items-center justify-between gap-2">
                  <Input
                    aria-label={`Citation URL ${i + 1}`}
                    placeholder="https://... (optional)"
                    value={src.citation_url ?? ""}
                    onChange={(e) =>
                      updateSource(i, { citation_url: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSource(i)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy confirmation */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <Label className="flex items-start gap-2.5 cursor-pointer text-xs font-normal">
              <input
                type="checkbox"
                checked={confirmedNoPatientData}
                onChange={(e) => setConfirmedNoPatientData(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <strong>No patient data:</strong> I confirm this brief contains
                no patient records, clinical photographs, personal contact
                details, or private consultation transcripts.
              </span>
            </Label>
            {fieldErrors.confirmation && (
              <p className="mt-1 text-xs text-rose-600">
                {fieldErrors.confirmation}
              </p>
            )}
          </div>

          <Button type="submit" disabled={starting || !confirmedNoPatientData}>
            {starting
              ? "Starting generation…"
              : `Start AI drafting for ${locale.toUpperCase()}`}
          </Button>
        </form>
      )}
    </Card>
  );
}
