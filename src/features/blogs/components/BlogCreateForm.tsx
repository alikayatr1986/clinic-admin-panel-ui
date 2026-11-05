import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BlogCreateFormProps } from '../types/blogs.types';

export function slugPreview(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-$/, '');
}

export function BlogCreateForm({
  options,
  creating,
  createError,
  onSubmit,
  onCancel,
}: BlogCreateFormProps) {
  const [selectedCategoryID, setSelectedCategoryID] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');

  const hasSelected = Boolean(options?.categories?.some((c) => c.id === selectedCategoryID));
  const categoryID = hasSelected ? selectedCategoryID : options?.categories?.[0]?.id ?? '';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (creating || !categoryID) return;
    await onSubmit({ categoryID, slug, title });
  }

  const noCategories = options && options.categories.length === 0;

  return (
    <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="new-blog-category">Category</Label>
        <select
          id="new-blog-category"
          required
          value={categoryID}
          onChange={(e) => setSelectedCategoryID(e.target.value)}
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="" disabled>
            {options?.categories.length ? 'Select a category' : 'No categories available'}
          </option>
          {options?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en}
            </option>
          ))}
        </select>
        {noCategories && (
          <p role="status" className="mt-2 text-sm text-red-800">
            No categories exist yet. Ask an operator to run the category import.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="new-blog-title">Title</Label>
        <Input
          id="new-blog-title"
          maxLength={180}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-2 w-full"
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="new-blog-slug">Slug (optional)</Label>
        <Input
          id="new-blog-slug"
          value={slug}
          placeholder={slugPreview(title)}
          onChange={(e) => setSlug(e.target.value)}
          className="mt-2 w-full"
        />
        <p className="mt-1 text-sm text-slate-600">Leave empty to use a slug made from the title.</p>
      </div>

      {createError && (
        <p role="alert" className="text-destructive font-medium text-sm sm:col-span-2">
          {createError}
        </p>
      )}

      <div className="sm:col-span-2 flex items-center gap-3">
        <Button
          type="submit"
          disabled={creating || !categoryID || Boolean(noCategories)}
        >
          {creating ? 'Creating…' : 'Create draft'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={creating}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
