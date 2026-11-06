import { Controller } from 'react-hook-form';
import type { GalleryContentFormCardProps } from '../../types/gallery.content.types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FieldError } from '../GalleryFieldError';
import { GalleryContentStatsFields } from './GalleryContentStatsFields';
import { GalleryContentConflictAlert } from './GalleryContentConflictAlert';

export function GalleryContentFormCard({ locale, form: formState, storageError }: GalleryContentFormCardProps) {
  const {
    form, revision, status, conflict, recovering, serverErrors, errorMessage,
    noticeMessage, isDirty, isPending, submittingApproval, submit, recover,
  } = formState;
  const { control, formState: { errors } } = form;
  const activeError = errorMessage || storageError;

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">Revision {revision} · {status ? `Status: ${status}` : 'New empty draft'}</p>
      <p className="text-sm text-slate-600">Draft changes are not public. The last approved version remains public until you publish.</p>
      {isDirty && <p role="status" className="text-sm text-amber-900">You have unsaved changes.</p>}
      {activeError && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">{activeError}</div>}
      {conflict && <GalleryContentConflictAlert recovering={recovering} onReload={() => void recover(true)} onReapply={() => void recover(false)} />}
      {noticeMessage && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-green-900">{noticeMessage}</p>}

      <Card className="p-6">
        <form onSubmit={(e) => { e.preventDefault(); void submit('draft'); }} noValidate>
          <fieldset disabled={isPending || recovering} className="space-y-5">
            <div>
              <Label htmlFor={`${locale}-eyebrow`} className="block text-sm font-medium capitalize">Eyebrow</Label>
              <Controller
                name="eyebrow"
                control={control}
                render={({ field }) => (
                  <Input
                    id={`${locale}-eyebrow`}
                    lang={locale}
                    dir={locale === 'ar' ? 'rtl' : 'ltr'}
                    aria-invalid={Boolean(serverErrors.eyebrow || errors.eyebrow)}
                    className="mt-2"
                    {...field}
                  />
                )}
              />
              <FieldError name="eyebrow" errors={serverErrors} clientError={errors.eyebrow?.message} />
            </div>

            {(['heading', 'introduction'] as const).map((key) => (
              <div key={key}>
                <Label htmlFor={`${locale}-${key}`} className="block text-sm font-medium capitalize">{key}</Label>
                <Controller
                  name={key}
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id={`${locale}-${key}`}
                      lang={locale}
                      dir={locale === 'ar' ? 'rtl' : 'ltr'}
                      rows={key === 'introduction' ? 4 : 2}
                      aria-invalid={Boolean(serverErrors[key] || errors[key])}
                      className="mt-2"
                      {...field}
                    />
                  )}
                />
                <FieldError name={key} errors={serverErrors} clientError={errors[key]?.message} />
              </div>
            ))}

            <GalleryContentStatsFields
              locale={locale}
              control={control}
              serverErrors={serverErrors}
              clientErrors={errors}
              disabled={isPending || recovering}
            />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="outline" disabled={isPending || conflict}>
                {submittingApproval === 'draft' ? 'Saving…' : 'Save draft'}
              </Button>
              <Button type="button" variant="default" disabled={isPending || conflict} onClick={() => void submit('approved')}>
                {submittingApproval === 'approved' ? 'Publishing…' : 'Publish reviewed content'}
              </Button>
            </div>
          </fieldset>
        </form>
      </Card>
    </div>
  );
}
