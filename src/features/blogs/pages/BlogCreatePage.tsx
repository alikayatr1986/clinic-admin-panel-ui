import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { ApiError, describeError } from '../../../lib/api';
import { useBlogOptions } from '../hooks/useBlogOptions';
import { useCreateBlogPost } from '../hooks/useBlogMutations';
import { BlogCreateForm } from '../components/BlogCreateForm';
import { BlogGuidedNavigation } from '../components/guided-editor/BlogGuidedNavigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BlogCreateData, BlogCreatePageProps } from '../types/blogs.types';

export function BlogCreatePage({ onExpired, onCreated, onCancel }: BlogCreatePageProps) {
  const { data: options, isLoading, error: optionsError, refetch } = useBlogOptions(onExpired);
  const createPost = useCreateBlogPost();
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
      const result = await createPost.mutateAsync({
        categoryID: data.categoryID,
        slug: data.slug,
        idempotencyKey: idempotencyKeyRef.current,
        title: data.title,
      });
      toast.success('Article draft created.');
      onCreated(result.id);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        onExpired();
      } else {
        toast.error('Could not create the article draft. Check the form and try again.');
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={creating}
          onClick={onCancel}
        >
          ← Back to blog library
        </Button>
      </div>

      <Card
        aria-label="Create article draft"
        className="p-6"
      >
        <BlogGuidedNavigation current="Start" />
        <h2 className="mt-4 text-xl font-semibold">New article draft</h2>
        <p className="text-sm text-slate-600">Step 1 of 5: Start</p>
        <p className="mt-1 text-sm text-slate-600">
          Set the category and initial title. Bilingual body editing and AI assistance begin once the draft is created.
        </p>

        {isLoading ? (
          <p role="status" className="mt-5 text-slate-600">
            Loading authoring options…
          </p>
        ) : optionsError ? (
          <div role="alert" className="mt-5 border border-destructive/20 bg-destructive/10 text-destructive rounded-md p-4">
            <p>{describeError(optionsError)}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              className="mt-3"
            >
              Retry
            </Button>
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
      </Card>
    </div>
  );
}
