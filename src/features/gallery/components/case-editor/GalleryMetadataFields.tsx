import { Controller } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import type { GalleryMetadataFieldsProps } from '../../types/gallery.case-editor.types';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  const selectWrapperClass = 'relative mt-2 rounded-md border border-slate-300 bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring';
  const selectClass = 'w-full appearance-none bg-transparent py-2 pl-3 pr-10 text-sm focus:outline-none';

  return (
    <>
      <div>
        <Label htmlFor="procedure-tag" className="block text-sm font-medium">Procedure</Label>
        <div className={selectWrapperClass}>
          <select id="procedure-tag" {...register('procedureTag')} className={selectClass}>
            <option value="">Choose procedure</option>
            {options.procedures.map((c) => (
              <option key={c.code} value={c.code}>{c.en}</option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-[8px] top-1/2 size-4 -translate-y-1/2" />
        </div>
        <FieldError
          name="procedure_tag"
          errors={serverErrors}
          clientError={clientErrors?.procedureTag?.message}
        />
      </div>
      <div>
        <Label htmlFor="timeframe-badge" className="block text-sm font-medium">Timeframe</Label>
        <div className={selectWrapperClass}>
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
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-[8px] top-1/2 size-4 -translate-y-1/2" />
        </div>
        <FieldError
          name="timeframe_badge"
          errors={serverErrors}
          clientError={clientErrors?.timeframeBadge?.message}
        />
      </div>
      <div>
        <Label htmlFor="before-position" className="block text-sm font-medium">Before image position</Label>
        <div className={selectWrapperClass}>
          <select id="before-position" {...register('beforePosition')} className={selectClass}>
            <option value="">Choose side</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-[8px] top-1/2 size-4 -translate-y-1/2" />
        </div>
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
      <div className="sm:col-span-2">
        <Checkbox {...register('cropAttested')} label="I reviewed image orientation, before/after identity, and publication suitability." />
      </div>
      <FieldError
        name="crop_attested"
        errors={serverErrors}
        clientError={clientErrors?.cropAttested?.message}
      />
    </>
  );
}
