import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import { BlogGenerator } from './BlogGenerator';
import type { BlogGenerationJob } from '../types/blogs.types';

function render(element: ReactElement) { const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } }); const Wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>; return rtlRender(element, { wrapper: Wrapper }); }

describe('BlogGenerator', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  const baseProps = {
    postID: 'post-1',
    locale: 'en' as const,
    baseRevision: 2,
    dirty: false,
    currentDraft: {
      title: 'Current Title',
      excerpt: 'Current Excerpt',
      seoTitle: 'Current SEO',
      seoDescription: 'Current SEO Desc',
    },
    onRefresh: vi.fn().mockResolvedValue(undefined),
    onApplied: vi.fn(),
  };

  it('validates required fields and privacy confirmation before queuing a job (AC-10.1)', async () => {
    render(<BlogGenerator {...baseProps} />);

    // Attempting to submit without confirmation should be blocked (button disabled)
    const submitBtn = screen.getByRole('button', { name: /Start AI drafting for EN/i });
    expect(submitBtn).toBeDisabled();

    // Check confirmation
    const confirmCheckbox = screen.getByRole('checkbox', { name: /No patient data/i });
    fireEvent.click(confirmCheckbox);
    expect(submitBtn).toBeEnabled();

    // Submit with empty topic/instructions
    fireEvent.click(submitBtn);
    expect(await screen.findByText('Topic is required.')).toBeInTheDocument();
    expect(screen.getByText('Instructions are required.')).toBeInTheDocument();

    // Fill valid brief
    fireEvent.change(screen.getByPlaceholderText(/Rhinoplasty recovery timeline/i), {
      target: { value: 'Rhinoplasty guide' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Specific guidance for style/i), {
      target: { value: 'Focus on recovery week by week' },
    });

    const queueSpy = vi.spyOn(blogsApi, 'queueGeneration').mockResolvedValue({
      data: {
        id: 'job-123',
        post_id: 'post-1',
        language: 'en',
        status: 'queued',
        source_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => expect(queueSpy).toHaveBeenCalled());
    expect(queueSpy).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        lang: 'en',
        base_revision: 2,
        brief: expect.objectContaining({
          topic: 'Rhinoplasty guide',
          instructions: 'Focus on recovery week by week',
        }),
      })
    );

    expect(await screen.findByText('Status: queued')).toBeInTheDocument();
    expect(localStorage.getItem('blog_gen_job_post-1_en')).toBe('job-123');
  });

  it('restores persisted job from localStorage and bounds polling (AC-10.2)', async () => {
    localStorage.setItem('blog_gen_job_post-1_en', 'job-persisted');

    const getSpy = vi.spyOn(blogsApi, 'getGeneration').mockResolvedValue({
      data: {
        id: 'job-persisted',
        post_id: 'post-1',
        language: 'en',
        status: 'running',
        source_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    render(<BlogGenerator {...baseProps} />);

    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('post-1', 'job-persisted', expect.anything()));
    expect(await screen.findByText('Status: running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel job/i })).toBeInTheDocument();
  });

  it('allows canceling an in-flight job (AC-10.2)', async () => {
    localStorage.setItem('blog_gen_job_post-1_en', 'job-cancel');

    vi.spyOn(blogsApi, 'getGeneration').mockResolvedValue({
      data: {
        id: 'job-cancel',
        post_id: 'post-1',
        language: 'en',
        status: 'running',
        source_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    const cancelSpy = vi.spyOn(blogsApi, 'cancelGeneration').mockResolvedValue({ data: {} });

    render(<BlogGenerator {...baseProps} />);

    const cancelBtn = await screen.findByRole('button', { name: /Cancel job/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith('post-1', 'job-cancel'));
    expect(await screen.findByText('Status: canceled')).toBeInTheDocument();
  });

  it('renders review panel when job succeeds and blocks apply if dirty (AC-10.3)', async () => {
    const succeededJob: BlogGenerationJob = {
      id: 'job-success',
      post_id: 'post-1',
      language: 'en',
      status: 'succeeded',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      source_ids: ['src-1'],
      result: {
        title: 'Generated Rhinoplasty Guide',
        excerpt: 'Generated excerpt text',
        body: {
          schema_version: 1,
          blocks: [{ type: 'paragraph', text: 'Generated paragraph 1' }],
        },
        seo_title: 'SEO Title Generated',
        seo_description: 'SEO Desc Generated',
        source_ids: ['src-1'],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem('blog_gen_job_post-1_en', 'job-success');
    vi.spyOn(blogsApi, 'getGeneration').mockResolvedValue({ data: succeededJob });

    // Render with dirty=true
    const { rerender } = render(<BlogGenerator {...baseProps} dirty={true} />);

    expect(await screen.findByText(/Generated result \(review needed\)/i)).toBeInTheDocument();
    expect(screen.getByText('Generated Rhinoplasty Guide')).toBeInTheDocument();
    expect(screen.getByText('Current Title')).toBeInTheDocument();

    // Apply button must be disabled due to dirty draft
    const applyBtn = screen.getByRole('button', { name: /Apply selected/i });
    expect(applyBtn).toBeDisabled();
    expect(screen.getByText(/Save or discard your unsaved manual edits/i)).toBeInTheDocument();

    // Rerender with dirty=false
    rerender(<BlogGenerator {...baseProps} dirty={false} />);
    expect(applyBtn).toBeEnabled();

    const applySpy = vi.spyOn(blogsApi, 'applyGeneration').mockResolvedValue({ data: {} });
    fireEvent.click(applyBtn);

    await waitFor(() => expect(applySpy).toHaveBeenCalledWith('post-1', 'job-success', expect.arrayContaining(['title', 'excerpt', 'body', 'seo_title', 'seo_description'])));
    expect(baseProps.onRefresh).toHaveBeenCalled();
    expect(localStorage.getItem('blog_gen_job_post-1_en')).toBeNull();
  });

  it('shows unreviewed warning for Arabic generation (AC-10.4)', async () => {
    const succeededJobAr: BlogGenerationJob = {
      id: 'job-ar',
      post_id: 'post-1',
      language: 'ar',
      status: 'succeeded',
      provider: 'gemini',
      source_ids: [],
      result: {
        title: 'دليل تجميل الأنف',
        excerpt: 'موجز المقال',
        body: {
          schema_version: 1,
          blocks: [{ type: 'paragraph', text: 'فقرة' }],
        },
        seo_title: '',
        seo_description: '',
        source_ids: [],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem('blog_gen_job_post-1_ar', 'job-ar');
    vi.spyOn(blogsApi, 'getGeneration').mockResolvedValue({ data: succeededJobAr });

    render(<BlogGenerator {...baseProps} locale="ar" />);

    expect(await screen.findByText(/Generated Arabic content requires certified medical and translation review/i)).toBeInTheDocument();
  });

  it('reports budget exhausted feedback when limit reached (AC-10.2)', async () => {
    render(<BlogGenerator {...baseProps} />);

    const confirmCheckbox = screen.getByRole('checkbox', { name: /No patient data/i });
    fireEvent.click(confirmCheckbox);

    fireEvent.change(screen.getByPlaceholderText(/Rhinoplasty recovery timeline/i), {
      target: { value: 'Topic' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Specific guidance for style/i), {
      target: { value: 'Instructions' },
    });

    vi.spyOn(blogsApi, 'queueGeneration').mockRejectedValue(
      new ApiError(422, 'BLOG_BUDGET_EXHAUSTED', 'Daily AI generation budget reached. Try again tomorrow or edit manually.')
    );

    const submitBtn = screen.getByRole('button', { name: /Start AI drafting for EN/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Daily AI generation budget reached/i)).toBeInTheDocument();
  });
});

