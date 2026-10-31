import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, describeError } from '../../../lib/api';
import { blogsApi } from '../services/blogs.service';
import { useBlogOptions } from '../hooks/useBlogOptions';
import { blogKeys } from '../hooks/blog.keys';
import { BlogCreateForm } from '../components/BlogCreateForm';
import type { BlogCreateData, BlogCreatePageProps } from '../types/blogs.types';

export function BlogCreatePage({ onExpired, onCreated, onCancel }: BlogCreatePageProps) {
  const queryClient = useQueryClient();
  const { data: options, isLoading, error: optionsError, refetch } = useBlogOptions(onExpired);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  );

  async function handleCreate(data: BlogCreateData) {
    if (submittingRef.current || creating) return;
    submittingRef.current = true;
    setCreating(true);
    setCreateError('');
    try {
      const result = await blogsApi.create(
        data.categoryID,
        data.slug,
        idempotencyKeyRef.current,
        data.title
      );
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
      onCreated(result.data.id);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        onExpired();
      } else {
        setCreateError(describeError(failure));
      }
    } finally {
      submittingRef.current = false;
      setCreating(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={creating}
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          ← Back to blog library
        </button>
      </div>

      <section
        aria-label="Create article draft"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold">New article draft</h2>
        <p className="mt-1 text-sm text-slate-600">
          Set the category and initial title. Bilingual body editing and AI assistance begin once the draft is created.
        </p>

        {isLoading ? (
          <p role="status" className="mt-5 text-slate-600">
            Loading authoring options…
          </p>
        ) : optionsError ? (
          <div role="alert" className="mt-5 rounded-md bg-red-50 p-4 text-red-800">
            <p>{describeError(optionsError)}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-md bg-crimson px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : (
          <BlogCreateForm
            options={options ?? null}
            creating={creating}
            createError={createError}
            onSubmit={handleCreate}
            onCancel={onCancel}
          />
        )}
      </section>
    </div>
  );
}
