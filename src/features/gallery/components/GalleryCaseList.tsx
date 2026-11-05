import { useAdminNavigation } from "../../../lib/admin-navigation";
import { useEffect, useState } from "react";
import { ApiError } from "../../../lib/api";
import { useGalleryList, useGalleryOptions } from "../hooks/useGallery";
import type {
  GalleryCase,
  GalleryFilters,
  GalleryOption,
  GalleryOptions,
  GalleryFilterKey as FilterKey,
  GalleryThumbnailProps,
  GalleryCardProps,
  GalleryParsedQuery,
  GalleryListPageProps,
} from "../types/gallery.types";

const PAGE_SIZE = 12;
const allowedKeys = new Set([
  "page",
  "status",
  "procedure_tag",
  "timeframe_badge",
]);

function parseQuery(
  search: string,
  options: GalleryOptions,
): GalleryParsedQuery {
  const query = new URLSearchParams(search);
  let invalid = false;
  for (const [key] of query) {
    if (!allowedKeys.has(key) || query.getAll(key).length !== 1) invalid = true;
  }
  const pageValue = query.get("page");
  const page = pageValue === null ? 1 : Number(pageValue);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000)
    invalid = true;
  const status = query.get("status") ?? "";
  if (status && !["draft", "unpublished", "published"].includes(status))
    invalid = true;
  const procedure = query.get("procedure_tag") ?? "";
  const timeframe = query.get("timeframe_badge") ?? "";
  if (procedure && !options.procedures.some((item) => item.code === procedure))
    invalid = true;
  if (timeframe && !options.timeframes.some((item) => item.code === timeframe))
    invalid = true;
  return {
    filters: {
      page,
      page_size: PAGE_SIZE,
      ...(status ? { status: status as GalleryFilters["status"] } : {}),
      ...(procedure ? { procedure_tag: procedure } : {}),
      ...(timeframe ? { timeframe_badge: timeframe } : {}),
    },
    invalid,
  };
}

function labelFor(code: string | undefined, items: GalleryOption[]): string {
  if (!code) return "Not set";
  const found = items.find((item) => item.code === code);
  if (!found) return code;
  const isRetired = found.retired || found.status === "retired";
  return isRetired ? `${found.en} (Retired)` : found.en;
}

function requestError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403)
      return "Access denied. Your account may lack permission to view gallery cases.";
    if (error.status === 400)
      return "The gallery filters were rejected. Clear them and try again.";
    return error.message;
  }
  return "Gallery cases are unavailable. Try again.";
}

