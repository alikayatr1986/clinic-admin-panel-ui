import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { TimeframeFormDialogProps } from "../types/settings.types";

export function TimeframeFormDialog({
  isOpen,
  timeframe,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: TimeframeFormDialogProps) {
  const isEditing = timeframe !== null;
  const isReferenced = isEditing && timeframe.referenced_cases_count > 0;

  const [code, setCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [minMonths, setMinMonths] = useState(0);
  const [isOpenEnded, setIsOpenEnded] = useState(false);
  const [maxMonths, setMaxMonths] = useState<number | null>(3);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<
    | "code"
    | "name_en"
    | "name_ar"
    | "min_months"
    | "max_months"
    | "range"
    | null
  >(null);

  useEffect(() => {
    if (timeframe) {
      setCode(timeframe.code);
      setNameEn(timeframe.name_en);
      setNameAr(timeframe.name_ar);
      setMinMonths(timeframe.min_months);
      setIsOpenEnded(timeframe.max_months === null);
      setMaxMonths(timeframe.max_months);
      setDisplayOrder(timeframe.display_order);
    } else {
      setCode("");
      setNameEn("");
      setNameAr("");
      setMinMonths(0);
      setIsOpenEnded(false);
      setMaxMonths(3);
      setDisplayOrder(1);
    }
    setLocalError(null);
    setErrorField(null);
  }, [timeframe, isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);
    setErrorField(null);

    const trimmedEn = nameEn.trim();
    const trimmedAr = nameAr.trim();
    if (!trimmedEn) {
      setLocalError("English label is required.");
      setErrorField("name_en");
      return;
    }
    if (!trimmedAr) {
      setLocalError("Arabic label is required.");
      setErrorField("name_ar");
      return;
    }

    if (!isEditing) {
      const trimmedCode = code.trim();
      if (!trimmedCode || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(trimmedCode)) {
        setLocalError(
          "Code must be lowercase alphanumeric with hyphens (e.g., 0-3-months).",
        );
        setErrorField("code");
        return;
      }
    }

    if (minMonths < 0) {
      setLocalError("Minimum months must be 0 or greater.");
      setErrorField("min_months");
      return;
    }

    if (!isOpenEnded && (maxMonths === null || Number.isNaN(maxMonths))) {
      setLocalError("Maximum months is required when not open-ended.");
      setErrorField("max_months");
      return;
    }

    const resolvedMax = isOpenEnded ? null : maxMonths;
    if (resolvedMax !== null && resolvedMax <= minMonths) {
      setLocalError(
        "Maximum months must be strictly greater than minimum months.",
      );
      setErrorField("range");
      return;
    }

    onSubmit({
      code: isEditing ? undefined : code.trim(),
      name_en: trimmedEn,
      name_ar: trimmedAr,
      min_months: minMonths,
      max_months: resolvedMax,
      display_order: displayOrder,
    });
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
            {isEditing ? "Edit Timeframe Option" : "Create Timeframe Option"}
          </DialogTitle>
          <DialogDescription>
            Configure clinical timeframe intervals for post-op photo
            categorization.
          </DialogDescription>
        </DialogHeader>

        {(error || localError) && (
          <div
            id="timeframe-error"
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {localError || error}
          </div>
        )}

        {isReferenced && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Range boundaries are locked because this timeframe is referenced by{" "}
            {timeframe.referenced_cases_count} gallery case(s). To modify the
            range, retire this option and create a replacement.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tf-code">Code (slug identifier)</Label>
            <Input
              id="tf-code"
              type="text"
              disabled={isEditing || isSubmitting}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errorField === "code") setErrorField(null);
              }}
              placeholder="e.g. 18-24-months"
              className="font-mono"
              aria-invalid={errorField === "code" ? true : undefined}
              aria-describedby={
                errorField === "code" ? "timeframe-error" : undefined
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tf-name-en">English Label</Label>
              <Input
                id="tf-name-en"
                type="text"
                disabled={isSubmitting}
                value={nameEn}
                onChange={(e) => {
                  setNameEn(e.target.value);
                  if (errorField === "name_en") setErrorField(null);
                }}
                placeholder="e.g. 18–24 Months"
                aria-invalid={errorField === "name_en" ? true : undefined}
                aria-describedby={
                  errorField === "name_en" ? "timeframe-error" : undefined
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tf-name-ar">Arabic Label</Label>
              <Input
                id="tf-name-ar"
                type="text"
                dir="rtl"
                disabled={isSubmitting}
                value={nameAr}
                onChange={(e) => {
                  setNameAr(e.target.value);
                  if (errorField === "name_ar") setErrorField(null);
                }}
                placeholder="e.g. ١٨-٢٤ شهراً"
                className="font-arabic"
                aria-invalid={errorField === "name_ar" ? true : undefined}
                aria-describedby={
                  errorField === "name_ar" ? "timeframe-error" : undefined
                }
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Clinical Interval [min, max) Months
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tf-min" className="text-xs">
                  Min Months (≥ 0)
                </Label>
                <Input
                  id="tf-min"
                  type="number"
                  min="0"
                  disabled={isReferenced || isSubmitting}
                  value={minMonths}
                  onChange={(e) => {
                    setMinMonths(
                      Math.max(0, parseInt(e.target.value, 10) || 0),
                    );
                    if (errorField === "min_months" || errorField === "range")
                      setErrorField(null);
                  }}
                  className="font-mono"
                  aria-invalid={
                    errorField === "min_months" || errorField === "range"
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    errorField === "min_months" || errorField === "range"
                      ? "timeframe-error"
                      : undefined
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tf-max" className="text-xs">
                  Max Months (&gt; min)
                </Label>
                <Input
                  id="tf-max"
                  type="number"
                  min={minMonths + 1}
                  disabled={isReferenced || isOpenEnded || isSubmitting}
                  value={isOpenEnded ? "" : (maxMonths ?? "")}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setMaxMonths(Number.isNaN(parsed) ? null : parsed);
                    if (errorField === "max_months" || errorField === "range")
                      setErrorField(null);
                  }}
                  placeholder={isOpenEnded ? "∞ (open-ended)" : "e.g. 24"}
                  className="font-mono"
                  aria-invalid={
                    errorField === "max_months" || errorField === "range"
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    errorField === "max_months" || errorField === "range"
                      ? "timeframe-error"
                      : undefined
                  }
                />
              </div>
            </div>

            <div className="pt-1">
              <Checkbox
                id="tf-open-ended"
                label={
                  <>
                    Open-ended upper boundary (e.g. &ldquo;12+ months&rdquo;
                    [min, ∞))
                  </>
                }
                disabled={isReferenced || isSubmitting}
                checked={isOpenEnded}
                onChange={(e) => {
                  setIsOpenEnded(e.target.checked);
                  if (e.target.checked) setMaxMonths(null);
                  else setMaxMonths(minMonths + 3);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tf-order">Display Sort Order</Label>
            <Input
              id="tf-order"
              type="number"
              disabled={isSubmitting}
              value={displayOrder}
              onChange={(e) =>
                setDisplayOrder(parseInt(e.target.value, 10) || 1)
              }
              className="w-24 font-mono"
            />
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : isEditing
                  ? "Update Timeframe"
                  : "Create Draft Timeframe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
