import { useEffect, useState } from "react";
import type { GalleryThumbnailProps } from "../types/gallery.types";

export function GalleryCaseThumbnail({ item }: GalleryThumbnailProps) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [item.thumbnail_url]);
  const enAlt = item.captions.find(
    (caption) => caption.lang === "en",
  )?.alt_text;
  if (!item.media_ready || !item.thumbnail_url || broken) {
    return (
      <div className="flex min-h-36 items-center justify-center rounded-lg bg-slate-100 px-3 text-center text-sm text-slate-600">
        {broken ? "Image unavailable" : "No image uploaded"}
      </div>
    );
  }
  const beforeLeft = item.before_position === "left";
  const beforeRight = item.before_position === "right";
  return (
    <div className="relative overflow-hidden rounded-lg bg-slate-100">
      <img
        src={item.thumbnail_url}
        alt={enAlt || "Combined before and after clinical image"}
        width={item.width || undefined}
        height={item.height || undefined}
        loading="lazy"
        onError={() => setBroken(true)}
        className="aspect-[3/2] w-full object-contain"
      />
      {(beforeLeft || beforeRight) && (
        <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs font-semibold text-white">
          <span>{beforeLeft ? "Before" : "After"}</span>
          <span>{beforeLeft ? "After" : "Before"}</span>
        </div>
      )}
    </div>
  );
}
