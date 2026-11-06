import { useOutletContext, useParams } from 'react-router-dom';
import { DashboardPage } from '../features/dashboard/components/DashboardPage';
import { BlogListPage } from '../features/blogs/pages/BlogListPage';
import { BlogCreatePage } from '../features/blogs/pages/BlogCreatePage';
import { BlogDetailPage } from '../features/blogs/pages/BlogDetailPage';
import { BlogEditPage } from '../features/blogs/pages/BlogEditPage';
import { GalleryContentEditor } from '../features/gallery/components/GalleryContentEditor';
import { GalleryListPage } from '../features/gallery/pages/GalleryListPage';
import { GalleryCreatePage } from '../features/gallery/pages/GalleryCreatePage';
import { GalleryDetailPage } from '../features/gallery/pages/GalleryDetailPage';
import { GalleryEditPage } from '../features/gallery/pages/GalleryEditPage';
import { LeadList } from '../features/leads/components/LeadList';
import { LeadDetail } from '../features/leads/components/LeadDetail';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import type { GalleryEditorPageProps } from '../features/gallery/types/gallery.case-editor.types';
import type { RouteContext } from './route-context.types';

const useRoute = () => useOutletContext<RouteContext>();
export function DashboardRoute() { const { onExpired } = useRoute(); return <DashboardPage onExpired={onExpired} />; }
export function NotFoundRoute() { return <p role="alert">This page could not be found.</p>; }
export function SettingsRoute() { const c = useRoute(); return <SettingsPage role={c.session.role} onExpired={c.onExpired} />; }
export function BlogListRoute() { const c = useRoute(); return <BlogListPage onExpired={c.onExpired} onCreate={() => c.navigate('/admin/blogs/new')} onEdit={(id) => c.navigate(`/admin/blogs/${encodeURIComponent(id)}?returnTo=${encodeURIComponent(c.blogReturn)}`)} />; }
export function BlogCreateRoute() { const c = useRoute(); return <BlogCreatePage onExpired={c.onExpired} onCreated={(id) => c.navigate(`/admin/blogs/${encodeURIComponent(id)}/edit`)} onCancel={() => c.navigate(c.blogReturn)} />; }
export function BlogDetailRoute() { const c = useRoute(); const { id = '' } = useParams(); return <BlogDetailPage key={id} postID={id} role={c.session.role} onExpired={c.onExpired} onEdit={(value) => c.navigate(`/admin/blogs/${encodeURIComponent(value)}/edit?returnTo=${encodeURIComponent(c.blogReturn)}`)} onPreview={(value) => c.navigate(`/admin/blogs/${encodeURIComponent(value)}/preview?returnTo=${encodeURIComponent(c.blogReturn)}`)} onBack={() => c.navigate(c.blogReturn)} onDeleted={c.onBlogDeleted} />; }
export function BlogEditRoute() { const c = useRoute(); const { id = '' } = useParams(); return <BlogEditPage key={id} postID={id} role={c.session.role} onExpired={c.onExpired} onNavigate={() => c.navigate(c.blogReturn)} onPreview={(value) => c.navigate(`/admin/blogs/${encodeURIComponent(value)}/preview?returnTo=${encodeURIComponent(c.blogReturn)}`)} onDeleted={c.onBlogDeleted} registerBlocker={c.registerBlocker} />; }
export function GalleryListRoute() { const c = useRoute(); return <GalleryListPage onExpired={c.onExpired} onContent={() => c.navigate('/admin/gallery/content')} onCreate={() => c.navigate(`/admin/gallery/new?returnTo=${encodeURIComponent(c.galleryReturn)}`)} onEdit={(id) => c.navigate(`/admin/gallery/${encodeURIComponent(id)}?returnTo=${encodeURIComponent(c.galleryReturn)}`)} />; }
export function GalleryDetailRoute() { const c = useRoute(); const { id = '' } = useParams(); return <GalleryDetailPage caseID={id} onExpired={c.onExpired} onEdit={(value) => c.navigate(`/admin/gallery/${encodeURIComponent(value)}/edit?returnTo=${encodeURIComponent(c.galleryReturn)}`)} onBack={() => c.navigate(c.galleryReturn)} />; }
export function GalleryEditorRoute() { const c = useRoute(); const { id } = useParams(); const props = { caseID: id ?? 'new', onExpired: c.onExpired, registerBlocker: c.registerBlocker, onNavigate: ((view, options) => c.navigate(view === 'gallery' ? c.galleryReturn : `/admin/gallery/${encodeURIComponent(options?.id ?? '')}/edit?returnTo=${encodeURIComponent(c.galleryReturn)}`, options)) as GalleryEditorPageProps['onNavigate'] }; return id ? <GalleryEditPage key={id} {...props} /> : <GalleryCreatePage {...props} />; }
export function LeadListRoute() { const c = useRoute(); return c.session.role !== 'admin' ? <p role="alert">Access denied. Administrator access is required.</p> : <LeadList onExpired={c.onExpired} onOpen={(id) => c.navigate(`/admin/leads/${encodeURIComponent(id)}`)} />; }
export function LeadDetailRoute() { const c = useRoute(); const { id = '' } = useParams(); return c.session.role !== 'admin' ? <p role="alert">Access denied. Administrator access is required.</p> : <LeadDetail key={id} id={id} onExpired={c.onExpired} onBack={() => c.navigate('/admin/leads')} />; }

export function GalleryContentRoute() { const c = useRoute(); return <GalleryContentEditor username={c.session.username} onExpired={c.onExpired} onBack={() => c.navigate(c.galleryReturn)} registerBlocker={c.registerBlocker} />; }
