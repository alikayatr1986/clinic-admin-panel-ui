import { Button } from "@/components/ui/button";
import type { GalleryListPageProps } from "../../types/gallery.types";
import { GalleryCaseFilterBar } from "./GalleryCaseFilterBar";
import { GalleryCaseCard } from "./GalleryCaseCard";
import { GalleryCasePagination } from "./GalleryCasePagination";
import {
  GalleryEmptyListCard,
  GalleryInvalidQueryCard,
  GalleryListErrorCard,
  GalleryOptionsErrorCard,
  GalleryOutOfBoundsCard,
} from "./GalleryListStateCards";
import { useGalleryListState } from "../../hooks/useGalleryListState";

const isPlain = (e: React.MouseEvent) =>
  !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0;

export function GalleryCaseList({
  onExpired,
  onCreate,
  onContent,
  onEdit,
}: GalleryListPageProps) {
  const s = useGalleryListState({ onExpired });

  return (
    <section aria-label="Gallery case browser" className="mt-8">
      {onContent && (
        <Button asChild variant="outline" className="mb-4">
          <a href="/admin/gallery/content" onClick={(e) => { if (isPlain(e)) { e.preventDefault(); onContent(); } }}>
            Section content
          </a>
        </Button>
      )}
      {onCreate && (
        <div className="mb-5 flex justify-end">
          <Button asChild variant="default">
            <a href={`/admin/gallery/new?returnTo=${encodeURIComponent("/admin/gallery" + s.search)}`} onClick={(e) => { if (isPlain(e)) { e.preventDefault(); onCreate(); } }}>
              Create case
            </a>
          </Button>
        </div>
      )}
      {s.optionsErr ? (
        <GalleryOptionsErrorCard error={s.optionsErr} onRetry={() => void s.optQuery.refetch()} />
      ) : !s.options ? (
        <p role="status">Loading gallery filters…</p>
      ) : (
        <>
          <GalleryCaseFilterBar
            options={s.options}
            invalid={s.invalid}
            status={s.parsed?.filters.status ?? ""}
            procedure={s.parsed?.filters.procedure_tag ?? ""}
            timeframe={s.parsed?.filters.timeframe_badge ?? ""}
            onChangeFilter={s.changeFilter}
            onClearFilters={() => s.updateQuery(new URLSearchParams())}
          />
          {s.invalid ? (
            <GalleryInvalidQueryCard onReset={() => s.updateQuery(new URLSearchParams())} />
          ) : s.loading ? (
            <p role="status" className="mt-6">Loading gallery cases…</p>
          ) : s.listErr ? (
            <GalleryListErrorCard error={s.listErr} onRetry={() => void s.listQuery.refetch()} />
          ) : s.total === 0 ? (
            <GalleryEmptyListCard />
          ) : s.page > s.totalPages ? (
            <GalleryOutOfBoundsCard onGoFirst={() => s.changePage(1)} />
          ) : (
            <>
              <p role="status" className="mt-6 text-sm text-slate-600">
                {s.total} {s.total === 1 ? "case" : "cases"} · Page {s.page} of {s.totalPages} · Server display order
              </p>
              <ul className="mt-4 grid gap-4">
                {s.rows.map((item) => (
                  <GalleryCaseCard key={item.id} item={item} options={s.options!} search={s.search} onEdit={onEdit} />
                ))}
              </ul>
              <GalleryCasePagination page={s.page} totalPages={s.totalPages} onChangePage={s.changePage} />
            </>
          )}
        </>
      )}
    </section>
  );
}
