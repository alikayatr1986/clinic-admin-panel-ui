import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { ActivationAttestationDialogProps } from '../types/settings.types';

export function ActivationAttestationDialog({
  isOpen,
  timeframe,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: ActivationAttestationDialogProps) {
  const [attestation, setAttestation] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setAttestation('');
    setLocalError(null);
  }, [isOpen]);

  if (!timeframe) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);
    const trimmed = attestation.trim();
    if (!trimmed) {
      setLocalError('Clinical approval attestation cannot be empty.');
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent
        onEscapeKeyDown={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            Clinical Activation Approval
          </DialogTitle>
          <DialogDescription>
            Activating this timeframe makes it eligible for case publication in the
            production gallery. This action requires explicit verification and approval
            by an authorized clinic representative.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border p-3 space-y-1 text-xs">
          <div className="font-semibold text-foreground">
            {timeframe.name_en} ·{' '}
            <span className="font-arabic" dir="rtl">
              {timeframe.name_ar}
            </span>{' '}
            ({timeframe.code})
          </div>
          <div className="font-mono text-muted-foreground">
            Interval: [{timeframe.min_months},{' '}
            {timeframe.max_months === null ? '∞' : timeframe.max_months}) months
          </div>
        </div>

        {(error || localError) && (
          <div
            id="attestation-error"
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="attestation-input">
              Clinic Representative Approval Attestation
            </Label>
            <Textarea
              id="attestation-input"
              rows={3}
              disabled={isSubmitting}
              value={attestation}
              onChange={(e) => setAttestation(e.target.value)}
              aria-invalid={!!(localError || error)}
              aria-describedby={localError || error ? 'attestation-error' : undefined}
              placeholder="e.g. Approved by Dr. Naserzadeh on 2026-11-05 for clinical post-op tracking"
            />
            <p className="text-xs text-muted-foreground">
              This statement is permanently recorded in the settings audit log alongside
              your administrator identity.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !attestation.trim()}
            >
              {isSubmitting ? 'Activating…' : 'Confirm Clinical Activation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
