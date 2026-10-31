import { useEffect, useState } from 'react';
import { useAdminNavigation } from '../../../lib/admin-navigation';
import { ApiError } from '../../../lib/api';
import { useGalleryActions, useGalleryCase } from '../hooks/useGallery';
import type { GalleryDetailPageProps } from '../types/gallery.types';

export function GalleryDetailPage({ caseID, onExpired, onEdit, onBack }: GalleryDetailPageProps) {
  const navigation = useAdminNavigation();
  const query = useGalleryCase(caseID);
  const actions = useGalleryActions();
  const [error, setError] = useState('');
  useEffect(() => { if (query.error instanceof ApiError && query.error.status === 401) onExpired(); }, [query.error, onExpired]);
  async function perform(action: () => Promise<unknown>, done?: () => void) {
    setError('');
    try { await action(); done?.(); }
    catch (failure) { if (failure instanceof ApiError && failure.status === 401) onExpired(); else setError(failure instanceof Error ? failure.message : 'Request failed.'); }
  }
  if (query.isPending) return <p role="status">Loading case…</p>;
  if (query.error) return <p role="alert">{query.error instanceof ApiError && query.error.status === 404 ? 'Case not found.' : query.error instanceof ApiError && query.error.status === 403 ? 'Access denied.' : 'Unable to load case.'}</p>;
  const item = query.data.data;
  const returnTo = new URLSearchParams(navigation?.search ?? '').get('returnTo');
  const safeReturn = returnTo && /^\/admin\/gallery(?:\?[^#]*)?$/.test(returnTo) ? returnTo : '/admin/gallery';
  return <section className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6">
    <h2 className="text-xl font-semibold">Case {item.id}</h2>
    <p>Revision {item.revision} · {item.published ? 'Published' : 'Unpublished'}</p>
    {item.url && <img src={item.url} alt={item.captions.find((caption) => caption.lang === 'en')?.alt_text || 'Combined before and after clinical image'} className="max-h-96 w-full object-contain" />}
    <p>Procedure: {item.procedure_tag || 'Not set'} · Timeframe: {item.timeframe_badge || 'Not set'}</p>
    {item.captions.map((caption) => <div key={caption.lang} lang={caption.lang} dir={caption.lang === 'ar' ? 'rtl' : 'ltr'}><strong>{caption.lang.toUpperCase()} · {caption.approval}</strong><p>{caption.alt_text}</p><p>{caption.caption}</p></div>)}
    {error && <p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <a href={safeReturn} onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onBack(); } }}>Back to gallery</a>
      <a href={`/admin/gallery/${encodeURIComponent(item.id)}/edit?returnTo=${encodeURIComponent(safeReturn)}`} onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onEdit(item.id); } }}>Edit case</a>
      <button type="button" onClick={() => { if (window.confirm('Delete this case?')) void perform(() => actions.remove.mutateAsync({ id: item.id, revision: item.revision }), onBack); }}>Delete case</button>
      {item.consent_id && <button type="button" onClick={() => { if (window.confirm('Withdraw consent for all associated cases?')) void perform(async () => { await actions.withdraw.mutateAsync(item.consent_id!); await query.refetch(); }); }}>Withdraw consent</button>}
    </div>
  </section>;
}
