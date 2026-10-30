import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import corpus from '../../../../../fixtures/blog-body-conformance.json';
import { blogsApi } from '../services/blogs.service';
import type { BlogBody as Body, BlogPreviewDetail } from '../types/blogs.types';
import { BlogBody, BlogPreview, safeBlogHref } from './BlogPreview';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const article: BlogPreviewDetail = { id: 'p', slug: 'post', lang: 'ar', title: 'عنوان محفوظ', excerpt: 'ملخص', category: { key: 'ent-health', label: 'الصحة' }, first_published_at: '', last_published_at: '', reading_time_minutes: 1, author_name: 'Clinic', cover: null, body: { schema_version: 1, blocks: [{ type: 'paragraph', text: 'Saved body' }] }, references: [] };

describe('shared body conformance', () => {
  for (const fixture of corpus.cases) it(fixture.name, () => {
    const { container } = render(<BlogBody body={fixture.body as Body} />);
    expect([...container.querySelectorAll('h2,h3')].map((node) => node.id)).toEqual(fixture.anchors);
    expect([...container.querySelectorAll('strong')].map((node) => node.textContent)).toEqual(fixture.strong);
    expect([...container.querySelectorAll('em')].map((node) => node.textContent)).toEqual(fixture.em);
    expect([...container.querySelectorAll('a')].map((node) => node.getAttribute('href'))).toEqual(fixture.links);
    fixture.text.forEach((text) => expect(container.textContent).toContain(text));
    if (fixture.name.startsWith('intersecting')) expect(container.textContent).toBe('abcdefgh');
    expect(container.querySelector('a a')).toBeNull();
    expect(container.querySelector('script,iframe,img')).toBeNull();
  });
  it('rejects credentials, protocol relative, backslash and control character links', () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', '/\\evil.test', 'https://name:pass@example.com', 'https://example.com\n', ' https://example.com']) expect(safeBlogHref(href)).toBe(false);
  });
});

describe('BlogPreview', () => {
  it('focuses preview and opens approved body/reference links safely in another tab', async () => {
    vi.spyOn(blogsApi, 'preview').mockResolvedValue({ data: { ...article, body: { schema_version: 1, blocks: [{ type: 'paragraph', text: 'Local link', marks: [{ type: 'link', start: 0, end: 10, href: '/blog/article' }] }] }, references: [{ label: 'Source', url: 'https://example.com' }] } });
    render(<BlogPreview postID="p" locale="ar" revision={1} dirty onClose={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Saved article preview' })).toHaveFocus();
    await screen.findByRole('link', { name: 'Source' });
    for (const link of screen.getAllByRole('link')) { expect(link).toHaveAttribute('target', '_blank'); expect(link).toHaveAttribute('rel', 'noreferrer noopener'); }
  });
  it('requests only the exact saved revision and switches one RTL tree width', async () => {
    const preview = vi.spyOn(blogsApi, 'preview').mockResolvedValue({ data: article });
    const { container } = render(<BlogPreview postID="p" locale="ar" revision={17} dirty onClose={vi.fn()} />);
    expect(await screen.findByText(article.title)).toBeInTheDocument(); expect(preview).toHaveBeenCalledWith('p', 'ar', 17);
    expect(screen.getByText(/unsaved edits are not included/)).toBeInTheDocument(); const tree = container.querySelector('article');
    expect(tree).toHaveAttribute('dir', 'rtl'); fireEvent.click(screen.getByRole('button', { name: 'Mobile width' }));
    expect(container.querySelector('article')).toBe(tree); expect(tree).toHaveAttribute('data-preview-width', 'mobile'); expect(container.querySelectorAll('article')).toHaveLength(1);
  });
  it('never substitutes a missing revision and retries a failed exact read', async () => {
    const preview = vi.spyOn(blogsApi, 'preview').mockRejectedValueOnce(new Error('missing')).mockResolvedValue({ data: article });
    const { rerender } = render(<BlogPreview postID="p" locale="ar" dirty onClose={vi.fn()} />);
    expect(screen.getByText(/No saved revision exists/)).toBeInTheDocument(); expect(preview).not.toHaveBeenCalled();
    rerender(<BlogPreview postID="p" locale="ar" revision={8} dirty onClose={vi.fn()} />);
    expect(await screen.findByText(/Saved preview could not/)).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Retry preview' }));
    expect(await screen.findByText(article.title)).toBeInTheDocument(); expect(preview).toHaveBeenLastCalledWith('p', 'ar', 8);
  });
});
