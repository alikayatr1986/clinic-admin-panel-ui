import { BlogList } from '../components/BlogList';
import type { BlogListPageProps } from '../types/blogs.types';

export function BlogListPage({ onExpired, onEdit, onCreate }: BlogListPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Articles</h2>
          <p className="text-sm text-slate-600">
            Browse, filter, and review bilingual medical articles.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md bg-crimson px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Create article
        </button>
      </div>

      <BlogList onExpired={onExpired} onEdit={onEdit} embeddedCreate={false} />
    </div>
  );
}

