import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useBlogOptions } from './useBlogOptions';
import { useBlogList } from './useBlogList';
import { blogsApi } from '../services/blogs.service';
import { ApiError } from '../../../lib/api';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockOptions = {
  limits: {},
  generation_enabled: false,
  categories: [{ id: 'c1', key: 'k1', name_en: 'Cat 1', name_ar: 'تصنيف 1' }],
};

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useBlogOptions and useBlogList hooks', () => {
  it('useBlogOptions fetches options and handles 401 expiry', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(blogsApi, 'options').mockResolvedValueOnce({ data: mockOptions });
    const onExpired = vi.fn();

    const { result } = renderHook(() => useBlogOptions(onExpired), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockOptions);
    expect(spy).toHaveBeenCalledOnce();

    // Now test 401 error
    vi.spyOn(blogsApi, 'options').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Expired'));
    const { result: errResult } = renderHook(() => useBlogOptions(onExpired), {
      wrapper: wrapper(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
    });

    await waitFor(() => expect(errResult.current.isError).toBe(true));
    expect(onExpired).toHaveBeenCalledOnce();
  });

  it('useBlogList fetches filtered articles and handles 401 expiry', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const mockList = { data: [], page: 1, page_size: 12, total: 0 };
    const spy = vi.spyOn(blogsApi, 'list').mockResolvedValueOnce(mockList);
    const onExpired = vi.fn();

    const { result } = renderHook(() => useBlogList({ status: 'draft', page: 1 }, onExpired), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockList);
    expect(spy).toHaveBeenCalledWith({ status: 'draft', page: 1 }, expect.anything());

    // Test 401 error
    vi.spyOn(blogsApi, 'list').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Expired'));
    const { result: errResult } = renderHook(() => useBlogList({ page: 1 }, onExpired), {
      wrapper: wrapper(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
    });

    await waitFor(() => expect(errResult.current.isError).toBe(true));
    expect(onExpired).toHaveBeenCalledOnce();
  });
});
