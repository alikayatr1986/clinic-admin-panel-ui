import type { GalleryDetailsCardProps } from '../../types/gallery.case-editor.types';
import { Card, CardTitle } from '@/components/ui/card';
import { GalleryConsentFields } from './GalleryConsentFields';
import { GalleryMetadataFields } from './GalleryMetadataFields';

export function GalleryDetailsCard(props: GalleryDetailsCardProps) {
  return (
    <Card className="p-6">
      <CardTitle className="text-xl">Consent and case details</CardTitle>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <GalleryConsentFields
          register={props.register}
          control={props.control}
          serverErrors={props.serverErrors}
          clientErrors={props.clientErrors}
          onConsentChange={props.onConsentChange}
        />
        <GalleryMetadataFields
          register={props.register}
          control={props.control}
          displayOrderError={props.displayOrderError}
          serverErrors={props.serverErrors}
          clientErrors={props.clientErrors}
          options={props.options}
        />
      </div>
    </Card>
  );
}
