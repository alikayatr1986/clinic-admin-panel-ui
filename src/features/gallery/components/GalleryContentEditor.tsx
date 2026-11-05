import { useEffect, useState } from "react";
import { ApiError } from "../../../lib/api";
import { useGalleryContent, useSaveGalleryContent } from "../hooks/useGallery";
import type {
  GalleryContentEditorProps,
  GalleryContentForm,
  GalleryContentRecovery,
  GalleryLocale,
} from "../types/gallery.types";

export function GalleryContentEditor({
  username,
  onExpired,
  onBack,
  registerBlocker,
}: GalleryContentEditorProps) {
  const recoveryKey = `gallery-content-recovery:${username}`;
  const [lang, setLang] = useState<GalleryLocale>(() => { try { const value = sessionStorage.getItem(recoveryKey); const recovered = value ? JSON.parse(value) : null; return recovered?.lang === 'ar' ? 'ar' : 'en'; } catch { return 'en'; } });
  const query = useGalleryContent(lang);
  const save = useSaveGalleryContent();
  const [form, setForm] = useState<GalleryContentForm | null>(null);
  const [baseline, setBaseline] = useState("");
  const [revision, setRevision] = useState(1);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const dirty = form !== null && JSON.stringify(form) !== baseline;
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      try { if (form) sessionStorage.setItem(recoveryKey, JSON.stringify({ lang, form, revision })); onExpired(); }
      catch { setError('Your session expired and your edits could not be stored. Copy them before signing in again.'); }
    }
  }, [query.error, onExpired, form, lang, revision, recoveryKey]);
  useEffect(() => {
    if (!query.data || form !== null) return;
    const item = query.data.data.find((entry) => entry.lang === lang);
    const initial = item
      ? {
          eyebrow: item.eyebrow,
          heading: item.heading,
          introduction: item.introduction,
          statistics: item.statistics ?? [],
        }
      : { eyebrow: "", heading: "", introduction: "", statistics: [] };
    let restored: GalleryContentRecovery | null = null;
    try { const value = sessionStorage.getItem(recoveryKey); if (value) restored = JSON.parse(value); } catch { /* storage unavailable */ }
    if (restored && restored.lang === lang) { setForm(restored.form); setRevision(restored.revision); sessionStorage.removeItem(recoveryKey); if (restored.revision !== (item?.revision ?? 1)) setConflict(true); setNotice('Your edits were restored after session expiry.'); } else { setForm(initial); setRevision(item?.revision ?? 1); }
    setBaseline(JSON.stringify(initial));
    setStatus(item?.approval ?? "");
  }, [query.data, form, lang, recoveryKey]);
  useEffect(() => {
    const blocked = dirty || conflict || save.isPending || recovering;
    registerBlocker(
      blocked
        ? () =>
            window.confirm(
              "You have unsaved changes or a save in progress. Leave this editor?",
            )
        : null,
    );
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (blocked) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      registerBlocker(null);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [dirty, conflict, save.isPending, recovering, registerBlocker]);
  function switchLanguage(next: GalleryLocale) {
    if (next === lang || save.isPending || recovering) return;
    if (
      (dirty || conflict) &&
      !window.confirm("Discard unsaved changes and switch language?")
    )
      return;
    setForm(null);
    setErrors({});
    setError("");
    setNotice("");
    setConflict(false);
    setLang(next);
  }
  async function submit(approval: 'draft' | 'approved') {
    if (!form || save.isPending || recovering || conflict) return;
    const fields: Record<string, string> = {};
    for (const [key, limit] of [
      ["eyebrow", 160],
      ["heading", 300],
      ["introduction", 2000],
    ] as const) {
      if (!form[key].trim()) fields[key] = "This field is required.";
      else if (Array.from(form[key]).length > limit)
        fields[key] = `Use at most ${limit} characters.`;
    }
    if (form.statistics.length > 3)
      fields.statistics = "Use at most three statistics.";
    const keys = new Set<string>();
    form.statistics.forEach((stat, index) => {
      for (const [key, limit] of [
        ["key", 50],
        ["value", 50],
        ["label", 100],
      ] as const) {
        const name = `statistics.${index}.${key}`;
        if (!stat[key].trim()) fields[name] = "This field is required.";
        else if (Array.from(stat[key]).length > limit)
          fields[name] = `Use at most ${limit} characters.`;
      }
      const key = stat.key.trim();
      if (key && keys.has(key))
        fields[`statistics.${index}.key`] = "Statistic keys must be unique.";
      keys.add(key);
    });
    if (Object.keys(fields).length) {
      setErrors(fields);
      setError("Check the highlighted fields.");
      return;
    }
    setErrors({});
    setError("");
    setNotice("");
    try {
      const response = await save.mutateAsync({
        lang,
        expected_revision: revision,
        ...form,
        approval,
      });
      const item = response.data.find((entry) => entry.lang === lang);
      if (!item)
        throw new Error("The server did not return the saved content.");
      const saved = {
        eyebrow: item.eyebrow,
        heading: item.heading,
        introduction: item.introduction,
        statistics: item.statistics ?? [],
      };
      setForm(saved);
      setBaseline(JSON.stringify(saved));
      setRevision(item.revision);
      setStatus(item.approval);
      setNotice(`Server saved revision ${item.revision} with status ${item.approval}.`);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) { try { sessionStorage.setItem(recoveryKey, JSON.stringify({ lang, form, revision })); onExpired(); } catch { setError('Your session expired and your edits could not be stored. Copy them before signing in again.'); } }
      else {
        setConflict(failure instanceof ApiError && failure.status === 409);
        setErrors(failure instanceof ApiError ? Object.fromEntries(Object.entries(failure.fields ?? {}).map(([key, value]) => [key.replace(/\[(\d+)\]/g, '.$1'), value])) : {});
        setError(
          failure instanceof ApiError && failure.status === 409
            ? "This content changed elsewhere. Your edits are still here; copy them before leaving."
            : failure instanceof Error
              ? failure.message
              : "Save failed. Try again.",
        );
      }
    }
  }
  async function recover(reload: boolean) {
    if (recovering || save.isPending) return;
    if (reload && !window.confirm('Discard your edits and reload the server content?')) return;
    setRecovering(true);
    try {
      const result = await query.refetch();
      if (result.error || !result.data) throw result.error ?? new Error('Reload failed');
      const item = result.data.data.find((entry) => entry.lang === lang);
      const current = item ? { eyebrow: item.eyebrow, heading: item.heading, introduction: item.introduction, statistics: item.statistics ?? [] } : { eyebrow: '', heading: '', introduction: '', statistics: [] };
      setRevision(item?.revision ?? 1); setStatus(item?.approval ?? ''); setBaseline(JSON.stringify(current));
      if (reload) setForm(current);
      setConflict(false); setErrors({}); setError('');
      setNotice(reload ? 'Server content reloaded.' : 'Edits retained. Saving or publishing will overwrite the current server draft.');
    } catch { setError('Could not load server content. Your edits are retained; try again.'); }
    finally { setRecovering(false); }
  }
  const inputClass = "mt-2 w-full rounded-md border border-slate-300 px-3 py-2";
  function fieldError(name: string) {
    return errors[name] ? (
      <p id={`${name}-error`} className="mt-1 text-sm text-red-800">
        {errors[name]}
      </p>
    ) : null;
  }
  return (
    <section className="mt-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Gallery section content</h2>
          <p className="mt-1 text-sm text-slate-600">
            Edit the landing gallery copy as a draft.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-300 px-4 py-2 font-medium"
        >
          Back to gallery
        </button>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Content language">
        {(["en", "ar"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={lang === value}
            disabled={save.isPending || recovering}
            onClick={() => switchLanguage(value)}
            className={`rounded-md border px-4 py-2 font-medium ${lang === value ? "border-crimson bg-crimson text-white" : "border-slate-300 bg-white"}`}
          >
            {value === "en" ? "English" : "Arabic"}
          </button>
        ))}
      </div>
      {query.isLoading || (!form && !query.error) ? (
        <p role="status">Loading content…</p>
      ) : query.error && !form ? (
        <div role="alert">
          <p>
            {query.error instanceof Error
              ? query.error.message
              : "Content could not be loaded."}
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-3 rounded-md border border-slate-300 px-4 py-2"
          >
            Retry
          </button>
        </div>
      ) : (
        form && (
          <>
            <p className="text-sm text-slate-600">
              Revision {revision} ·{" "}
              {status ? `Status: ${status}` : "New empty draft"}
            </p>
            <p className="text-sm text-slate-600">Draft changes are not public. The last approved version remains public until you publish.</p>
      {dirty && (
              <p role="status" className="text-sm text-amber-900">
                You have unsaved changes.
              </p>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900"
              >
                {error}
                {Object.entries(errors).length > 0 && (
                  <ul className="mt-2 list-inside list-disc">
                    {Object.entries(errors).map(([key, value]) => (
                      <li key={key}>
                        {key}: {value}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {conflict && <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4"><p>Reload discards your edits. Reapply keeps them; a later save or publish overwrites the current server draft.</p><div className="flex flex-wrap gap-2"><button type="button" disabled={recovering} onClick={() => void recover(true)} className="rounded-md border border-slate-400 bg-white px-4 py-2">Reload server content</button><button type="button" disabled={recovering} onClick={() => void recover(false)} className="rounded-md border border-slate-400 bg-white px-4 py-2">Reapply my edits</button></div></div>}
      {notice && (
              <p
                role="status"
                className="rounded-md border border-green-200 bg-green-50 p-4 text-green-900"
              >
                {notice}
              </p>
            )}
            <form
              onSubmit={(event) => { event.preventDefault(); void submit('draft'); }}
              noValidate
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <fieldset disabled={save.isPending || recovering} className="space-y-5">
                {(["eyebrow", "heading", "introduction"] as const).map(
                  (key) => (
                    <div key={key}>
                      <label
                        htmlFor={key}
                        className="block text-sm font-medium capitalize"
                      >
                        {key}
                      </label>
                      <textarea
                        id={key}
                        lang={lang}
                        dir={lang === "ar" ? "rtl" : "ltr"}
                        rows={key === "introduction" ? 4 : 2}
                        value={form[key]}
                        aria-invalid={Boolean(errors[key])}
                        aria-describedby={
                          errors[key] ? `${key}-error` : undefined
                        }
                        onChange={(event) => {
                          setForm({ ...form, [key]: event.target.value });
                          setNotice("");
                        }}
                        className={inputClass}
                      />
                      {fieldError(key)}
                    </div>
                  ),
                )}
                <fieldset className="space-y-4">
                  <legend className="font-semibold">
                    Statistics (optional, maximum three)
                  </legend>
                  <p className="text-sm text-slate-600">
                    Statistics appear in the order shown.
                  </p>
                  {fieldError("statistics")}
                  {form.statistics.map((stat, index) => (
                    <div
                      key={index}
                      className="space-y-3 rounded-lg border border-slate-200 p-4"
                    >
                      <h3 className="font-medium">Statistic {index + 1}</h3>
                      {(["key", "value", "label"] as const).map((key) => {
                        const name = `statistics.${index}.${key}`;
                        return (
                          <div key={key}>
                            <label
                              htmlFor={name}
                              className="block text-sm font-medium capitalize"
                            >
                              {key}
                            </label>
                            <input
                              id={name}
                              lang={lang}
                              dir={lang === "ar" ? "rtl" : "ltr"}
                              value={stat[key]}
                              aria-invalid={Boolean(errors[name])}
                              aria-describedby={
                                errors[name] ? `${name}-error` : undefined
                              }
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  statistics: form.statistics.map((entry, i) =>
                                    i === index
                                      ? { ...entry, [key]: event.target.value }
                                      : entry,
                                  ),
                                })
                              }
                              className={inputClass}
                            />
                            {fieldError(name)}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            statistics: form.statistics.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                        className="rounded-md border border-slate-300 px-4 py-2 font-medium"
                      >
                        Remove statistic {index + 1}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={form.statistics.length >= 3}
                    onClick={() =>
                      setForm({
                        ...form,
                        statistics: [
                          ...form.statistics,
                          { key: "", value: "", label: "" },
                        ],
                      })
                    }
                    className="rounded-md border border-slate-300 px-4 py-2 font-medium disabled:opacity-50"
                  >
                    Add statistic
                  </button>
                </fieldset>
                <button
                  type="submit"
                  disabled={save.isPending || conflict}
                  className="rounded-md border border-crimson text-crimson px-5 py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {save.isPending ? "Saving…" : "Save draft"}
                </button>
                <button type="button" disabled={save.isPending || conflict} onClick={() => void submit('approved')} className="ml-3 rounded-md bg-crimson px-5 py-2.5 font-semibold text-white disabled:opacity-50">Publish reviewed content</button>
              </fieldset>
            </form>
          </>
        )
      )}
    </section>
  );
}
