import { BlogEditor } from '../components/BlogEditor';
import type { BlogEditPageProps } from '../types/blogs.types';

export function BlogEditPage({
  postID,
  role = 'staff',
  onExpired,
  onNavigate,
  onDeleted = onNavigate,
  registerBlocker,
}: BlogEditPageProps) {
  return (
    <div className="space-y-6">
      <BlogEditor
        postID={postID}
        role={role}
        onExpired={onExpired}
        onNavigate={onNavigate}
        onDeleted={onDeleted}
        registerBlocker={registerBlocker}
      />
    </div>
  );
}

