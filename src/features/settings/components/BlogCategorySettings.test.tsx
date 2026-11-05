import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { BlogCategorySettings } from './BlogCategorySettings';
import { settingsApi } from '../services/settings.service';
import { ApiError } from '../../../lib/api';

const category = { id: '1', key: 'nose-care', name_en: 'Nose care', name_ar: 'العناية', status: 'active' as const, reference_count: 1 };
function show(role: string) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><BlogCategorySettings role={role} /></QueryClientProvider>); }
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('shows staff categories without mutation controls', async () => {
  vi.spyOn(settingsApi, 'listBlogCategories').mockResolvedValue({ data: [category] });
  show('staff'); expect(await screen.findByText('nose-care')).toBeInTheDocument(); expect(screen.getByText('1')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
});
it('explains a restricted deletion', async () => {
  vi.spyOn(settingsApi, 'listBlogCategories').mockResolvedValue({ data: [category] });
  vi.spyOn(settingsApi, 'blogCategoryAction').mockRejectedValue(new ApiError(409, 'CONFLICT', 'Conflict'));
  vi.spyOn(window, 'confirm').mockReturnValue(true); show('admin');
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('referenced by content'));
});
