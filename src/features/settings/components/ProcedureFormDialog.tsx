import { useEffect, useRef, useState } from 'react';
import type { ProcedureFormDialogProps } from '../types/settings.types';

export function ProcedureFormDialog({ procedure, isSubmitting, error, onClose, onSubmit }: ProcedureFormDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const submittingRef = useRef(isSubmitting);
  closeRef.current = onClose;
  submittingRef.current = isSubmitting;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('input:not(:disabled)')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submittingRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)'));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  const [code, setCode] = useState(procedure?.code ?? '');
  const [nameEN, setNameEN] = useState(procedure?.name_en ?? '');
  const [nameAR, setNameAR] = useState(procedure?.name_ar ?? '');
  const [order, setOrder] = useState(procedure?.display_order ?? 0);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="procedure-dialog-title" className="w-full max-w-lg rounded-lg bg-white p-6">
      <h2 id="procedure-dialog-title" className="text-lg font-semibold">{procedure ? 'Edit Procedure' : 'Add Procedure'}</h2>
      <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); onSubmit({ code, name_en: nameEN, name_ar: nameAR, display_order: order }); }}>
        <label className="block">Code<input className="block w-full border p-2" value={code} onChange={e => setCode(e.target.value)} disabled={!!procedure} required minLength={2} maxLength={50} pattern="[a-z0-9]+([-_][a-z0-9]+)*" /></label>
        <label className="block">English label<input className="block w-full border p-2" value={nameEN} onChange={e => setNameEN(e.target.value)} required maxLength={100} /></label>
        <label className="block">Arabic label<input className="block w-full border p-2" dir="rtl" value={nameAR} onChange={e => setNameAR(e.target.value)} required maxLength={100} /></label>
        <label className="block">Display order<input className="block w-full border p-2" type="number" min={0} value={order} onChange={e => setOrder(Number(e.target.value))} required /></label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose}>Cancel</button><button className="rounded bg-crimson px-4 py-2 text-white" type="submit" disabled={isSubmitting}>Save</button></div>
      </form>
    </div>
  </div>;
}
