import type { BlogGeneratorProps } from "../types/blogs.types";
import { useBlogGenerator } from "../hooks/useBlogGenerator";
import { BlogGenerationReview } from "./BlogGenerationReview";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const storageKey = (postID: string, locale: string) => `blog_gen_job_${postID}_${locale}`;
export function BlogGenerator(props: BlogGeneratorProps) {
  const { postID, locale, dirty, currentDraft, active = true } = props;
  const { topic, setTopic, audience, setAudience, instructions, setInstructions, targetLength, setTargetLength, clinicFacts, setClinicFacts, sources, confirmedNoPatientData, setConfirmedNoPatientData, job, starting, canceling, applying, discarding, error, fieldErrors, notice, addSource, updateSource, removeSource, handleStart, handleCancel, handleDiscard, handleApply, setJob, selected, setSelected } = useBlogGenerator(props);
  if (!active) return null;
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
          selected={selected}
          onSelectedChange={setSelected}
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
              <Label htmlFor={`blog-gen-${locale}-topic`}>Topic *</Label>
              <Input
                id={`blog-gen-${locale}-topic`}
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
              <Label htmlFor={`blog-gen-${locale}-audience`}>Audience</Label>
              <Input
                id={`blog-gen-${locale}-audience`}
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
              <Label htmlFor={`blog-gen-${locale}-target-length`}>
                Target length (words)
              </Label>
              <select
                id={`blog-gen-${locale}-target-length`}
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
              <Label htmlFor={`blog-gen-${locale}-instructions`}>
                Editorial instructions *
              </Label>
              <Textarea
                id={`blog-gen-${locale}-instructions`}
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
              <Label htmlFor={`blog-gen-${locale}-clinic-facts`}>
                Approved clinic facts
              </Label>
              <Textarea
                id={`blog-gen-${locale}-clinic-facts`}
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
