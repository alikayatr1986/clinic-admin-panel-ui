import { useFieldArray, Controller } from 'react-hook-form';
import type {
  GalleryContentStatsFieldsProps,
  StatisticsFieldError,
} from '../../types/gallery.content.types';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '../GalleryFieldError';

export function GalleryContentStatsFields({
  locale, control, serverErrors, clientErrors, disabled,
}: GalleryContentStatsFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'statistics' });
  const statsClientError = clientErrors?.statistics?.root?.message ||
    (clientErrors?.statistics as StatisticsFieldError | undefined)?.message;

  return (
    <fieldset className="space-y-4">
      <legend className="font-semibold">Statistics (optional, maximum three)</legend>
      <p className="text-sm text-slate-600">Statistics appear in the order shown.</p>
      <FieldError name="statistics" errors={serverErrors} clientError={statsClientError} />
      {fields.map((field, index) => (
        <Card key={field.id} className="space-y-3 p-4">
          <CardTitle className="text-base font-medium">Statistic {index + 1}</CardTitle>
          {(['key', 'value', 'label'] as const).map((key) => {
            const name = `statistics.${index}.${key}`;
            const err = serverErrors[name] || clientErrors?.statistics?.[index]?.[key]?.message;
            return (
              <div key={key}>
                <Label htmlFor={`${locale}-stat-${index}-${key}`} className="block text-sm font-medium capitalize">
                  {key}
                </Label>
                <Controller
                  name={`statistics.${index}.${key}`}
                  control={control}
                  render={({ field: inputField }) => (
                    <Input
                      id={`${locale}-stat-${index}-${key}`}
                      lang={locale}
                      dir={locale === 'ar' ? 'rtl' : 'ltr'}
                      {...inputField}
                      aria-invalid={Boolean(err)}
                      className="mt-2"
                    />
                  )}
                />
                <FieldError name={name} errors={serverErrors} clientError={clientErrors?.statistics?.[index]?.[key]?.message} />
              </div>
            );
          })}
          <Button type="button" variant="outline" disabled={disabled} onClick={() => remove(index)}>
            Remove statistic {index + 1}
          </Button>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={disabled || fields.length >= 3}
        onClick={() => append({ key: '', value: '', label: '' })}
      >
        Add statistic
      </Button>
    </fieldset>
  );
}