function CaseThumbnail({ item }: GalleryThumbnailProps) {
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

function CaseCard({ item, options, search, onEdit }: GalleryCardProps) {
  const enReview =
    item.captions.find((caption) => caption.lang === "en")?.approval ??
    "missing";
  const arReview =
    item.captions.find((caption) => caption.lang === "ar")?.approval ??
    "missing";
  const updated = new Date(item.updated_at);
  return (
    <li className="grid gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,14rem)_1fr]">
      <CaseThumbnail item={item} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="break-all text-lg font-semibold">Case {item.id}</h3>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${item.published ? "bg-green-100 text-green-900" : "bg-slate-100 text-slate-700"}`}
          >
            {item.published ? "Published" : "Unpublished"}
          </span>
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
            <dd>
              EN: {enReview} · AR: {arReview}
            </dd>
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
            className="mt-4 inline-block rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
          >
            View case
          </a>
        )}
      </div>
    </li>
  );
}

export function GalleryCaseList({
  onExpired,
  onCreate,
  onContent,
  onEdit,
}: GalleryListPageProps) {
  const routerNavigation = useAdminNavigation();
  const [search, setSearch] = useState(routerNavigation?.search ?? "");
  const optionsQuery = useGalleryOptions();
  const options = optionsQuery.data?.data ?? null;
  const optionsError = optionsQuery.error
    ? requestError(optionsQuery.error)
    : options &&
        (!Array.isArray(options.procedures) ||
          !Array.isArray(options.timeframes))
      ? "The server sent unexpected gallery filters."
      : "";
  const parsed = options && !optionsError ? parseQuery(search, options) : null;
  const invalid = parsed?.invalid ?? false;
  const page = parsed?.filters.page ?? 1;
  const listQuery = useGalleryList(parsed && !invalid ? parsed.filters : null);
  const response = listQuery.data;
  const invalidResponse =
    response &&
    (!Array.isArray(response.data) ||
      !Number.isSafeInteger(response.total) ||
      response.total < 0);
  const visibleResult = {
    rows: invalidResponse ? [] : (response?.data ?? []),
    total: invalidResponse ? 0 : (response?.total ?? 0),
    loading: listQuery.isFetching || (!response && !listQuery.error),
    error: invalidResponse
      ? "The server sent an unexpected gallery response."
      : listQuery.error
        ? requestError(listQuery.error)
        : "",
  };
  useEffect(() => {
    if (routerNavigation) setSearch(routerNavigation.search);
  }, [routerNavigation?.search]);
  useEffect(() => {
    if (
      (optionsQuery.error instanceof ApiError &&
        optionsQuery.error.status === 401) ||
      (listQuery.error instanceof ApiError && listQuery.error.status === 401)
    )
      onExpired();
  }, [optionsQuery.error, listQuery.error, onExpired]);

  function updateQuery(next: URLSearchParams) {
    const suffix = next.size ? `?${next}` : "";
    if (routerNavigation) routerNavigation.navigate(`/admin/gallery${suffix}`);
    setSearch(suffix);
  }

  function changeFilter(key: FilterKey, value: string) {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    updateQuery(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(search);
    if (nextPage === 1) next.delete("page");
    else next.set("page", String(nextPage));
    updateQuery(next);
  }

  const totalPages = Math.max(1, Math.ceil(visibleResult.total / PAGE_SIZE));
  return (
    <section aria-label="Gallery case browser" className="mt-8">
      {onContent && (
        <a
          href="/admin/gallery/content"
          onClick={(event) => {
            if (
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey &&
              event.button === 0
            ) {
              event.preventDefault();
              onContent();
            }
          }}
          className="mb-4 inline-block rounded-md border border-slate-300 px-4 py-2 font-medium"
        >
          Section content
        </a>
      )}
      {onCreate && (
        <div className="mb-5 flex justify-end">
          <a
            href="/admin/gallery/new"
            onClick={(event) => {
              if (
                !event.metaKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey &&
                event.button === 0
              ) {
                event.preventDefault();
                onCreate();
              }
            }}
            className="rounded-md bg-crimson px-4 py-2 font-semibold text-white"
          >
            Create case
          </a>
        </div>
      )}
      {optionsError ? (
        <div className="rounded-xl border border-red-200 bg-white p-6">
          <p role="alert" className="text-red-800">
            {optionsError}
          </p>
          <button
            onClick={() => void optionsQuery.refetch()}
            className="mt-4 rounded-md border border-slate-300 px-4 py-2"
          >
            Retry
          </button>
        </div>
      ) : !options ? (
        <p role="status">Loading gallery filters…</p>
      ) : (
        <>
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="gallery-status"
                className="block text-sm font-medium"
              >
                Status
              </label>
              <select
                id="gallery-status"
                value={invalid ? "" : (parsed?.filters.status ?? "")}
                onChange={(event) => changeFilter("status", event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="unpublished">Unpublished</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="gallery-procedure"
                className="block text-sm font-medium"
              >
                Procedure
              </label>
              <select
                id="gallery-procedure"
                value={invalid ? "" : (parsed?.filters.procedure_tag ?? "")}
                onChange={(event) =>
                  changeFilter("procedure_tag", event.target.value)
                }
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">All procedures</option>
                {options.procedures.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="gallery-timeframe"
                className="block text-sm font-medium"
              >
                Timeframe
              </label>
              <select
                id="gallery-timeframe"
                value={invalid ? "" : (parsed?.filters.timeframe_badge ?? "")}
                onChange={(event) =>
                  changeFilter("timeframe_badge", event.target.value)
                }
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">All timeframes</option>
                {options.timeframes.map((item) => {
                  const isRetired = item.retired || item.status === "retired";
                  return (
                    <option key={item.code} value={item.code}>
                      {item.en}
                      {isRetired ? " (Retired)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => updateQuery(new URLSearchParams())}
                className="w-full rounded-md border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          </div>
          {invalid ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-white p-6">
              <p role="alert" className="text-amber-900">
                The gallery link contains invalid filters or a page number.
                Reset the filters to continue.
              </p>
              <button
                type="button"
                onClick={() => updateQuery(new URLSearchParams())}
                className="mt-4 rounded-md bg-crimson px-4 py-2 font-medium text-white"
              >
                Reset filters
              </button>
            </div>
          ) : visibleResult.loading ? (
            <p role="status" className="mt-6">
              Loading gallery cases…
            </p>
          ) : visibleResult.error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-white p-6">
              <p role="alert" className="text-red-800">
                {visibleResult.error}
              </p>
              <button
                type="button"
                onClick={() => void listQuery.refetch()}
                className="mt-4 rounded-md border border-slate-300 px-4 py-2"
              >
                Retry
              </button>
            </div>
          ) : visibleResult.total === 0 ? (
            <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              No gallery cases match these filters.
            </p>
          ) : page > totalPages ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-white p-6">
              <p role="alert">This page no longer has cases.</p>
              <button
                type="button"
                onClick={() => changePage(1)}
                className="mt-4 rounded-md border border-slate-300 px-4 py-2"
              >
                Go to first page
              </button>
            </div>
          ) : (
            <>
              <p role="status" className="mt-6 text-sm text-slate-600">
                {visibleResult.total}{" "}
                {visibleResult.total === 1 ? "case" : "cases"} · Page {page} of{" "}
                {totalPages} · Server display order
              </p>
              <ul className="mt-4 grid gap-4">
                {visibleResult.rows.map((item) => (
                  <CaseCard
                    key={item.id}
                    item={item}
                    options={options}
                    search={search}
                    onEdit={onEdit}
                  />
                ))}
              </ul>
              <nav
                aria-label="Gallery pages"
                className="mt-6 flex items-center justify-between gap-4"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                  className="rounded-md border border-slate-300 px-4 py-2 font-medium disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => changePage(page + 1)}
                  className="rounded-md border border-slate-300 px-4 py-2 font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </>
          )}
        </>
      )}
    </section>
  );
}
