import { useAdminNavigation } from '../../../lib/admin-navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import { BlogCreateForm } from './BlogCreateForm';
import type {
  BlogCreateData,
  BlogFilters,
  BlogListProps,
  BlogOptions,
  BlogStatusFilter,
  BlogSummary,
} from '../types/blogs.types';

const PAGE_SIZE = 12;
function message(error: unknown) {
  return error instanceof ApiError ? error.message : 'The blog library is unavailable. Try again.';
}

export function BlogList({
  onExpired,
  onEdit,
  createOpen = false,
  embeddedCreate = true,
}: BlogListProps) {
  const routerNavigation = useAdminNavigation();
  const [search, setSearch] = useState(routerNavigation?.search ?? '');
  const [options, setOptions] = useState<BlogOptions | null>(null);
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  const [rows, setRows] = useState<BlogSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState(new URLSearchParams(search).get('q') ?? '');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (routerNavigation) { setSearch(routerNavigation.search); setQuery(new URLSearchParams(routerNavigation.search).get('q') ?? ''); }
  }, [routerNavigation?.search]);

  useEffect(() => {
    setLoading(true);
    setError('');
    blogsApi
      .options()
      .then(({ data }) => {
        setOptions(data);
      })
      .catch((failure) => {
        setLoading(false);
        if (failure instanceof ApiError && failure.status === 401) onExpired();
        else setError(message(failure));
      });
  }, [optionsAttempt]);

  const params = new URLSearchParams(search);
  const rawPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const validStatuses: BlogStatusFilter[] = ['needs_action', 'draft', 'published', 'published_with_changes'];
  const rawStatus = params.get('status');
  const status = validStatuses.includes(rawStatus as BlogStatusFilter) ? (rawStatus as BlogStatusFilter) : undefined;
  const filters: BlogFilters = {
    page,
    page_size: PAGE_SIZE,
    ...(status ? { status } : {}),
    ...(params.get('category') ? { category: params.get('category')! } : {}),
    ...(params.get('q') ? { q: params.get('q')! } : {}),
  };

  useEffect(() => {
    if (!options) return;
    let active = true;
    setLoading(true);
    setError('');
    blogsApi
      .list(filters)
      .then((result) => {
        if (active) {
          setRows(result.data);
          setTotal(result.total);
          setLoading(false);
        }
      })
      .catch((failure) => {
        if (!active) return;
        if (failure instanceof ApiError && failure.status === 401) onExpired();
        else {
          setError(message(failure));
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, options, attempt]);

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(search);
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key)
    );
    if (!('page' in changes)) next.delete('page');
    const suffix = next.size ? `?${next}` : '';
    if (routerNavigation) routerNavigation.navigate(`/admin/blogs${suffix}`);
    setSearch(suffix);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    update({ q: query.trim() });
  }

  async function handleCreate(data: BlogCreateData) {
    if (creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const key = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const result = await blogsApi.create(data.categoryID, data.slug, key, data.title);
      onEdit(result.data.id);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setCreateError(message(failure));
    } finally {
      setCreating(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(params.get('q') || params.get('category') || params.get('status'));

  return (
    <section aria-label="Blog library" className="mt-8 space-y-6">
      {embeddedCreate && (
        <details
          open={createOpen || undefined}
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <summary className="cursor-pointer font-semibold">Create article</summary>
          <BlogCreateForm
            options={options}
            creating={creating}
            createError={createError}
            onSubmit={handleCreate}
          />
        </details>
      )}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <form onSubmit={submitSearch}>
          <label htmlFor="blog-search" className="block text-sm font-medium">
            Search
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="blog-search"
              maxLength={120}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2"
            />
            <button className="rounded-md border border-slate-300 px-3">Search</button>
          </div>
        </form>
        <div>
          <label htmlFor="blog-status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="blog-status"
            value={params.get('status') ?? ''}
            onChange={(e) => update({ status: e.target.value })}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">All statuses</option>
            <option value="needs_action">Needs action</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="published_with_changes">Published with changes</option>
          </select>
        </div>
        <div>
          <label htmlFor="blog-category" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="blog-category"
            value={params.get('category') ?? ''}
            onChange={(e) => update({ category: e.target.value })}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">All categories</option>
            {options?.categories.map((c) => (
              <option key={c.id} value={c.key}>
                {c.name_en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p role="status">Loading blog articles…</p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-white p-6 text-red-800">
          <p>{error}</p>
          <button
            onClick={() =>
              options ? setAttempt((v) => v + 1) : setOptionsAttempt((v) => v + 1)
            }
            className="mt-3 rounded-md border px-4 py-2"
          >
            Retry
          </button>
        </div>
      ) : total === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          {filtered ? 'No articles match these filters.' : 'No blog articles yet.'}
        </p>
      ) : page > pages ? (
        <div role="alert">
          <p>This page no longer has articles.</p>
          <button onClick={() => update({ page: '' })}>Go to first page</button>
        </div>
      ) : (
        <>
          <p role="status" className="text-sm text-slate-600">
            {total} articles · Page {page} of {pages}
          </p>
          <ul className="space-y-3">
            {rows.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{item.title || item.slug}</h2>
                    <p className="text-sm text-slate-600">
                      {item.category_key} · {item.status.replaceAll('_', ' ')}
                    </p>
                    <p className="mt-1 text-sm font-medium text-crimson">
                      {item.next_action_label}
                    </p>
                  </div>
                  <a
                    href={`/admin/blogs/${encodeURIComponent(item.id)}?returnTo=${encodeURIComponent('/admin/blogs' + search)}`}
                    onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); onEdit(item.id); } }}
                    className="rounded-md border border-slate-300 px-4 py-2"
                  >
                    Edit article
                  </a>
                </div>
                <p className="mt-3 text-sm">
                  EN: {item.en_status.complete ? 'complete' : 'incomplete'} /{' '}
                  {item.en_status.reviewed ? 'reviewed' : 'unreviewed'} · AR:{' '}
                  {item.ar_status.complete ? 'complete' : 'incomplete'} /{' '}
                  {item.ar_status.reviewed ? 'reviewed' : 'unreviewed'}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Updated {new Date(item.updated_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
          <nav aria-label="Blog pages" className="flex justify-between">
            <button
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
              className="rounded-md border px-4 py-2 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => update({ page: String(page + 1) })}
              className="rounded-md border px-4 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
