import { useEffect, useState } from "react";
import type { GalleryDetailImageProps } from "../types/gallery.detail.types";

export function GalleryDetailImage({ url, alt, beforePosition }: GalleryDetailImageProps) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (!url || broken) {
    return (
      <div className="flex min-h-36 items-center justify-center rounded-lg bg-slate-100 px-3 text-center text-sm text-slate-600">
        {broken ? "Image unavailable" : "No image uploaded"}
      </div>
    );
  }
  const isLeft = beforePosition === "left";
  return (
    <div className="relative overflow-hidden rounded-lg bg-slate-100">
      <img src={url} alt={alt} onError={() => setBroken(true)} className="max-h-96 w-full object-contain" />
      {(isLeft || beforePosition === "right") && (
        <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs font-semibold text-white">
          <span>{isLeft ? "Before" : "After"}</span>
          <span>{isLeft ? "After" : "Before"}</span>
        </div>
      )}
    </div>
  );
}
