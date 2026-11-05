import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { BlogCategorySettings } from './BlogCategorySettings';
import { settingsApi } from '../services/settings.service';
import { ApiError } from '../../../lib/api';

const category = {
  id: '1',
  key: 'nose-care',
  name_en: 'Nose care',
  name_ar: 'العناية',
  status: 'active' as const,
  reference_count: 1,
};

function show(role: string) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <BlogCategorySettings role={role} />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('shows staff categories without mutation controls', async () => {
  vi.spyOn(settingsApi, 'listBlogCategories').mockResolvedValue({ data: [category] });
  show('staff');
  expect(await screen.findByText('nose-care')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
});

it('explains a restricted deletion', async () => {
  vi.spyOn(settingsApi, 'listBlogCategories').mockResolvedValue({
    data: [{ ...category, reference_count: 0 }],
  });
  vi.spyOn(settingsApi, 'blogCategoryAction').mockRejectedValue(
    new ApiError(409, 'CONFLICT', 'Conflict')
  );
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  show('admin');
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('referenced by content'));
});

it('opens dialog, accepts input filling, and cancels cleanly', async () => {
  vi.spyOn(settingsApi, 'listBlogCategories').mockResolvedValue({ data: [] });
  show('admin');

  expect(await screen.findByText('No blog categories found.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Add Category' })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'skincare' } });
  fireEvent.change(screen.getByLabelText('English label'), { target: { value: 'Skincare' } });
  fireEvent.change(screen.getByLabelText('Arabic label'), { target: { value: 'العناية بالبشرة' } });

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('locks inputs, disables cancel, and ignores escape during in-flight mutation', async () => {
  vi.spyOn(settingsApi, 'listBlogCategories').mockResolvedValue({ data: [] });
  let resolveSave!: (val: unknown) => void;
  const pendingSave = new Promise((resolve) => {
    resolveSave = resolve;
  });
  vi.spyOn(settingsApi, 'saveBlogCategory').mockReturnValue(pendingSave as any);

  show('admin');
  fireEvent.click(await screen.findByRole('button', { name: 'Add Category' }));

  fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'recovery' } });
  fireEvent.change(screen.getByLabelText('English label'), { target: { value: 'Recovery' } });
  fireEvent.change(screen.getByLabelText('Arabic label'), { target: { value: 'التعافي' } });

  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => {
    expect(screen.getByLabelText('Key')).toBeDisabled();
  });
  expect(screen.getByLabelText('English label')).toBeDisabled();
  expect(screen.getByLabelText('Arabic label')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

  // Escape is ignored
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  // Resolve save mutation
  resolveSave({ data: { id: '2', key: 'recovery' } });
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

it('disables delete button with tooltip when category reference_count > 0', async () => {
  vi.spyOn(settingsApi, 'listBlogCategories').mockResolvedValue({
    data: [{ ...category, reference_count: 3 }],
  });
  show('admin');

  const deleteBtn = await screen.findByRole('button', { name: 'Delete' });
  expect(deleteBtn).toBeDisabled();
  expect(deleteBtn).toHaveAttribute(
    'title',
    'Referenced categories cannot be deleted; retire them instead.'
  );
});
