import { useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { useBlogCategoryActionMutation, useBlogCategorySettingsQuery, useSaveBlogCategoryMutation } from '../hooks/useSettings';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  BlogCategoryInput,
  BlogCategoryPanelProps,
  BlogCategorySetting,
} from '../types/settings.types';

export function BlogCategorySettings({ role, onExpired }: BlogCategoryPanelProps) {
  const isAdmin = role === 'admin';
  const query = useBlogCategorySettingsQuery();
  const saveMutation = useSaveBlogCategoryMutation();
  const actionMutation = useBlogCategoryActionMutation();
  const pending = saveMutation.isPending || actionMutation.isPending;
  const [editing, setEditing] = useState<BlogCategorySetting | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BlogCategoryInput>({ key: '', name_en: '', name_ar: '' });
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      onExpired?.();
    }
  }, [query.error, onExpired]);

  const run = async (operation: () => Promise<unknown>) => {
    setError('');
    try {
      await operation();
      return true;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'This category conflicts with an existing key or is referenced by content.'
          : err instanceof ApiError
          ? err.message
          : 'Unable to update category.'
      );
      return false;
    }
  };

  const start = (category: BlogCategorySetting | null) => {
    setEditing(category);
    setForm(
      category
        ? { key: category.key, name_en: category.name_en, name_ar: category.name_ar }
        : { key: '', name_en: '', name_ar: '' }
    );
    setDialogError(null);
    setOpen(true);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDialogError(null);
    try {
      await saveMutation.mutateAsync({ input: form, id: editing?.id });
      setOpen(false);
      setDialogError(null);
    } catch (err) {
      setDialogError(
        err instanceof ApiError && err.status === 409
          ? 'This category conflicts with an existing key or is referenced by content.'
          : err instanceof ApiError
          ? err.message
          : 'Unable to update category.'
      );
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button type="button" onClick={() => start(null)}>
          Add Category
        </Button>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {query.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading categories…
        </p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Failed to load categories.
        </p>
      ) : (
        <Table aria-label="Blog categories list">
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>English</TableHead>
              <TableHead>Arabic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Posts</TableHead>
              {isAdmin && <TableHead className="text-end">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">
                  <span className="text-muted-foreground">No blog categories found.</span>
                </TableCell>
              </TableRow>
            ) : (
              query.data?.data.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-mono font-medium">{category.key}</TableCell>
                  <TableCell>{category.name_en}</TableCell>
                  <TableCell className="font-arabic" dir="rtl">{category.name_ar}</TableCell>
                  <TableCell>
                    <Badge
                      variant={category.status === 'active' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {category.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono">{category.reference_count}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => start(category)}>
                          Edit
                        </Button>
                        {category.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Retire "${category.name_en}"?`)) {
                                void run(() => actionMutation.mutateAsync({ id: category.id, action: 'retire' }));
                              }
                            }}
                          >
                            Retire
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={category.reference_count > 0}
                          title={
                            category.reference_count > 0
                              ? 'Referenced categories cannot be deleted; retire them instead.'
                              : undefined
                          }
                          onClick={() => {
                            if (window.confirm(`Delete "${category.name_en}"?`)) {
                              void run(() => actionMutation.mutateAsync({ id: category.id, action: 'delete' }));
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!val && !pending) {
            setOpen(false);
            setDialogError(null);
          }
        }}
      >
        <DialogContent
          onEscapeKeyDown={(e) => {
            if (pending) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update category details and localized labels.'
                : 'Create a new blog category for organizing articles.'}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="category-key">Key</Label>
              <Input
                id="category-key"
                required
                minLength={2}
                maxLength={50}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                disabled={!!editing?.reference_count || pending}
                value={form.key}
                onChange={(event) => setForm({ ...form, key: event.target.value })}
              />
              {!!editing?.reference_count && (
                <p className="text-xs text-muted-foreground">
                  Keys cannot change once referenced by a post.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-name-en">English label</Label>
              <Input
                id="category-name-en"
                required
                disabled={pending}
                value={form.name_en}
                onChange={(event) => setForm({ ...form, name_en: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-name-ar">Arabic label</Label>
              <Input
                id="category-name-ar"
                dir="rtl"
                required
                disabled={pending}
                value={form.name_ar}
                onChange={(event) => setForm({ ...form, name_ar: event.target.value })}
              />
            </div>

            {dialogError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {dialogError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  if (!pending) {
                    setOpen(false);
                    setDialogError(null);
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
