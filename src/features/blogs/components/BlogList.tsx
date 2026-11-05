import { useAdminNavigation } from '../../../lib/admin-navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../../lib/api';
import { useBlogOptions } from '../hooks/useBlogOptions';
import { useBlogList } from '../hooks/useBlogList';
import { useCreateBlogPost } from '../hooks/useBlogMutations';
import { BlogCreateForm } from './BlogCreateForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type {
  BlogCreateData,
  BlogFilters,
  BlogListProps,
  BlogStatusFilter,
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
  const [query, setQuery] = useState(new URLSearchParams(search).get('q') ?? '');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const createPost = useCreateBlogPost();

  useEffect(() => {
    if (routerNavigation) { setSearch(routerNavigation.search); setQuery(new URLSearchParams(routerNavigation.search).get('q') ?? ''); }
  }, [routerNavigation?.search]);

  const optionsQuery = useBlogOptions(onExpired);
  const options = optionsQuery.data ?? null;

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

  const listQuery = useBlogList(filters, onExpired, Boolean(options));
  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = optionsQuery.isLoading || (Boolean(options) && listQuery.isLoading);
  const error = optionsQuery.isError ? message(optionsQuery.error) : listQuery.isError ? message(listQuery.error) : '';

  function retry() {
    if (optionsQuery.isError) void optionsQuery.refetch();
    else void listQuery.refetch();
  }

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
      const result = await createPost.mutateAsync({ categoryID: data.categoryID, slug: data.slug, idempotencyKey: key, title: data.title });
      onEdit(result.id);
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
        <Card className="p-5">
          <details
            open={createOpen || undefined}
            className="space-y-4"
          >
            <summary className="cursor-pointer font-semibold">Create article</summary>
            <BlogCreateForm
              options={options}
              creating={creating}
              createError={createError}
              onSubmit={handleCreate}
            />
          </details>
        </Card>
      )}

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <form onSubmit={submitSearch}>
            <Label htmlFor="blog-search">Search</Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="blog-search"
                maxLength={120}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1"
              />
              <Button type="submit" variant="outline">Search</Button>
            </div>
          </form>
          <div>
            <Label htmlFor="blog-status">Status</Label>
            <select
              id="blog-status"
              value={params.get('status') ?? ''}
              onChange={(e) => update({ status: e.target.value })}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="needs_action">Needs action</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="published_with_changes">Published with changes</option>
            </select>
          </div>
          <div>
            <Label htmlFor="blog-category">Category</Label>
            <select
              id="blog-category"
              value={params.get('category') ?? ''}
              onChange={(e) => update({ category: e.target.value })}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
      </Card>

      {loading ? (
        <p role="status">Loading blog articles…</p>
      ) : error ? (
        <Card role="alert" className="p-6">
          <p className="text-destructive font-medium">{error}</p>
          <Button
            variant="outline"
            onClick={retry}
            className="mt-3"
          >
            Retry
          </Button>
        </Card>
      ) : total === 0 ? (
        <Card className="p-6">
          <p className="text-slate-600">{filtered ? 'No articles match these filters.' : 'No blog articles yet.'}</p>
        </Card>
      ) : page > pages ? (
        <Card role="alert" className="p-6">
          <p>This page no longer has articles.</p>
          <Button variant="outline" className="mt-3" onClick={() => update({ page: '' })}>
            Go to first page
          </Button>
        </Card>
      ) : (
        <>
          <p role="status" className="text-sm text-slate-600">
            {total} articles · Page {page} of {pages}
          </p>
          <ul className="space-y-3">
            {rows.map((item) => (
              <li key={item.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">{item.title || item.slug}</h2>
                        <Badge
                          variant={
                            item.status === 'published'
                              ? 'default'
                              : item.status === 'published_with_changes'
                              ? 'promo'
                              : 'secondary'
                          }
                        >
                          {item.status.replaceAll('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        {item.category_key} · {item.status.replaceAll('_', ' ')}
                      </p>
                      <p className="mt-1 text-sm font-medium text-crimson">
                        {item.next_action_label}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/admin/blogs/${encodeURIComponent(item.id)}?returnTo=${encodeURIComponent('/admin/blogs' + search)}`}
                        onClick={(event) => {
                          if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) {
                            event.preventDefault();
                            onEdit(item.id);
                          }
                        }}
                      >
                        Edit article
                      </a>
                    </Button>
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
                </Card>
              </li>
            ))}
          </ul>
          <nav aria-label="Blog pages" className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => update({ page: String(page + 1) })}
            >
              Next
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}
