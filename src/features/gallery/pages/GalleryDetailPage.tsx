import { useEffect, useState } from "react";
import { useAdminNavigation } from "../../../lib/admin-navigation";
import { ApiError } from "../../../lib/api";
import { useGalleryCase } from "../hooks/useGallery";
import type { GalleryDetailPageProps } from "../types/gallery.types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryDetailActions } from "../components/case-detail/GalleryDetailActions";
import { GalleryDetailImage } from "../components/case-detail/GalleryDetailImage";

const isPlain = (e: React.MouseEvent) =>
  !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0;

export function GalleryDetailPage({ caseID, onExpired, onEdit, onBack }: GalleryDetailPageProps) {
  const navigation = useAdminNavigation();
  const query = useGalleryCase(caseID);
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) onExpired();
  }, [query.error, onExpired]);

  const perform = async (action: () => Promise<unknown>, done?: () => void) => {
    setError("");
    try {
      await action();
      done?.();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(failure instanceof Error ? failure.message : "Request failed.");
    }
  };

  const returnTo = new URLSearchParams(navigation?.search ?? "").get("returnTo");
  const safeReturn = returnTo && /^\/admin\/gallery(?:\?[^#]*)?$/.test(returnTo) ? returnTo : "/admin/gallery";

  if (query.isPending) return <p role="status">Loading case…</p>;
  if (query.error) {
    const err = query.error;
    const msg = err instanceof ApiError && err.status === 404 ? "Case not found."
      : err instanceof ApiError && err.status === 403 ? "Access denied." : "Unable to load case.";
    return (
      <Card className="mt-8 p-6">
        <p role="alert" className="text-red-800">{msg}</p>
        <div className="mt-4 flex gap-3">
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
          <Button asChild variant="outline">
            <a href={safeReturn} onClick={(e) => { if (isPlain(e)) { e.preventDefault(); onBack(); } }}>Back to gallery</a>
          </Button>
        </div>
      </Card>
    );
  }

  const item = query.data.data;
  const enAlt = item.captions.find((c) => c.lang === "en")?.alt_text || "Combined before and after clinical image";

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl">Case {item.id}</CardTitle>
          <Badge variant={item.published ? "default" : "secondary"}>
            {item.published ? "Published" : "Unpublished"}
          </Badge>
        </div>
        <CardDescription>Revision {item.revision}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <GalleryDetailImage url={item.url} alt={enAlt} beforePosition={item.before_position} />
        <p>Procedure: {item.procedure_tag || "Not set"} · Timeframe: {item.timeframe_badge || "Not set"}</p>
        {item.captions.map((caption) => (
          <div key={caption.lang} lang={caption.lang} dir={caption.lang === "ar" ? "rtl" : "ltr"}>
            <strong>{caption.lang.toUpperCase()} · {caption.approval}</strong>
            <p>{caption.alt_text}</p>
            <p>{caption.caption}</p>
          </div>
        ))}
        {error && <p role="alert" className="text-red-800">{error}</p>}
      </CardContent>
      <GalleryDetailActions
        item={item}
        safeReturn={safeReturn}
        onBack={onBack}
        onEdit={onEdit}
        perform={perform}
        onRefetch={() => query.refetch()}
      />
    </Card>
  );
}
