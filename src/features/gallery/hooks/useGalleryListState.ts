import { useEffect, useState } from "react";
import { useAdminNavigation } from "../../../lib/admin-navigation";
import { ApiError } from "../../../lib/api";
import { useGalleryList, useGalleryOptions } from "./useGallery";
import type { GalleryFilterKey } from "../types/gallery.types";
import type { GalleryListStateHookProps } from "../types/gallery.list.types";
import { PAGE_SIZE, parseQuery, requestError } from "../utils/gallery.list.utils";

export function useGalleryListState({ onExpired }: GalleryListStateHookProps) {
  const routerNav = useAdminNavigation();
  const [search, setSearch] = useState(routerNav?.search ?? "");
  const optQuery = useGalleryOptions();
  const options = optQuery.data?.data ?? null;
  const optionsErr = optQuery.error
    ? requestError(optQuery.error)
    : options && (!Array.isArray(options.procedures) || !Array.isArray(options.timeframes))
      ? "The server sent unexpected gallery filters."
      : "";
  const parsed = options && !optionsErr ? parseQuery(search, options) : null;
  const invalid = parsed?.invalid ?? false;
  const page = parsed?.filters.page ?? 1;
  const listQuery = useGalleryList(parsed && !invalid ? parsed.filters : null);
  const resp = listQuery.data;
  const invalidResp = resp && (!Array.isArray(resp.data) || !Number.isSafeInteger(resp.total) || resp.total < 0);
  const rows = invalidResp ? [] : (resp?.data ?? []);
  const total = invalidResp ? 0 : (resp?.total ?? 0);
  const listErr = invalidResp
    ? "The server sent an unexpected gallery response."
    : listQuery.error
      ? requestError(listQuery.error)
      : "";
  const loading = listQuery.isFetching || (!resp && !listQuery.error);

  useEffect(() => {
    if (routerNav) setSearch(routerNav.search);
  }, [routerNav?.search]);

  useEffect(() => {
    if ((optQuery.error instanceof ApiError && optQuery.error.status === 401) ||
        (listQuery.error instanceof ApiError && listQuery.error.status === 401)) {
      onExpired();
    }
  }, [optQuery.error, listQuery.error, onExpired]);

  const updateQuery = (next: URLSearchParams) => {
    const s = next.size ? `?${next}` : "";
    if (routerNav) routerNav.navigate(`/admin/gallery${s}`);
    setSearch(s);
  };

  const changeFilter = (k: GalleryFilterKey, v: string) => {
    const next = new URLSearchParams(search);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete("page");
    updateQuery(next);
  };

  const changePage = (p: number) => {
    const next = new URLSearchParams(search);
    if (p === 1) next.delete("page");
    else next.set("page", String(p));
    updateQuery(next);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    search,
    options,
    optionsErr,
    parsed,
    invalid,
    page,
    rows,
    total,
    listErr,
    loading,
    totalPages,
    optQuery,
    listQuery,
    updateQuery,
    changeFilter,
    changePage,
  };
}
