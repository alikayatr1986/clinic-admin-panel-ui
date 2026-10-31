import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlogEditPage } from './BlogEditPage';
import { blogsApi } from '../services/blogs.service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlogDraftProvider } from '../context/BlogDraftContext';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BlogEditPage', () => {
  it('mounts the blog editor with given props', async () => {
    vi.spyOn(blogsApi, 'get').mockResolvedValue({
      data: {
        id: 'post-edit-1',
        slug: 'post-slug',
        category_id: 'cat-1',
        category_key: 'ent-health',
        status: 'draft',
        aggregate_revision: 1,
        first_published_at: null,
        created_at: '',
        updated_at: '',
      },
    });
    vi.spyOn(blogsApi, 'options').mockResolvedValue({
      data: { limits: {}, generation_enabled: false, categories: [] },
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><BlogDraftProvider>
        <BlogEditPage
          postID="post-edit-1"
          role="staff"
          onExpired={vi.fn()}
          onNavigate={vi.fn()}
          onPreview={vi.fn()}
          registerBlocker={vi.fn()}
        />
      </BlogDraftProvider></QueryClientProvider>
    );

    expect(await screen.findByRole('heading', { name: 'post-slug' })).toBeInTheDocument();
  });
});

