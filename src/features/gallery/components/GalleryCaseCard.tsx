import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GalleryCardProps } from "../types/gallery.types";
import { labelFor } from "./gallery.list.utils";
import { GalleryCaseThumbnail } from "./GalleryCaseThumbnail";

export function GalleryCaseCard({ item, options, search, onEdit }: GalleryCardProps) {
  const enReview =
    item.captions.find((caption) => caption.lang === "en")?.approval ??
    "missing";
  const arReview =
    item.captions.find((caption) => caption.lang === "ar")?.approval ??
    "missing";
  const updated = new Date(item.updated_at);
  return (
    <li>
      <Card className="grid gap-5 p-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <GalleryCaseThumbnail item={item} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="break-all text-lg font-semibold">Case {item.id}</CardTitle>
            <Badge variant={item.published ? "default" : "secondary"}>
              {item.published ? "Published" : "Unpublished"}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">Procedure</dt>
              <dd>{labelFor(item.procedure_tag, options.procedures)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Timeframe</dt>
              <dd>{labelFor(item.timeframe_badge, options.timeframes)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Display order</dt>
              <dd>{item.display_order}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Updated</dt>
              <dd>
                {Number.isNaN(updated.getTime())
                  ? "Unknown"
                  : updated.toLocaleString("en")}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Content review</dt>
              <dd>EN: {enReview} · AR: {arReview}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Visual review</dt>
              <dd>{item.crop_attested ? "Attested" : "Pending"}</dd>
            </div>
          </dl>
          {!item.before_position && item.media_ready && (
            <p className="mt-3 text-sm text-amber-800">
              Before/after side order not set.
            </p>
          )}
          {onEdit && (
            <Button asChild variant="outline" className="mt-4">
              <a
                href={`/admin/gallery/${encodeURIComponent(item.id)}?returnTo=${encodeURIComponent("/admin/gallery" + search)}`}
                onClick={(event) => {
                  if (
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey &&
                    event.button === 0
                  ) {
                    event.preventDefault();
                    onEdit(item.id);
                  }
                }}
              >
                View case
              </a>
            </Button>
          )}
        </div>
      </Card>
    </li>
  );
}
