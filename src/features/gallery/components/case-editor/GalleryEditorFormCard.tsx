import type { GalleryEditorFormCardProps } from '../../types/gallery.case-editor.types';
import { GalleryDetailsCard } from './GalleryDetailsCard';
import { GalleryCaptionsCard } from './GalleryCaptionsCard';
import { Button } from '@/components/ui/button';

export function GalleryEditorFormCard({
  onSubmit,
  register,
  control,
  displayOrderError,
  serverErrors,
  clientErrors,
  options,
  onConsentChange,
  busy,
  isDirty,
}: GalleryEditorFormCardProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <GalleryDetailsCard
        register={register}
        control={control}
        displayOrderError={displayOrderError}
        serverErrors={serverErrors}
        clientErrors={clientErrors}
        options={options}
        onConsentChange={onConsentChange}
      />
      <GalleryCaptionsCard
        register={register}
        serverErrors={serverErrors}
        clientErrors={clientErrors}
      />
      <Button type="submit" variant="default" disabled={busy !== null || !isDirty}>
        {busy === 'save' ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
