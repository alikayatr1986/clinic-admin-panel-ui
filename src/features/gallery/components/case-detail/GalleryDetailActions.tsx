import { ApiError } from '../../../../lib/api';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { useGalleryActions } from "../../hooks/useGalleryActions";
import type { GalleryDetailActionsProps } from "../../types/gallery.detail.types";

const isPlain = (e: React.MouseEvent) =>
  !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0;

export function GalleryDetailActions({
  item,
  safeReturn,
  onBack,
  onEdit,
  perform,
  onRefetch,
}: GalleryDetailActionsProps) {
  const actions = useGalleryActions();

  return (
    <CardFooter className="flex flex-wrap gap-3">
      <Button asChild variant="outline">
        <a
          href={safeReturn}
          onClick={(e) => { if (isPlain(e)) { e.preventDefault(); onBack(); } }}
        >
          Back to gallery
        </a>
      </Button>
      <Button asChild variant="default">
        <a
          href={`/admin/gallery/${encodeURIComponent(item.id)}/edit?returnTo=${encodeURIComponent(safeReturn)}`}
          onClick={(e) => { if (isPlain(e)) { e.preventDefault(); onEdit(item.id); } }}
        >
          Edit case
        </a>
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={actions.remove.isPending}
        onClick={() => {
          if (window.confirm("Delete this case?"))
            void perform(
              async () => { await actions.remove.mutateAsync({ id: item.id, revision: item.revision }); toast.success('Case deleted.'); },
              onBack,
            );
        }}
      >
        {actions.remove.isPending ? "Deleting…" : "Delete case"}
      </Button>
      {item.consent_id && (
        <Button
          type="button"
          variant="destructive"
          disabled={actions.withdraw.isPending}
          onClick={() => {
            if (window.confirm("Withdraw consent for all associated cases?"))
              void perform(async () => {
                await actions.withdraw.mutateAsync(item.consent_id!);
                toast.success('Consent withdrawn.');
                try { await onRefetch(); } catch (failure) {
                  if (failure instanceof ApiError && failure.status === 401) throw failure;
                  throw new Error('Consent was withdrawn, but the case could not be refreshed. Retry loading the case.');
                }
              });
          }}
        >
          {actions.withdraw.isPending ? "Withdrawing…" : "Withdraw consent"}
        </Button>
      )}
    </CardFooter>
  );
}
