import { useQuery } from '@tanstack/react-query';
import { blogsApi } from '../services/blogs.service';
import { blogKeys } from './blog.keys';
import { ApiError } from '../../../lib/api';
import type { BlogOptions } from '../types/blogs.types';

export function useBlogOptions(onExpired: () => void) {
  return useQuery<BlogOptions, Error>({
    queryKey: blogKeys.options(),
    queryFn: async ({ signal }) => {
      try {
        const { data } = await blogsApi.options(signal);
        return data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          onExpired();
        }
        throw error;
      }
    },
    retry: false,
  });
}

