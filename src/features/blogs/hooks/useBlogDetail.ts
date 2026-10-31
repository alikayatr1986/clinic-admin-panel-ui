import { useQuery } from '@tanstack/react-query';
import { blogsApi } from '../services/blogs.service';
import { blogKeys } from './blog.keys';
import { ApiError } from '../../../lib/api';
import type { BlogDetail } from '../types/blogs.types';

export function useBlogDetail(postID: string, onExpired: () => void) {
  return useQuery<BlogDetail, Error>({
    queryKey: blogKeys.detail(postID),
    queryFn: async ({ signal }) => {
      try {
        const { data } = await blogsApi.get(postID, signal);
        return data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          onExpired();
        }
        throw error;
      }
    },
    enabled: Boolean(postID),
    retry: false,
  });
}

