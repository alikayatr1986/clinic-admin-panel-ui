import { useCallback, useEffect, useState } from 'react';
import type { GalleryContentEditorProps, GalleryLocale } from '../types/gallery.content.types';
import { useGalleryContent, useSaveGalleryContent } from '../hooks/useGallery';
import { useGalleryContentRecovery } from './useGalleryContentRecovery';
import { useGalleryContentForm } from './useGalleryContentForm';
import { GalleryContentHeader } from './GalleryContentHeader';
import { GalleryContentStateCards } from './GalleryContentStateCards';
import { GalleryContentFormCard } from './GalleryContentFormCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function GalleryContentEditor({
  username, onExpired, onBack, registerBlocker,
}: GalleryContentEditorProps) {
  const queryEn = useGalleryContent('en');
  const queryAr = useGalleryContent('ar');
  const save = useSaveGalleryContent();

  const [lang, setLang] = useState<GalleryLocale>('en');

  const getSnapshot = useCallback(() => ({
    lang,
    forms: { en: enFormRef.current?.(), ar: arFormRef.current?.() },
    revisions: { en: enRevRef.current ?? 1, ar: arRevRef.current ?? 1 },
  }), [lang]);

  const recovery = useGalleryContentRecovery({
    username, onExpired, queryEnError: queryEn.error, queryArError: queryAr.error, getSnapshot,
  });

  useEffect(() => {
    if (recovery.initialLang) setLang(recovery.initialLang);
  }, [recovery.initialLang]);

  const enForm = useGalleryContentForm({
    locale: 'en', query: queryEn, save, onSave401: recovery.saveRecovery, onExpired, recoveryCheck: recovery.checkRestore,
  });
  const arForm = useGalleryContentForm({
    locale: 'ar', query: queryAr, save, onSave401: recovery.saveRecovery, onExpired, recoveryCheck: recovery.checkRestore,
  });

  const enFormRef = { current: enForm.getFormData };
  const arFormRef = { current: arForm.getFormData };
  const enRevRef = { current: enForm.revision };
  const arRevRef = { current: arForm.revision };

  const isBlocked = enForm.isDirty || arForm.isDirty || enForm.conflict || arForm.conflict ||
    save.isPending || enForm.recovering || arForm.recovering;

  useEffect(() => {
    registerBlocker(isBlocked ? () => window.confirm('You have unsaved changes or a save in progress. Leave this editor?') : null);
    const onUnload = (e: BeforeUnloadEvent) => { if (isBlocked) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onUnload);
    return () => { registerBlocker(null); window.removeEventListener('beforeunload', onUnload); };
  }, [isBlocked, registerBlocker]);

  return (
    <section className="mt-8 space-y-5">
      <GalleryContentHeader onBack={onBack} />
      <Tabs value={lang} onValueChange={(val) => setLang(val as GalleryLocale)}>
        <TabsList aria-label="Content language">
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ar">Arabic</TabsTrigger>
        </TabsList>
        {(['en', 'ar'] as const).map((loc) => {
          const form = loc === 'en' ? enForm : arForm;
          const query = loc === 'en' ? queryEn : queryAr;
          return (
            <TabsContent key={loc} value={loc} dir={loc === 'ar' ? 'rtl' : undefined}>
              {query.isLoading || (!form.initialized && !query.error) ? (
                <GalleryContentStateCards loading onRetry={() => void query.refetch()} />
              ) : query.error && !form.initialized ? (
                <GalleryContentStateCards error={query.error} onRetry={() => void query.refetch()} />
              ) : (
                <GalleryContentFormCard locale={loc} form={form} />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
