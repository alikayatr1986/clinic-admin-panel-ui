import { ApiError } from "../../../lib/api";
import type {
  GalleryFilters,
  GalleryOption,
  GalleryOptions,
  GalleryParsedQuery,
} from "../types/gallery.types";

export const PAGE_SIZE = 12;
const allowedKeys = new Set([
  "page",
  "status",
  "procedure_tag",
  "timeframe_badge",
]);

export function parseQuery(
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

export function labelFor(code: string | undefined, items: GalleryOption[]): string {
  if (!code) return "Not set";
  const found = items.find((item) => item.code === code);
  if (!found) return code;
  const isRetired = found.retired || found.status === "retired";
  return isRetired ? `${found.en} (Retired)` : found.en;
}

export function requestError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403)
      return "Access denied. Your account may lack permission to view gallery cases.";
    if (error.status === 400)
      return "The gallery filters were rejected. Clear them and try again.";
    return error.message;
  }
  return "Gallery cases are unavailable. Try again.";
}
