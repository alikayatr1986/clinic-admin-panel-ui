import type { ProcedureSettingsTableProps } from '../types/settings.types';

export function ProcedureSettingsTable({ procedures, role, onEdit, onActivate, onRetire, onDelete, onMove }: ProcedureSettingsTableProps) {
  const readOnly = role !== 'admin';
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm" aria-label="Procedures list">
        <thead><tr>{['Order', 'Code', 'English Label', 'Arabic Label', 'Status', 'Leads', 'Cases', 'Actions'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{procedures.map((procedure, index) => {
          const referenced = procedure.referenced_cases_count > 0 || procedure.referenced_leads_count > 0;
          return <tr key={procedure.id} className="border-t border-slate-100">
            <td className="p-3">{procedure.display_order} <button aria-label={`Move ${procedure.code} up`} disabled={readOnly || index === 0} onClick={() => onMove(index, 'up')}>▲</button> <button aria-label={`Move ${procedure.code} down`} disabled={readOnly || index === procedures.length - 1} onClick={() => onMove(index, 'down')}>▼</button></td>
            <td className="p-3">{procedure.code}</td><td className="p-3">{procedure.name_en}</td><td className="p-3" dir="rtl">{procedure.name_ar}</td><td className="p-3">{procedure.status}</td><td className="p-3">{procedure.referenced_leads_count}</td><td className="p-3">{procedure.referenced_cases_count}</td>
            <td className="p-3 space-x-2">
              <button disabled={readOnly} onClick={() => onEdit(procedure)}>Edit</button>
              {procedure.status === 'draft' && <button disabled={readOnly} onClick={() => onActivate(procedure)}>Activate</button>}
              {procedure.status === 'active' && <button disabled={readOnly} onClick={() => onRetire(procedure)}>Retire</button>}
              {procedure.status === 'draft' && <button disabled={readOnly || referenced} title={referenced ? 'Referenced procedures cannot be deleted; retire after activation.' : undefined} onClick={() => onDelete(procedure)}>Delete</button>}
            </td>
          </tr>;
        })}</tbody>
      </table>
      {procedures.length === 0 && <p className="p-6 text-slate-500">No procedures configured yet.</p>}
    </div>
  );
}
