import { useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import { useBlogCategoryMutation, useBlogCategorySettingsQuery } from '../hooks/useSettings';
import { settingsApi } from '../services/settings.service';
import type { BlogCategoryInput, BlogCategoryPanelProps, BlogCategorySetting } from '../types/settings.types';

export function BlogCategorySettings({ role, onExpired }: BlogCategoryPanelProps) {
  const query = useBlogCategorySettingsQuery();
  const mutation = useBlogCategoryMutation();
  const [editing, setEditing] = useState<BlogCategorySetting | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BlogCategoryInput>({ key: '', name_en: '', name_ar: '' });
  const [error, setError] = useState('');
  useEffect(() => { if (query.error instanceof ApiError && query.error.status === 401) onExpired?.(); }, [query.error, onExpired]);
  const run = async (operation: () => Promise<unknown>) => {
    setError('');
    try { await mutation.mutateAsync(operation); return true; }
    catch (err) { setError(err instanceof ApiError && err.status === 409 ? 'This category conflicts with an existing key or is referenced by content.' : err instanceof ApiError ? err.message : 'Unable to update category.'); return false; }
  };
  const start = (category: BlogCategorySetting | null) => { setEditing(category); setForm(category ? { key: category.key, name_en: category.name_en, name_ar: category.name_ar } : { key: '', name_en: '', name_ar: '' }); setError(''); setOpen(true); };
  return <div className="space-y-4">
    {role === 'admin' && <button className="rounded bg-crimson px-4 py-2 text-white" onClick={() => start(null)}>Add Category</button>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {query.isLoading ? <p role="status">Loading categories…</p> : query.isError ? <p role="alert">Failed to load categories.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Key</th><th>English</th><th>Arabic</th><th>Status</th><th>Posts</th>{role === 'admin' && <th>Actions</th>}</tr></thead><tbody>{query.data?.data.map(category => <tr key={category.id}><td>{category.key}</td><td>{category.name_en}</td><td dir="rtl">{category.name_ar}</td><td>{category.status}</td><td>{category.reference_count}</td>{role === 'admin' && <td className="space-x-2"><button onClick={() => start(category)}>Edit</button>{category.status === 'active' && <button onClick={() => { if (window.confirm(`Retire "${category.name_en}"?`)) void run(() => settingsApi.blogCategoryAction(category.id, 'retire')); }}>Retire</button>}<button onClick={() => { if (window.confirm(`Delete "${category.name_en}"?`)) void run(() => settingsApi.blogCategoryAction(category.id, 'delete')); }}>Delete</button></td>}</tr>)}</tbody></table></div>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div role="dialog" aria-modal="true" aria-labelledby="category-title" className="w-full max-w-lg rounded bg-white p-6"><h2 id="category-title">{editing ? 'Edit Category' : 'Add Category'}</h2><form className="space-y-4" onSubmit={event => { event.preventDefault(); void run(() => settingsApi.saveBlogCategory(form, editing?.id)).then(ok => { if (ok) setOpen(false); }); }}><label className="block">Key<input className="block w-full border p-2" required minLength={2} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={!!editing?.reference_count} value={form.key} onChange={event => setForm({ ...form, key: event.target.value })}/></label>{!!editing?.reference_count && <p>Keys cannot change once referenced by a post.</p>}<label className="block">English label<input className="block w-full border p-2" required value={form.name_en} onChange={event => setForm({ ...form, name_en: event.target.value })}/></label><label className="block">Arabic label<input className="block w-full border p-2" dir="rtl" required value={form.name_ar} onChange={event => setForm({ ...form, name_ar: event.target.value })}/></label>{error && <p role="alert">{error}</p>}<button type="button" onClick={() => setOpen(false)}>Cancel</button> <button type="submit" disabled={mutation.isPending}>Save</button></form></div></div>}
  </div>;
}
