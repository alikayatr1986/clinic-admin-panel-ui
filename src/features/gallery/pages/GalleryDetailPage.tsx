import { useEffect, useState } from "react";
import { useAdminNavigation } from "../../../lib/admin-navigation";
import { ApiError } from "../../../lib/api";
import { useGalleryActions, useGalleryCase } from "../hooks/useGallery";
import type { GalleryDetailPageProps } from "../types/gallery.types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function GalleryDetailPage({
  caseID,
  onExpired,
  onEdit,
  onBack,
}: GalleryDetailPageProps) {
  const navigation = useAdminNavigation();
  const query = useGalleryCase(caseID);
  const actions = useGalleryActions();
  const [error, setError] = useState("");
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401)
      onExpired();
  }, [query.error, onExpired]);
  async function perform(action: () => Promise<unknown>, done?: () => void) {
    setError("");
    try {
      await action();
      done?.();
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else
        setError(
          failure instanceof Error ? failure.message : "Request failed.",
        );
    }
  }
  if (query.isPending) return <p role="status">Loading case…</p>;
  if (query.error)
    return (
      <p role="alert">
        {query.error instanceof ApiError && query.error.status === 404
          ? "Case not found."
          : query.error instanceof ApiError && query.error.status === 403
            ? "Access denied."
            : "Unable to load case."}
      </p>
    );
  const item = query.data.data;
  const returnTo = new URLSearchParams(navigation?.search ?? "").get(
    "returnTo",
  );
  const safeReturn =
    returnTo && /^\/admin\/gallery(?:\?[^#]*)?$/.test(returnTo)
      ? returnTo
      : "/admin/gallery";
  return (
    <Card className="mt-8 space-y-5 p-6">
      <CardHeader className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl">Case {item.id}</CardTitle>
          <Badge variant={item.published ? "default" : "secondary"}>
            {item.published ? "Published" : "Unpublished"}
          </Badge>
        </div>
        <p className="text-sm text-slate-600">
          Revision {item.revision}
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-0">
        {item.url && (
          <img
            src={item.url}
            alt={
              item.captions.find((caption) => caption.lang === "en")?.alt_text ||
              "Combined before and after clinical image"
            }
            className="max-h-96 w-full object-contain"
          />
        )}
        <p>
          Procedure: {item.procedure_tag || "Not set"} · Timeframe:{" "}
          {item.timeframe_badge || "Not set"}
        </p>
        {item.captions.map((caption) => (
          <div
            key={caption.lang}
            lang={caption.lang}
            dir={caption.lang === "ar" ? "rtl" : "ltr"}
          >
            <strong>
              {caption.lang.toUpperCase()} · {caption.approval}
            </strong>
            <p>{caption.alt_text}</p>
            <p>{caption.caption}</p>
          </div>
        ))}
        {error && <p role="alert" className="text-red-800">{error}</p>}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3 p-0">
        <Button
          asChild
          variant="outline"
        >
          <a
            href={safeReturn}
            onClick={(event) => {
              if (
                !event.metaKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey &&
                event.button === 0
              ) {
                event.preventDefault();
                onBack();
              }
            }}
          >
            Back to gallery
          </a>
        </Button>
        <Button
          asChild
          variant="default"
        >
          <a
            href={`/admin/gallery/${encodeURIComponent(item.id)}/edit?returnTo=${encodeURIComponent(safeReturn)}`}
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
            Edit case
          </a>
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            if (window.confirm("Delete this case?"))
              void perform(
                () =>
                  actions.remove.mutateAsync({
                    id: item.id,
                    revision: item.revision,
                  }),
                onBack,
              );
          }}
        >
          Delete case
        </Button>
        {item.consent_id && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (window.confirm("Withdraw consent for all associated cases?"))
                void perform(async () => {
                  await actions.withdraw.mutateAsync(item.consent_id!);
                  await query.refetch();
                });
            }}
          >
            Withdraw consent
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
