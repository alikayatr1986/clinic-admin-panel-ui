import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import { useCreateBlogPost, usePublishBlogPost } from './useBlogMutations';
import { blogKeys } from './blog.keys';

afterEach(() => {
  vi.restoreAllMocks();
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('blog mutation hooks', () => {
  it('creates a post and invalidates the blog lists', async () => {
    const { client, wrapper } = setup();
    const create = vi.spyOn(blogsApi, 'create').mockResolvedValue({ data: { id: 'post-1', aggregate_revision: 1 } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateBlogPost(), { wrapper });
    await result.current.mutateAsync({ categoryID: 'cat-1', slug: 'slug', idempotencyKey: 'key-1', title: 'Title' });

    expect(create).toHaveBeenCalledWith('cat-1', 'slug', 'key-1', 'Title');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: blogKeys.lists() });
  });

  it('maps publish payloads and invalidates detail and lists', async () => {
    const { client, wrapper } = setup();
    const publish = vi.spyOn(blogsApi, 'publish').mockResolvedValue({
      data: { publication_id: 'pub', aggregate_revision: 5, first_published_at: '', last_published_at: '' },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => usePublishBlogPost(), { wrapper });
    await result.current.mutateAsync({
      id: 'post-1',
      expectedAggregateRevision: 4,
      categoryID: 'cat-1',
      enRevisionID: 'en-1',
      arRevisionID: 'ar-1',
    });

    expect(publish).toHaveBeenCalledWith('post-1', {
      expected_aggregate_revision: 4,
      category_id: 'cat-1',
      en_revision_id: 'en-1',
      ar_revision_id: 'ar-1',
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: blogKeys.detail('post-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: blogKeys.lists() });
  });

  it('does not retry failed writes automatically', async () => {
    const { wrapper } = setup();
    const create = vi.spyOn(blogsApi, 'create').mockRejectedValue(new ApiError(409, 'BLOG_CONFLICT', 'Conflict'));

    const { result } = renderHook(() => useCreateBlogPost(), { wrapper });
    result.current.mutate({ categoryID: 'cat-1', slug: 'slug', idempotencyKey: 'key-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(create).toHaveBeenCalledOnce();
  });
});
