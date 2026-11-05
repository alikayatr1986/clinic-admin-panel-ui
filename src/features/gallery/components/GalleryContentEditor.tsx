import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../../lib/api";
import { useGalleryContent, useSaveGalleryContent } from "../hooks/useGallery";
import type {
  GalleryContentEditorProps,
  GalleryContentForm,
  GalleryContentRecovery,
  GalleryLocale,
} from "../types/gallery.types";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function GalleryContentEditor({
  username,
  onExpired,
  onBack,
  registerBlocker,
}: GalleryContentEditorProps) {
  const recoveryKey = `gallery-content-recovery:${username}`;
  const [lang, setLang] = useState<GalleryLocale>(() => {
    try {
      const value = sessionStorage.getItem(recoveryKey);
      const recovered = value ? JSON.parse(value) : null;
      return recovered?.lang === 'ar' ? 'ar' : 'en';
    } catch {
      return 'en';
    }
  });

  const queryEn = useGalleryContent('en');
  const queryAr = useGalleryContent('ar');
  const save = useSaveGalleryContent();

  const [forms, setForms] = useState<Record<GalleryLocale, GalleryContentForm | null>>({
    en: null,
    ar: null,
  });
  const [baselines, setBaselines] = useState<Record<GalleryLocale, string>>({
    en: '',
    ar: '',
  });
  const [revisions, setRevisions] = useState<Record<GalleryLocale, number>>({
    en: 1,
    ar: 1,
  });
  const [statuses, setStatuses] = useState<Record<GalleryLocale, string>>({
    en: '',
    ar: '',
  });
  const [conflicts, setConflicts] = useState<Record<GalleryLocale, boolean>>({
    en: false,
    ar: false,
  });
  const [errorsByLocale, setErrorsByLocale] = useState<Record<GalleryLocale, Record<string, string>>>({
    en: {},
    ar: {},
  });
  const [errorByLocale, setErrorByLocale] = useState<Record<GalleryLocale, string>>({
    en: '',
    ar: '',
  });
  const [noticeByLocale, setNoticeByLocale] = useState<Record<GalleryLocale, string>>({
    en: '',
    ar: '',
  });
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const error401 =
      (queryEn.error instanceof ApiError && queryEn.error.status === 401) ||
      (queryAr.error instanceof ApiError && queryAr.error.status === 401);
    if (error401) {
      try {
        const currentForm = forms[lang];
        if (currentForm) {
          sessionStorage.setItem(
            recoveryKey,
            JSON.stringify({ lang, form: currentForm, revision: revisions[lang] })
          );
        }
        onExpired();
      } catch {
        setErrorByLocale((prev) => ({
          ...prev,
          [lang]: 'Your session expired and your edits could not be stored. Copy them before signing in again.',
        }));
      }
    }
  }, [queryEn.error, queryAr.error, onExpired, forms, lang, revisions, recoveryKey]);

  const initialized = useRef<Record<GalleryLocale, boolean>>({ en: false, ar: false });

  useEffect(() => {
    (['en', 'ar'] as const).forEach((l) => {
      const q = l === 'en' ? queryEn : queryAr;
      if (!q.data || initialized.current[l]) return;
      initialized.current[l] = true;

      const item = q.data.data.find((entry) => entry.lang === l);
      const initial: GalleryContentForm = item
        ? {
            eyebrow: item.eyebrow,
            heading: item.heading,
            introduction: item.introduction,
            statistics: item.statistics ?? [],
          }
        : { eyebrow: '', heading: '', introduction: '', statistics: [] };

      let restored: GalleryContentRecovery | null = null;
      try {
        const value = sessionStorage.getItem(recoveryKey);
        if (value) restored = JSON.parse(value);
      } catch {
        /* storage unavailable */
      }

      if (restored && restored.lang === l) {
        setForms((prev) => ({ ...prev, [l]: restored!.form }));
        setRevisions((prev) => ({ ...prev, [l]: restored!.revision }));
        sessionStorage.removeItem(recoveryKey);
        if (restored.revision !== (item?.revision ?? 1)) {
          setConflicts((prev) => ({ ...prev, [l]: true }));
        }
        setNoticeByLocale((prev) => ({
          ...prev,
          [l]: 'Your edits were restored after session expiry.',
        }));
      } else {
        setForms((prev) => ({ ...prev, [l]: initial }));
        setRevisions((prev) => ({ ...prev, [l]: item?.revision ?? 1 }));
      }
      setBaselines((prev) => ({ ...prev, [l]: JSON.stringify(initial) }));
      setStatuses((prev) => ({ ...prev, [l]: item?.approval ?? '' }));
    });
  }, [queryEn.data, queryAr.data, recoveryKey]);

  const isDirtyEn = forms.en !== null && JSON.stringify(forms.en) !== baselines.en;
  const isDirtyAr = forms.ar !== null && JSON.stringify(forms.ar) !== baselines.ar;
  const hasConflict = conflicts.en || conflicts.ar;
  const dirty = isDirtyEn || isDirtyAr;

  useEffect(() => {
    const blocked = dirty || hasConflict || save.isPending || recovering;
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
  }, [dirty, hasConflict, save.isPending, recovering, registerBlocker]);

  async function submit(approval: 'draft' | 'approved') {
    const currentForm = forms[lang];
    if (!currentForm || save.isPending || recovering || conflicts[lang]) return;

    const fields: Record<string, string> = {};
    for (const [key, limit] of [
      ["eyebrow", 160],
      ["heading", 300],
      ["introduction", 2000],
    ] as const) {
      if (!currentForm[key].trim()) fields[key] = "This field is required.";
      else if (Array.from(currentForm[key]).length > limit)
        fields[key] = `Use at most ${limit} characters.`;
    }
    if (currentForm.statistics.length > 3)
      fields.statistics = "Use at most three statistics.";
    const keys = new Set<string>();
    currentForm.statistics.forEach((stat, index) => {
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
      setErrorsByLocale((prev) => ({ ...prev, [lang]: fields }));
      setErrorByLocale((prev) => ({ ...prev, [lang]: "Check the highlighted fields." }));
      return;
    }
    setErrorsByLocale((prev) => ({ ...prev, [lang]: {} }));
    setErrorByLocale((prev) => ({ ...prev, [lang]: "" }));
    setNoticeByLocale((prev) => ({ ...prev, [lang]: "" }));

    try {
      const response = await save.mutateAsync({
        lang,
        expected_revision: revisions[lang],
        ...currentForm,
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
      setForms((prev) => ({ ...prev, [lang]: saved }));
      setBaselines((prev) => ({ ...prev, [lang]: JSON.stringify(saved) }));
      setRevisions((prev) => ({ ...prev, [lang]: item.revision }));
      setStatuses((prev) => ({ ...prev, [lang]: item.approval }));
      setNoticeByLocale((prev) => ({
        ...prev,
        [lang]: `Server saved revision ${item.revision} with status ${item.approval}.`,
      }));
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        try {
          sessionStorage.setItem(
            recoveryKey,
            JSON.stringify({ lang, form: currentForm, revision: revisions[lang] })
          );
          onExpired();
        } catch {
          setErrorByLocale((prev) => ({
            ...prev,
            [lang]: 'Your session expired and your edits could not be stored. Copy them before signing in again.',
          }));
        }
      } else {
        const is409 = failure instanceof ApiError && failure.status === 409;
        setConflicts((prev) => ({ ...prev, [lang]: is409 }));
        setErrorsByLocale((prev) => ({
          ...prev,
          [lang]: failure instanceof ApiError
            ? Object.fromEntries(
                Object.entries(failure.fields ?? {}).map(([k, v]) => [
                  k.replace(/\[(\d+)\]/g, '.$1'),
                  v,
                ])
              )
            : {},
        }));
        setErrorByLocale((prev) => ({
          ...prev,
          [lang]: is409
            ? "This content changed elsewhere. Your edits are still here; copy them before leaving."
            : failure instanceof Error
              ? failure.message
              : "Save failed. Try again.",
        }));
      }
    }
  }

  async function recover(reload: boolean) {
    if (recovering || save.isPending) return;
    if (reload && !window.confirm('Discard your edits and reload the server content?')) return;
    setRecovering(true);
    const q = lang === 'en' ? queryEn : queryAr;
    try {
      const result = await q.refetch();
      if (result.error || !result.data) throw result.error ?? new Error('Reload failed');
      const item = result.data.data.find((entry) => entry.lang === lang);
      const current = item
        ? {
            eyebrow: item.eyebrow,
            heading: item.heading,
            introduction: item.introduction,
            statistics: item.statistics ?? [],
          }
        : { eyebrow: '', heading: '', introduction: '', statistics: [] };
      setRevisions((prev) => ({ ...prev, [lang]: item?.revision ?? 1 }));
      setStatuses((prev) => ({ ...prev, [lang]: item?.approval ?? '' }));
      setBaselines((prev) => ({ ...prev, [lang]: JSON.stringify(current) }));
      if (reload) {
        setForms((prev) => ({ ...prev, [lang]: current }));
      }
      setConflicts((prev) => ({ ...prev, [lang]: false }));
      setErrorsByLocale((prev) => ({ ...prev, [lang]: {} }));
      setErrorByLocale((prev) => ({ ...prev, [lang]: '' }));
      setNoticeByLocale((prev) => ({
        ...prev,
        [lang]: reload
          ? 'Server content reloaded.'
          : 'Edits retained. Saving or publishing will overwrite the current server draft.',
      }));
    } catch {
      setErrorByLocale((prev) => ({
        ...prev,
        [lang]: 'Could not load server content. Your edits are retained; try again.',
      }));
    } finally {
      setRecovering(false);
    }
  }

  function renderLocaleContent(locale: GalleryLocale) {
    const q = locale === 'en' ? queryEn : queryAr;
    const currentForm = forms[locale];
    const localeError = errorByLocale[locale];
    const localeErrors = errorsByLocale[locale];
    const localeNotice = noticeByLocale[locale];
    const localeConflict = conflicts[locale];
    const isLocaleDirty = currentForm !== null && JSON.stringify(currentForm) !== baselines[locale];

    if (q.isLoading || (!currentForm && !q.error)) {
      return <p role="status">Loading content…</p>;
    }
    if (q.error && !currentForm) {
      return (
        <div role="alert">
          <p>
            {q.error instanceof Error
              ? q.error.message
              : "Content could not be loaded."}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void q.refetch()}
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      );
    }

    if (!currentForm) return null;

    return (
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          Revision {revisions[locale]} ·{" "}
          {statuses[locale] ? `Status: ${statuses[locale]}` : "New empty draft"}
        </p>
        <p className="text-sm text-slate-600">
          Draft changes are not public. The last approved version remains public until you publish.
        </p>
        {isLocaleDirty && (
          <p role="status" className="text-sm text-amber-900">
            You have unsaved changes.
          </p>
        )}
        {localeError && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900"
          >
            {localeError}
            {Object.entries(localeErrors).length > 0 && (
              <ul className="mt-2 list-inside list-disc">
                {Object.entries(localeErrors).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {localeConflict && (
          <Card className="space-y-3 p-4">
            <p>
              Reload discards your edits. Reapply keeps them; a later save or publish overwrites the current server draft.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={recovering}
                onClick={() => void recover(true)}
              >
                Reload server content
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={recovering}
                onClick={() => void recover(false)}
              >
                Reapply my edits
              </Button>
            </div>
          </Card>
        )}
        {localeNotice && (
          <p
            role="status"
            className="rounded-md border border-green-200 bg-green-50 p-4 text-green-900"
          >
            {localeNotice}
          </p>
        )}

        <Card className="p-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit('draft');
            }}
            noValidate
          >
            <fieldset disabled={save.isPending || recovering} className="space-y-5">
              {(["eyebrow", "heading", "introduction"] as const).map(
                (key) => (
                  <div key={key}>
                    <Label
                      htmlFor={`${locale}-${key}`}
                      className="block text-sm font-medium capitalize"
                    >
                      {key}
                    </Label>
                    <Textarea
                      id={`${locale}-${key}`}
                      lang={locale}
                      dir={locale === "ar" ? "rtl" : "ltr"}
                      rows={key === "introduction" ? 4 : 2}
                      value={currentForm[key]}
                      aria-invalid={Boolean(localeErrors[key])}
                      aria-describedby={
                        localeErrors[key] ? `${locale}-${key}-error` : undefined
                      }
                      onChange={(event) => {
                        setForms((prev) => ({
                          ...prev,
                          [locale]: prev[locale]
                            ? { ...prev[locale]!, [key]: event.target.value }
                            : prev[locale],
                        }));
                        setNoticeByLocale((prev) => ({ ...prev, [locale]: "" }));
                      }}
                      className="mt-2"
                    />
                    {localeErrors[key] ? (
                      <p id={`${locale}-${key}-error`} className="mt-1 text-sm text-red-800">
                        {localeErrors[key]}
                      </p>
                    ) : null}
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
                {localeErrors.statistics ? (
                  <p id={`${locale}-statistics-error`} className="mt-1 text-sm text-red-800">
                    {localeErrors.statistics}
                  </p>
                ) : null}
                {currentForm.statistics.map((stat, index) => (
                  <Card
                    key={index}
                    className="space-y-3 p-4"
                  >
                    <CardTitle className="text-base font-medium">Statistic {index + 1}</CardTitle>
                    {(["key", "value", "label"] as const).map((key) => {
                      const name = `statistics.${index}.${key}`;
                      return (
                        <div key={key}>
                          <Label
                            htmlFor={`${locale}-stat-${index}-${key}`}
                            className="block text-sm font-medium capitalize"
                          >
                            {key}
                          </Label>
                          <Input
                            id={`${locale}-stat-${index}-${key}`}
                            lang={locale}
                            dir={locale === "ar" ? "rtl" : "ltr"}
                            value={stat[key]}
                            aria-invalid={Boolean(localeErrors[name])}
                            aria-describedby={
                              localeErrors[name] ? `${locale}-stat-${index}-${key}-error` : undefined
                            }
                            onChange={(event) =>
                              setForms((prev) => ({
                                ...prev,
                                [locale]: prev[locale]
                                  ? {
                                      ...prev[locale]!,
                                      statistics: prev[locale]!.statistics.map((entry, i) =>
                                        i === index
                                          ? { ...entry, [key]: event.target.value }
                                          : entry,
                                      ),
                                    }
                                  : prev[locale],
                              }))
                            }
                            className="mt-2"
                          />
                          {localeErrors[name] ? (
                            <p id={`${locale}-stat-${index}-${key}-error`} className="mt-1 text-sm text-red-800">
                              {localeErrors[name]}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setForms((prev) => ({
                          ...prev,
                          [locale]: prev[locale]
                            ? {
                                ...prev[locale]!,
                                statistics: prev[locale]!.statistics.filter(
                                  (_, i) => i !== index,
                                ),
                              }
                            : prev[locale],
                        }))
                      }
                    >
                      Remove statistic {index + 1}
                    </Button>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentForm.statistics.length >= 3}
                  onClick={() =>
                    setForms((prev) => ({
                      ...prev,
                      [locale]: prev[locale]
                        ? {
                            ...prev[locale]!,
                            statistics: [
                              ...prev[locale]!.statistics,
                              { key: "", value: "", label: "" },
                            ],
                          }
                        : prev[locale],
                    }))
                  }
                >
                  Add statistic
                </Button>
              </fieldset>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={save.isPending || localeConflict}
                >
                  {save.isPending ? "Saving…" : "Save draft"}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  disabled={save.isPending || localeConflict}
                  onClick={() => void submit('approved')}
                >
                  Publish reviewed content
                </Button>
              </div>
            </fieldset>
          </form>
        </Card>
      </div>
    );
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
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
        >
          Back to gallery
        </Button>
      </div>

      <Tabs value={lang} onValueChange={(val) => setLang(val as GalleryLocale)}>
        <TabsList aria-label="Content language">
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ar">Arabic</TabsTrigger>
        </TabsList>
        <TabsContent value="en">
          {renderLocaleContent('en')}
        </TabsContent>
        <TabsContent value="ar">
          {renderLocaleContent('ar')}
        </TabsContent>
      </Tabs>
    </section>
  );
}
