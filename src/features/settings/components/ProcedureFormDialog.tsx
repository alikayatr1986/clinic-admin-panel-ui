import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { ProcedureFormDialogProps } from '../types/settings.types';

export function ProcedureFormDialog({
  procedure,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: ProcedureFormDialogProps) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const nameEnInputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState(procedure?.code ?? '');
  const [nameEN, setNameEN] = useState(procedure?.name_en ?? '');
  const [nameAR, setNameAR] = useState(procedure?.name_ar ?? '');
  const [order, setOrder] = useState(procedure?.display_order ?? 0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<'code' | 'name_en' | 'name_ar' | null>(null);

  useEffect(() => {
    previousActiveElement.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!procedure) {
      codeInputRef.current?.focus();
    } else {
      nameEnInputRef.current?.focus();
    }

    return () => {
      previousActiveElement.current?.focus();
    };
  }, [procedure]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setErrorField(null);

    const trimmedCode = code.trim();
    const trimmedEn = nameEN.trim();
    const trimmedAr = nameAR.trim();

    if (!procedure && !trimmedCode) {
      setLocalError('Code is required.');
      setErrorField('code');
      return;
    }

    if (!trimmedEn) {
      setLocalError('English label is required.');
      setErrorField('name_en');
      return;
    }

    if (!trimmedAr) {
      setLocalError('Arabic label is required.');
      setErrorField('name_ar');
      return;
    }

    onSubmit({
      code: trimmedCode,
      name_en: trimmedEn,
      name_ar: trimmedAr,
      display_order: order,
    });
  };

  return (
    <Dialog
      open={true}
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
            {procedure ? 'Edit Procedure' : 'Add Procedure'}
          </DialogTitle>
          <DialogDescription>
            {procedure
              ? 'Update procedure catalog item and display ordering.'
              : 'Add a new procedure vocabulary item for gallery categorization.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="procedure-code">Code</Label>
            <Input
              id="procedure-code"
              ref={codeInputRef}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errorField === 'code') setErrorField(null);
              }}
              disabled={!!procedure || isSubmitting}
              required
              minLength={2}
              maxLength={50}
              pattern="[a-z0-9]+([-_][a-z0-9]+)*"
              aria-invalid={errorField === 'code' ? true : undefined}
              aria-describedby={errorField === 'code' ? 'procedure-dialog-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="procedure-name-en">English label</Label>
            <Input
              id="procedure-name-en"
              ref={nameEnInputRef}
              value={nameEN}
              onChange={(e) => {
                setNameEN(e.target.value);
                if (errorField === 'name_en') setErrorField(null);
              }}
              disabled={isSubmitting}
              required
              maxLength={100}
              aria-invalid={errorField === 'name_en' ? true : undefined}
              aria-describedby={errorField === 'name_en' ? 'procedure-dialog-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="procedure-name-ar">Arabic label</Label>
            <Input
              id="procedure-name-ar"
              dir="rtl"
              value={nameAR}
              onChange={(e) => {
                setNameAR(e.target.value);
                if (errorField === 'name_ar') setErrorField(null);
              }}
              disabled={isSubmitting}
              required
              maxLength={100}
              aria-invalid={errorField === 'name_ar' ? true : undefined}
              aria-describedby={errorField === 'name_ar' ? 'procedure-dialog-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="procedure-order">Display order</Label>
            <Input
              id="procedure-order"
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              disabled={isSubmitting}
              required
            />
          </div>

          {(error || localError) && (
            <p id="procedure-dialog-error" role="alert" className="text-sm font-medium text-destructive">
              {localError || error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
