import { useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { Button } from '@/components/ui/button';
import { BlogCategorySettings } from '../components/BlogCategorySettings';
import { ActivationAttestationDialog } from '../components/ActivationAttestationDialog';
import { ProcedureFormDialog } from '../components/ProcedureFormDialog';
import { ProcedureSettingsTable } from '../components/ProcedureSettingsTable';
import { VerificationSettings } from '../components/VerificationSettings';
import { SettingsTabs } from '../components/SettingsTabs';
import { TimeframeFormDialog } from '../components/TimeframeFormDialog';
import { TimeframeSettingsTable } from '../components/TimeframeSettingsTable';
import {
  useCreateProcedureMutation,
  useProcedureActionMutation,
  useProcedureSettingsQuery,
  useActivateTimeframeMutation,
  useCreateTimeframeMutation,
  useDeleteTimeframeMutation,
  useReorderProceduresMutation,
  useReorderTimeframesMutation,
  useRetireTimeframeMutation,
  useTimeframeSettingsQuery,
  useUpdateProcedureMutation,
  useUpdateTimeframeMutation,
} from '../hooks/useSettings';
import type {
  ProcedureFormData,
  ProcedureSetting,
  CreateTimeframeInput,
  SettingsPageProps,
  SettingsTabKey,
  TimeframeFormData,
  TimeframeSetting,
  UpdateTimeframeInput,
} from '../types/settings.types';

export function SettingsPage({ role = 'admin', onExpired }: SettingsPageProps) {
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('timeframes');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingTimeframe, setEditingTimeframe] = useState<TimeframeSetting | null>(null);

  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
  const [activatingTimeframe, setActivatingTimeframe] = useState<TimeframeSetting | null>(null);

  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const procedureQuery = useProcedureSettingsQuery();
  const createProcedureMutation = useCreateProcedureMutation();
  const updateProcedureMutation = useUpdateProcedureMutation();
  const procedureActionMutation = useProcedureActionMutation();
  const reorderProceduresMutation = useReorderProceduresMutation();
  const procedureBusy = createProcedureMutation.isPending || updateProcedureMutation.isPending || procedureActionMutation.isPending || reorderProceduresMutation.isPending;
  const [procedureFormOpen, setProcedureFormOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<ProcedureSetting | null>(null);
  const procedures = procedureQuery.data?.data ?? [];
  const runProcedure = async (operation: () => Promise<unknown>) => {
    setPageError(null);
    try { await operation(); return true; }
    catch (err) { setPageError(err instanceof ApiError ? err.message : 'Failed to update procedure.'); return false; }
  };
  const submitProcedure = async (input: ProcedureFormData) => {
    const ok = await runProcedure(() => editingProcedure
      ? updateProcedureMutation.mutateAsync({ id: editingProcedure.id, input: { name_en: input.name_en, name_ar: input.name_ar, display_order: input.display_order } })
      : createProcedureMutation.mutateAsync(input));
    if (ok) setProcedureFormOpen(false);
  };
  const query = useTimeframeSettingsQuery('all');
  const createMutation = useCreateTimeframeMutation();
  const updateMutation = useUpdateTimeframeMutation();
  const activateMutation = useActivateTimeframeMutation();
  const retireMutation = useRetireTimeframeMutation();
  const deleteMutation = useDeleteTimeframeMutation();
  const reorderMutation = useReorderTimeframesMutation();

  useEffect(() => {
    if ((query.error instanceof ApiError && query.error.status === 401 || procedureQuery.error instanceof ApiError && procedureQuery.error.status === 401) && onExpired) {
      onExpired();
    }
  }, [query.error, procedureQuery.error, onExpired]);

  const timeframes = query.data?.data ?? [];

  const handleOpenCreate = () => {
    setEditingTimeframe(null);
    setDialogError(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (tf: TimeframeSetting) => {
    setEditingTimeframe(tf);
    setDialogError(null);
    setFormDialogOpen(true);
  };

  const handleOpenActivate = (tf: TimeframeSetting) => {
    setActivatingTimeframe(tf);
    setDialogError(null);
    setActivationDialogOpen(true);
  };

  const handleFormSubmit = async (formData: TimeframeFormData) => {
    setDialogError(null);
    try {
      if (editingTimeframe) {
        const updatePayload: UpdateTimeframeInput = {
          name_en: formData.name_en,
          name_ar: formData.name_ar,
          min_months: formData.min_months,
          max_months: formData.max_months,
          display_order: formData.display_order,
        };
        await updateMutation.mutateAsync({ id: editingTimeframe.id, input: updatePayload });
      } else {
        const createPayload: CreateTimeframeInput = {
          code: formData.code ?? '',
          name_en: formData.name_en,
          name_ar: formData.name_ar,
          min_months: formData.min_months,
          max_months: formData.max_months,
          display_order: formData.display_order,
        };
        await createMutation.mutateAsync(createPayload);
      }
      setFormDialogOpen(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.fields?.detail === 'cannot_modify_referenced_range') {
          setDialogError('Cannot modify range for a timeframe referenced by gallery cases.');
          return;
        }
        if (err.fields?.detail === 'overlapping_active_range') {
          setDialogError('The specified range overlaps with an existing active timeframe.');
          return;
        }
        setDialogError(err.message);
      } else {
        setDialogError('An unexpected error occurred.');
      }
    }
  };

  const handleConfirmActivate = async (attestation: string) => {
    if (!activatingTimeframe) return;
    setDialogError(null);
    try {
      await activateMutation.mutateAsync({
        id: activatingTimeframe.id,
        input: { approval_attestation: attestation },
      });
      setActivationDialogOpen(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.fields?.detail === 'overlapping_active_range') {
          setDialogError('Cannot activate: this timeframe range overlaps with an existing active timeframe.');
          return;
        }
        setDialogError(err.message);
      } else {
        setDialogError('Failed to activate timeframe.');
      }
    }
  };

  const handleRetire = async (tf: TimeframeSetting) => {
    if (!window.confirm(`Are you sure you want to retire timeframe "${tf.name_en}"?`)) {
      return;
    }
    setPageError(null);
    try {
      await retireMutation.mutateAsync(tf.id);
    } catch (err: unknown) {
      setPageError(err instanceof ApiError ? err.message : 'Failed to retire timeframe.');
    }
  };

  const handleDelete = async (tf: TimeframeSetting) => {
    if (!window.confirm(`Are you sure you want to delete draft timeframe "${tf.name_en}"?`)) {
      return;
    }
    setPageError(null);
    try {
      await deleteMutation.mutateAsync(tf.id);
    } catch (err: unknown) {
      setPageError(err instanceof ApiError ? err.message : 'Failed to delete timeframe.');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= timeframes.length) return;

    const reordered = [...timeframes];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const orderedIds = reordered.map((t: TimeframeSetting) => t.id);
    try {
      await reorderMutation.mutateAsync(orderedIds);
    } catch (err: unknown) {
      setPageError(err instanceof ApiError ? err.message : 'Failed to reorder timeframes.');
    }
  };

  return (
    <section className="space-y-6" aria-label="Settings administration">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinic Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure clinical timeframe vocabularies, procedure options, and clinic catalogs.
          </p>
        </div>

        {isAdmin && activeTab !== 'categories' && activeTab !== 'verification' && (
          <Button
            type="button"
            onClick={() => {
              if (activeTab === 'procedures') {
                setEditingProcedure(null);
                setProcedureFormOpen(true);
              } else {
                handleOpenCreate();
              }
            }}
          >
            Add {activeTab === 'procedures' ? 'Procedure' : 'Timeframe'}
          </Button>
        )}
      </div>

      {!isAdmin && (
        <div role="status" className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Staff Read-Only Mode:</span> You have visibility into clinic settings. Administrative privileges are required to add, edit, or activate settings.
        </div>
      )}

      {pageError && (
        <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {pageError}
        </div>
      )}

      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'timeframes' && (
        <div id="timeframes-panel" role="tabpanel" aria-labelledby="tab-timeframes" className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Timeframe measures elapsed months from surgery to post-op photograph.
            </span>
            <span className="font-mono">
              Active intervals are strictly non-overlapping [min, max)
            </span>
          </div>

          <TimeframeSettingsTable
            timeframes={timeframes}
            role={role}
            isLoading={query.isLoading}
            onEdit={handleOpenEdit}
            onActivate={handleOpenActivate}
            onRetire={handleRetire}
            onDelete={handleDelete}
            onMoveUp={(index: number) => void handleMove(index, 'up')}
            onMoveDown={(index: number) => void handleMove(index, 'down')}
          />
        </div>
      )}

      <div id="verification-panel" role="tabpanel" aria-labelledby="tab-verification" hidden={activeTab !== 'verification'}><VerificationSettings role={role} onExpired={onExpired} /></div>

      {activeTab === 'categories' && <div id="categories-panel" role="tabpanel" aria-labelledby="tab-categories"><BlogCategorySettings role={role} onExpired={onExpired} /></div>}

      {activeTab === 'procedures' && (
        <div id="procedures-panel" role="tabpanel" aria-labelledby="tab-procedures">
          {procedureQuery.isLoading ? <p role="status">Loading procedures…</p> : procedureQuery.isError ? <p role="alert">Failed to load procedures.</p> :
            <ProcedureSettingsTable procedures={procedures} role={role}
              onEdit={procedure => { setEditingProcedure(procedure); setProcedureFormOpen(true); }}
              onActivate={procedure => void runProcedure(() => procedureActionMutation.mutateAsync({ id: procedure.id, action: 'activate' }))}
              onRetire={procedure => { if (window.confirm(`Retire procedure "${procedure.name_en}"?`)) void runProcedure(() => procedureActionMutation.mutateAsync({ id: procedure.id, action: 'retire' })); }}
              onDelete={procedure => { if (window.confirm(`Delete draft procedure "${procedure.name_en}"?`)) void runProcedure(() => procedureActionMutation.mutateAsync({ id: procedure.id, action: 'delete' })); }}
              onMove={(index, direction) => {
                const target = index + (direction === 'up' ? -1 : 1);
                if (target < 0 || target >= procedures.length) return;
                const ordered = [...procedures];
                [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
                void runProcedure(() => reorderProceduresMutation.mutateAsync({ orderedIds: ordered.map(item => item.id) }));
              }} />}
        </div>
      )}
      {procedureFormOpen && <ProcedureFormDialog procedure={editingProcedure} isSubmitting={procedureBusy} error={pageError} onClose={() => setProcedureFormOpen(false)} onSubmit={data => void submitProcedure(data)} />}

      <TimeframeFormDialog
        isOpen={formDialogOpen}
        timeframe={editingTimeframe}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={dialogError}
        onClose={() => setFormDialogOpen(false)}
        onSubmit={(data: TimeframeFormData) => void handleFormSubmit(data)}
      />

      <ActivationAttestationDialog
        isOpen={activationDialogOpen}
        timeframe={activatingTimeframe}
        isSubmitting={activateMutation.isPending}
        error={dialogError}
        onClose={() => setActivationDialogOpen(false)}
        onConfirm={(attestation: string) => void handleConfirmActivate(attestation)}
      />
    </section>
  );
}

