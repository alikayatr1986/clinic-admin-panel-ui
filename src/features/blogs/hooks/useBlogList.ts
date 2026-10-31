import { useQuery } from '@tanstack/react-query';
import { blogsApi } from '../services/blogs.service';
import { blogKeys } from './blog.keys';
import { ApiError } from '../../../lib/api';
import type { BlogFilters, BlogList } from '../types/blogs.types';

export function useBlogList(filters: BlogFilters, onExpired: () => void, enabled = true) {
  return useQuery<BlogList, Error>({
    queryKey: blogKeys.list(filters),
    queryFn: async ({ signal }) => {
      try {
        return await blogsApi.list(filters, signal);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          onExpired();
        }
        throw error;
      }
    },
    enabled,
    retry: false,
  });
}

