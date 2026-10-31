import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlogDraftProvider, useBlogDraft } from './BlogDraftContext';
import type { BlogDraftRecord } from '../types/blogs.types';

describe('BlogDraftContext', () => {
  it('throws error when useBlogDraft is used outside BlogDraftProvider', () => {
    expect(() => renderHook(() => useBlogDraft('post-1'))).toThrow(
      'useBlogDraft must be used within a BlogDraftProvider'
    );
  });

  it('stores and retrieves drafts by postID', () => {
    const { result } = renderHook(() => useBlogDraft('post-1'), {
      wrapper: BlogDraftProvider,
    });

    expect(result.current.draft).toBeUndefined();
    expect(result.current.isDirty).toBe(false);

    const draftRecord: BlogDraftRecord = {
      saved: { en: { slug: '', categoryID: '', title: '', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] }, ar: { slug: '', categoryID: '', title: '', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] } },
      file: null, rights: '', focalX: 0.5, focalY: 0.5,
      dirty: true,
      locale: 'en',
      forms: {
        en: { slug: '', categoryID: '', title: 'Draft English Title', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] },
        ar: { slug: '', categoryID: '', title: 'Draft Arabic Title', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] },
      },
    };

    act(() => {
      result.current.saveDraft(draftRecord);
    });

    expect(result.current.draft).toEqual(draftRecord);
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.clearDraft();
    });

    expect(result.current.draft).toBeUndefined();
    expect(result.current.isDirty).toBe(false);
  });

  it('isolates drafts between different postIDs', () => {
    const { result } = renderHook(() => ({ first: useBlogDraft('post-1'), second: useBlogDraft('post-2') }), { wrapper: BlogDraftProvider });

    act(() => {
      result.current.first.saveDraft({
        saved: { en: { slug: '', categoryID: '', title: '', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] }, ar: { slug: '', categoryID: '', title: '', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] } },
        file: null, rights: '', focalX: 0.5, focalY: 0.5,
        dirty: true,
        locale: 'en',
        forms: { en: { slug: '', categoryID: '', title: 'P1', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] }, ar: { slug: '', categoryID: '', title: '', excerpt: '', author: '', reviewer: '', coverMediaID: null, coverAlt: '', seoTitle: '', seoDescription: '', blocks: [], references: [] } },
      });
    });

    const first = result.current.first.draft!;
    act(() => { result.current.second.saveDraft({ ...first, forms: { ...first.forms, en: { ...first.forms.en, title: 'P2' } } }); });
    expect(result.current.first.draft?.forms.en.title).toBe('P1');
    expect(result.current.second.draft?.forms.en.title).toBe('P2');
    act(() => { result.current.first.clearDraft(); });
    expect(result.current.first.draft).toBeUndefined();
    expect(result.current.second.draft?.forms.en.title).toBe('P2');
    expect(result.current.second.isDirty).toBe(true);
  });
});

