import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  GalleryErrorCardProps,
  GalleryOutOfBoundsCardProps,
  GalleryResetCardProps,
} from "../../types/gallery.list.types";

export function GalleryOptionsErrorCard({ error, onRetry }: GalleryErrorCardProps) {
  return (
    <Card className="p-6">
      <p role="alert" className="text-red-800">{error}</p>
      <Button type="button" variant="outline" onClick={onRetry} className="mt-4">
        Retry
      </Button>
    </Card>
  );
}

export function GalleryInvalidQueryCard({ onReset }: GalleryResetCardProps) {
  return (
    <Card className="mt-6 p-6">
      <p role="alert" className="text-amber-900">
        The gallery link contains invalid filters or a page number.
        Reset the filters to continue.
      </p>
      <Button type="button" variant="default" onClick={onReset} className="mt-4">
        Reset filters
      </Button>
    </Card>
  );
}

export function GalleryListErrorCard({ error, onRetry }: GalleryErrorCardProps) {
  return (
    <Card className="mt-6 p-6">
      <p role="alert" className="text-red-800">{error}</p>
      <Button type="button" variant="outline" onClick={onRetry} className="mt-4">
        Retry
      </Button>
    </Card>
  );
}

export function GalleryEmptyListCard() {
  return (
    <Card className="mt-6 p-6">
      <p role="status" className="text-slate-600">No gallery cases match these filters.</p>
    </Card>
  );
}

export function GalleryOutOfBoundsCard({ onGoFirst }: GalleryOutOfBoundsCardProps) {
  return (
    <Card className="mt-6 p-6">
      <p role="alert">This page no longer has cases.</p>
      <Button type="button" variant="outline" onClick={onGoFirst} className="mt-4">
        Go to first page
      </Button>
    </Card>
  );
}
