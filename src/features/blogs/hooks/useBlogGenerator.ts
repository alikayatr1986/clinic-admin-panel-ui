import { toast } from 'sonner';
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSessionGeneration } from "../../../lib/session-generation";
import { blogKeys } from "./blog.keys";
import { ApiError } from "../../../lib/api";
import { useBlogEditorReads } from "./useBlogReads";
import { useApplyBlogGeneration, useCancelBlogGeneration, useDiscardBlogGeneration, useQueueBlogGeneration } from "./useBlogMutations";
import type { BlogGeneratorProps, BlogGenerationBrief, BlogGenerationJob, BlogGenerationSource, BlogGenerationSelection } from "../types/blogs.types";

const storageKey = (postID: string, locale: string) => `blog_gen_job_${postID}_${locale}`;
export function useBlogGenerator({ postID, locale, baseRevision, onRefresh, onApplied, onExpired }: BlogGeneratorProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({ title: true, excerpt: true, body: true, seo_title: true, seo_description: true });
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
  const [selection, setSelection] = useState<BlogGenerationSelection | null>(null);
  const scope = storageKey(postID, locale);
  const jobID = selection?.scope === scope ? selection.id : "";
  const scopeRef = useRef(scope);
  const scopeVersion = useRef(0);
  if (scopeRef.current !== scope) { scopeRef.current = scope; scopeVersion.current += 1; }
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const queryClient = useQueryClient();
  const { generation, loadGeneration } = useBlogEditorReads(postID, jobID);
  const job = generation.data ?? null;
  function setJob(value: BlogGenerationJob | null) {
    if (value) {
      if (selection?.id !== value.id) setSelected({ title: true, excerpt: true, body: true, seo_title: true, seo_description: true });
      queryClient.setQueryDefaults(blogKeys.generation(postID, value.id), { gcTime: 300_000 });
      queryClient.setQueryData(blogKeys.generation(postID, value.id), value);
      setSelection({ scope, id: value.id });
    } else setSelection(null);
  }
  function current(requestScope: string, session: number, version: number) {
    return (
      mounted.current &&
      scopeRef.current === requestScope &&
      scopeVersion.current === version &&
      getSessionGeneration() === session
    );
  }
  const [starting, setStarting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [applying, setApplying] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const pollCount = useRef(0);
  const maxPolls = 48; // ~120s with 2.5s interval
  const queueGeneration = useQueueBlogGeneration();
  const cancelGeneration = useCancelBlogGeneration();
  const discardGeneration = useDiscardBlogGeneration();
  const applyGeneration = useApplyBlogGeneration();

  // Reopen persisted job from localStorage on mount or locale change
  useEffect(() => {
    setError("");
    setFieldErrors({});
    setStarting(false);
    setCanceling(false);
    setDiscarding(false);
    setApplying(false);
    const savedJobID = localStorage.getItem(storageKey(postID, locale));
    if (!savedJobID) {
      setJob(null);
      return;
    }

    let active = true;
    const session = getSessionGeneration();
    const version = scopeVersion.current;
    loadGeneration(postID, savedJobID, () => active && current(scope, session, version))
      .then((j) => {
        if (!active || !current(scope, session, version)) return;
        if (j.status === "applied" || j.status === "discarded") {
          localStorage.removeItem(storageKey(postID, locale));
          setJob(null);
        } else {
          setJob(j);
        }
      })
      .catch((err) => {
        if (!active || !current(scope, session, version)) return;
        if (err instanceof ApiError && err.status === 404) {
          localStorage.removeItem(storageKey(postID, locale));
          setJob(null);
          setError("The saved generation job no longer exists. Start a new brief.");
        } else {
          if (err instanceof ApiError && err.status === 401) onExpired?.();
          setError(err instanceof ApiError && err.status === 401
            ? "Session expired while restoring generation. Please sign in again."
            : "Could not restore generation progress. Reopen this article to retry.");
        }
      });

    return () => {
      active = false;
      void queryClient.cancelQueries({ queryKey: blogKeys.generation(postID, savedJobID), exact: true });
    };
  }, [postID, locale, loadGeneration]);

  // Bounded polling while queued or running
  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "running")) return;

    pollCount.current = 0;
    let active = true;
    const session = getSessionGeneration();
    const version = scopeVersion.current;
    const interval = setInterval(async () => {
      if (pollCount.current >= maxPolls) {
        clearInterval(interval);
        setError("Generation timed out polling. Reopen this article to check the job status.");
        return;
      }
      pollCount.current += 1;
      try {
        const updated = await loadGeneration(postID, job.id, () => active && current(scope, session, version));
        if (!active || !current(scope, session, version)) return;
        setJob(updated);
        if (updated.status === "queued" || updated.status === "running") {
          if (pollCount.current >= maxPolls) {
            clearInterval(interval);
            setError("Generation timed out polling. Reopen this article to check the job status.");
          }
        } else {
          clearInterval(interval);
          if (updated.status === "applied" || updated.status === "discarded") {
            localStorage.removeItem(storageKey(postID, locale));
          }
        }
      } catch (err) {
        if (!active || !current(scope, session, version)) return;
        clearInterval(interval);
        if (err instanceof ApiError && err.status === 401) {
          onExpired?.();
          setError(
            "Session expired while checking generation progress. Please sign in again.",
          );
        } else {
          setError("Could not check generation progress. Reopen this article to retry.");
        }
      }
    }, 2500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [postID, locale, job?.id, job?.status === "queued" || job?.status === "running", loadGeneration]);

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

    const requestScope = scope;
    const session = getSessionGeneration();
    const version = scopeVersion.current;
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
      if (getSessionGeneration() !== session) return;
      localStorage.setItem(storageKey(postID, locale), createdJob.id);
      if (!current(requestScope, session, version)) return;
      setJob(createdJob);
      toast.success('Generation job queued.');
      setNotice(`Generation job queued for ${locale.toUpperCase()}.`);
    } catch (err) {
      if (!current(requestScope, session, version)) return;
      if (err instanceof ApiError && err.status === 401) onExpired?.();
      if (!(err instanceof ApiError && err.status === 401)) toast.error("Generation action failed. Check the details and try again.");
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
      if (current(requestScope, session, version)) setStarting(false);
    }
  }

  async function handleCancel() {
    if (!job || canceling) return;
    const requestScope = scope;
    const session = getSessionGeneration();
    const version = scopeVersion.current;
    setCanceling(true);
    setError("");
    try {
      await cancelGeneration.mutateAsync({ id: postID, jobID: job.id });
      if (!current(requestScope, session, version)) return;
      setJob({ ...job, status: "canceled" });
      toast.success("Generation job canceled.");
    } catch (err) {
      if (!current(requestScope, session, version)) return;
      if (err instanceof ApiError && err.status === 401) onExpired?.();
      if (!(err instanceof ApiError && err.status === 401)) toast.error("Generation action failed. Check the details and try again.");
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to cancel generation job.");
    } finally {
      if (current(requestScope, session, version)) setCanceling(false);
    }
  }

  async function handleDiscard() {
    if (!job || discarding) return;
    const requestScope = scope;
    const session = getSessionGeneration();
    const version = scopeVersion.current;
    setDiscarding(true);
    setError("");
    try {
      await discardGeneration.mutateAsync({ id: postID, jobID: job.id });
      if (!current(requestScope, session, version)) return;
      localStorage.removeItem(storageKey(postID, locale));
      setJob(null);
      setNotice("Generation result discarded.");
      toast.success("Generation result discarded.");
    } catch (err) {
      if (!current(requestScope, session, version)) return;
      if (err instanceof ApiError && err.status === 401) onExpired?.();
      if (!(err instanceof ApiError && err.status === 401)) toast.error("Generation action failed. Check the details and try again.");
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to discard generation result.");
    } finally {
      if (current(requestScope, session, version)) setDiscarding(false);
    }
  }

  async function handleApply(selectedFields: string[]) {
    if (!job || applying) return;
    const requestScope = scope;
    const session = getSessionGeneration();
    const version = scopeVersion.current;
    setApplying(true);
    setError("");
    let applied = false;
    try {
      await applyGeneration.mutateAsync({
        id: postID,
        jobID: job.id,
        selectedFields,
      });
      if (!current(requestScope, session, version)) return;
      localStorage.removeItem(storageKey(postID, locale));
      setJob(null);
      applied = true;
      toast.success("Generated draft applied.");
      await onRefresh();
      if (!current(requestScope, session, version)) return;
      onApplied?.(
        `Applied generated ${selectedFields.join(", ")} as assisted draft.`,
      );
    } catch (err) {
      if (!current(requestScope, session, version)) return;
      if (err instanceof ApiError && err.status === 401) onExpired?.();
      if (!(err instanceof ApiError && err.status === 401) && !applied) toast.error("Generation action failed. Check the details and try again.");
      if (applied) { setError("Generated draft applied, but saved details could not be refreshed. Retry loading them."); return; }
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
      if (current(requestScope, session, version)) setApplying(false);
    }
  }

  return { topic, setTopic, audience, setAudience, instructions, setInstructions, targetLength, setTargetLength, clinicFacts, setClinicFacts, sources, confirmedNoPatientData, setConfirmedNoPatientData, job, starting, canceling, applying, discarding, error, fieldErrors, notice, addSource, updateSource, removeSource, handleStart, handleCancel, handleDiscard, handleApply, setJob, selected, setSelected };
}
