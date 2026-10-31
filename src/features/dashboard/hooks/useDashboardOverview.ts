import { useQuery } from '@tanstack/react-query';
import { galleryApi } from '../../gallery/services/gallery.service';
import { galleryKeys } from '../../gallery/hooks/gallery.keys';
import { ApiError } from '../../../lib/api';
import type { DashboardOverview } from '../types/dashboard.types';

export function useDashboardOverview(onExpired: () => void) {
  return useQuery<DashboardOverview, Error>({
    queryKey: galleryKeys.list({ page: 1, page_size: 1 }),
    queryFn: async () => {
      try {
        const response = await galleryApi.list({ page: 1, page_size: 1 });
        return { totalGalleryCases: response.total };
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

