import { BlogList } from '../components/BlogList';
import type { BlogListPageProps } from '../types/blogs.types';
import { Button } from '@/components/ui/button';

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
        <Button
          type="button"
          onClick={onCreate}
        >
          Create article
        </Button>
      </div>

      <BlogList onExpired={onExpired} onEdit={onEdit} embeddedCreate={false} />
    </div>
  );
}

