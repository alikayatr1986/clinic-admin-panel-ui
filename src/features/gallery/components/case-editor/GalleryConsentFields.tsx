import { Controller } from 'react-hook-form';
import type { GalleryConsentFieldsProps } from '../../types/gallery.case-editor.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '../GalleryFieldError';

export function GalleryConsentFields({
  register,
  control,
  serverErrors,
  clientErrors,
  onConsentChange,
}: GalleryConsentFieldsProps) {
  return (
    <>
      <div className="sm:col-span-2">
        <Label htmlFor="signed-consent" className="block text-sm font-medium">
          Signed consent reference
        </Label>
        <Controller
          control={control}
          name="signedConsentID"
          render={({ field }) => (
            <Input
              id="signed-consent"
              {...field}
              onChange={(e) => {
                field.onChange(e);
                onConsentChange(e.target.value);
              }}
              className="mt-2"
            />
          )}
        />
        <FieldError
          name="signed_consent_id"
          errors={serverErrors}
          clientError={clientErrors?.signedConsentID?.message}
        />
      </div>
      <Label className="flex items-start gap-3 sm:col-span-2">
        <input
          type="checkbox"
          {...register('consentVerified')}
          className="mt-1"
        />
        <span>I verified this reference against the clinic-held signed permission.</span>
      </Label>
      <FieldError
        name="consent_verified"
        errors={serverErrors}
        clientError={clientErrors?.consentVerified?.message}
      />
    </>
  );
}
