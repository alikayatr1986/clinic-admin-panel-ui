import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlogCreatePage } from './BlogCreatePage';
import { blogsApi } from '../services/blogs.service';
import { ApiError } from '../../../lib/api';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockOptions = {
  limits: {},
  generation_enabled: false,
  categories: [{ id: 'cat-1', key: 'ent-health', name_en: 'ENT Health', name_ar: 'صحة الأنف' }],
};

describe('BlogCreatePage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  it('renders creation form with options, title and derived slug preview', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValueOnce({ data: mockOptions });
    const onCreated = vi.fn();
    const onCancel = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <BlogCreatePage onExpired={vi.fn()} onCreated={onCreated} onCancel={onCancel} />
      </QueryClientProvider>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading authoring options…');
    expect(await screen.findByRole('button', { name: 'Create draft' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New article draft' })).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toHaveValue('cat-1');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Ear hygiene guide' } });
    expect(screen.getByLabelText('Slug (optional)')).toHaveAttribute('placeholder', 'ear-hygiene-guide');

    const backButton = screen.getByRole('button', { name: '← Back to blog library' });
    fireEvent.click(backButton);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('submits valid category, title, slug, and client-generated UUID idempotency key', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValueOnce({ data: mockOptions });
    const createSpy = vi.spyOn(blogsApi, 'create').mockResolvedValueOnce({ data: { id: 'new-1', aggregate_revision: 1 } });
    const onCreated = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <BlogCreatePage onExpired={vi.fn()} onCreated={onCreated} onCancel={vi.fn()} />
      </QueryClientProvider>
    );

    await screen.findByRole('button', { name: 'Create draft' });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Rhinoplasty guide' } });
    fireEvent.change(screen.getByLabelText('Slug (optional)'), { target: { value: 'rhino-guide' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        'cat-1',
        'rhino-guide',
        expect.stringMatching(/^[0-9a-f-]{36}$/i),
        'Rhinoplasty guide'
      );
      expect(onCreated).toHaveBeenCalledWith('new-1');
    });
  });

  it('locks duplicate submission and asserts in-flight button state', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValueOnce({ data: mockOptions });
    let resolveCreate!: (res: { data: { id: string; aggregate_revision: number } }) => void;
    vi.spyOn(blogsApi, 'create').mockReturnValue(new Promise((res) => { resolveCreate = res; }));

    const onCreated = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <BlogCreatePage onExpired={vi.fn()} onCreated={onCreated} onCancel={vi.fn()} />
      </QueryClientProvider>
    );

    const submitBtn = await screen.findByRole('button', { name: 'Create draft' });
    const backBtn = screen.getByRole('button', { name: '← Back to blog library' });

    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(blogsApi.create).toHaveBeenCalledOnce();
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent('Creating…');
    expect(backBtn).toBeDisabled();

    resolveCreate({ data: { id: 'new-article-1', aggregate_revision: 1 } });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('new-article-1'));
  });

  it('retains form inputs after validation error to permit deliberate retry', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValueOnce({ data: mockOptions });
    vi.spyOn(blogsApi, 'create')
      .mockRejectedValueOnce(new ApiError(422, 'VALIDATION', 'Slug already exists.'))
      .mockResolvedValueOnce({ data: { id: 'new-article-2', aggregate_revision: 1 } });

    const onCreated = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <BlogCreatePage onExpired={vi.fn()} onCreated={onCreated} onCancel={vi.fn()} />
      </QueryClientProvider>
    );

    await screen.findByRole('button', { name: 'Create draft' });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Unique Title' } });
    fireEvent.change(screen.getByLabelText('Slug (optional)'), { target: { value: 'custom-slug' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Slug already exists.');
    expect(screen.getByLabelText('Title')).toHaveValue('Unique Title');
    expect(screen.getByLabelText('Slug (optional)')).toHaveValue('custom-slug');

    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('new-article-2'));
  });

  it('explains zero categories exist and disables submission with an actionable notice', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValueOnce({ data: { ...mockOptions, categories: [] } });
    render(
      <QueryClientProvider client={queryClient}>
        <BlogCreatePage onExpired={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>
    );

    expect(
      await screen.findByText(
        'No categories exist yet. Ask an operator to run the category import.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
  });

  it('renders error alert and retries authoring options failure', async () => {
    vi.spyOn(blogsApi, 'options')
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Failed to load options.'))
      .mockResolvedValueOnce({ data: mockOptions });

    render(
      <QueryClientProvider client={queryClient}>
        <BlogCreatePage onExpired={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load options.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: 'Create draft' })).toBeInTheDocument();
  });

  it('calls onExpired on 401 error during create and options loading', async () => {
    vi.spyOn(blogsApi, 'options').mockResolvedValueOnce({ data: mockOptions });
    vi.spyOn(blogsApi, 'create').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Session expired.'));

    const onExpired = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <BlogCreatePage onExpired={onExpired} onCreated={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>
    );

    const submitBtn = await screen.findByRole('button', { name: 'Create draft' });
    fireEvent.click(submitBtn);

    await waitFor(() => expect(onExpired).toHaveBeenCalledOnce());
  });

  it('invokes onExpired when options loading fails with 401', async () => {
    vi.spyOn(blogsApi, 'options').mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', 'Session expired.'));
    const onExpired = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <BlogCreatePage onExpired={onExpired} onCreated={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>
    );

    await waitFor(() => expect(onExpired).toHaveBeenCalledOnce());
  });
});
