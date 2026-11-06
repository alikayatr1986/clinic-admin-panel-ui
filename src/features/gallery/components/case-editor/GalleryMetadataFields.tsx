import { Controller } from 'react-hook-form';
import type { GalleryMetadataFieldsProps } from '../../types/gallery.case-editor.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '../GalleryFieldError';

export function GalleryMetadataFields({
  register,
  control,
  displayOrderError,
  serverErrors,
  clientErrors,
  options,
}: GalleryMetadataFieldsProps) {
  const selectClass = 'mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';

  return (
    <>
      <div>
        <Label htmlFor="procedure-tag" className="block text-sm font-medium">Procedure</Label>
        <select id="procedure-tag" {...register('procedureTag')} className={selectClass}>
          <option value="">Choose procedure</option>
          {options.procedures.map((c) => (
            <option key={c.code} value={c.code}>{c.en}</option>
          ))}
        </select>
        <FieldError
          name="procedure_tag"
          errors={serverErrors}
          clientError={clientErrors?.procedureTag?.message}
        />
      </div>
      <div>
        <Label htmlFor="timeframe-badge" className="block text-sm font-medium">Timeframe</Label>
        <Controller
          control={control}
          name="timeframeBadge"
          render={({ field }) => (
            <select id="timeframe-badge" {...field} className={selectClass}>
              <option value="">Choose timeframe</option>
              {options.timeframes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.en}{c.retired || c.status === 'retired' ? ' (Retired)' : ''}
                </option>
              ))}
              {field.value && !options.timeframes.some((c) => c.code === field.value) && (
                <option key={field.value} value={field.value}>{field.value} (Retired)</option>
              )}
            </select>
          )}
        />
        <FieldError
          name="timeframe_badge"
          errors={serverErrors}
          clientError={clientErrors?.timeframeBadge?.message}
        />
      </div>
      <div>
        <Label htmlFor="before-position" className="block text-sm font-medium">Before image position</Label>
        <select id="before-position" {...register('beforePosition')} className={selectClass}>
          <option value="">Choose side</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
        <FieldError
          name="before_position"
          errors={serverErrors}
          clientError={clientErrors?.beforePosition?.message}
        />
      </div>
      <div>
        <Label htmlFor="display-order" className="block text-sm font-medium">Display order</Label>
        <Input id="display-order" type="number" step="1" {...register('displayOrder')} className="mt-2" />
        <FieldError
          name="display_order"
          errors={serverErrors}
          clientError={displayOrderError || clientErrors?.displayOrder?.message}
        />
      </div>
      <Label className="flex items-start gap-3 sm:col-span-2">
        <input type="checkbox" {...register('cropAttested')} className="mt-1" />
        <span>I reviewed image orientation, before/after identity, and publication suitability.</span>
      </Label>
      <FieldError
        name="crop_attested"
        errors={serverErrors}
        clientError={clientErrors?.cropAttested?.message}
      />
    </>
  );
}
