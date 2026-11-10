import type { GalleryCaptionsCardProps } from '../../types/gallery.case-editor.types';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FieldError } from '../GalleryFieldError';

export function GalleryCaptionsCard({ register, serverErrors, clientErrors }: GalleryCaptionsCardProps) {
  return (
    <Card className="p-6">
      <CardTitle className="text-xl">Bilingual image descriptions</CardTitle>
      <CardDescription className="mt-2">
        Descriptions are optional. If you add a caption or approve a language, provide its image description. Save changes as drafts, then review and approve them in a second save before publishing.
      </CardDescription>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {(['en', 'ar'] as const).map((lang) => (
          <Card key={lang} className="p-4">
            <h3 className="font-semibold">{lang === 'en' ? 'English' : 'Arabic'}</h3>
            <div className="mt-3">
              <Label htmlFor={`${lang}-alt`} className="block text-sm font-medium">
                {lang.toUpperCase()} image description
              </Label>
              <Textarea
                id={`${lang}-alt`}
                lang={lang}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                rows={3}
                className="mt-2"
                {...register(`captions.${lang}.altText`)}
              />
              <FieldError
                name={`captions.${lang}.alt_text`}
                errors={serverErrors}
                clientError={clientErrors?.captions?.[lang]?.altText?.message}
              />
            </div>
            <div className="mt-4">
              <Label htmlFor={`${lang}-caption`} className="block text-sm font-medium">
                {lang.toUpperCase()} caption
              </Label>
              <Textarea
                id={`${lang}-caption`}
                lang={lang}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                rows={3}
                className="mt-2"
                {...register(`captions.${lang}.caption`)}
              />
              <FieldError
                name={`captions.${lang}.caption`}
                errors={serverErrors}
                clientError={clientErrors?.captions?.[lang]?.caption?.message}
              />
            </div>
            <div className="mt-4">
              <Checkbox {...register(`captions.${lang}.approved`)} label={`${lang.toUpperCase()} description reviewed and approved`} />
            </div>
            <FieldError
              name={`captions.${lang}.approval`}
              errors={serverErrors}
              clientError={clientErrors?.captions?.[lang]?.approved?.message}
            />
          </Card>
        ))}
      </div>
    </Card>
  );
}
