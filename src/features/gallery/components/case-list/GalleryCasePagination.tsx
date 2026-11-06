import { Button } from "@/components/ui/button";
import type { GalleryCasePaginationProps } from "../../types/gallery.list.types";

export function GalleryCasePagination({
  page,
  totalPages,
  onChangePage,
}: GalleryCasePaginationProps) {
  return (
    <nav
      aria-label="Gallery pages"
      className="mt-6 flex items-center justify-between gap-4"
    >
      <Button
        type="button"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChangePage(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm">
        Page {page} of {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onChangePage(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
