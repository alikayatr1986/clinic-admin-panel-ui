import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { GalleryCaseFilterBarProps } from "../types/gallery.list.types";

export function GalleryCaseFilterBar({
  options,
  invalid,
  status,
  procedure,
  timeframe,
  onChangeFilter,
  onClearFilters,
}: GalleryCaseFilterBarProps) {
  return (
    <Card className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label htmlFor="gallery-status" className="block text-sm font-medium">
          Status
        </Label>
        <select
          id="gallery-status"
          value={invalid ? "" : status}
          onChange={(event) => onChangeFilter("status", event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="unpublished">Unpublished</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div>
        <Label htmlFor="gallery-procedure" className="block text-sm font-medium">
          Procedure
        </Label>
        <select
          id="gallery-procedure"
          value={invalid ? "" : procedure}
          onChange={(event) =>
            onChangeFilter("procedure_tag", event.target.value)
          }
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All procedures</option>
          {options.procedures.map((item) => (
            <option key={item.code} value={item.code}>
              {item.en}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="gallery-timeframe" className="block text-sm font-medium">
          Timeframe
        </Label>
        <select
          id="gallery-timeframe"
          value={invalid ? "" : timeframe}
          onChange={(event) =>
            onChangeFilter("timeframe_badge", event.target.value)
          }
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All timeframes</option>
          {options.timeframes.map((item) => {
            const isRetired = item.retired || item.status === "retired";
            return (
              <option key={item.code} value={item.code}>
                {item.en}
                {isRetired ? " (Retired)" : ""}
              </option>
            );
          })}
        </select>
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClearFilters}
          className="w-full"
        >
          Clear filters
        </Button>
      </div>
    </Card>
  );
}
