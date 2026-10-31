import type { BlogDraftContextValue, BlogDraftProviderProps } from '../types/blogs.types';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { BlogDraftRecord } from '../types/blogs.types';



const BlogDraftContext = createContext<BlogDraftContextValue | null>(null);

export function BlogDraftProvider({ children }: BlogDraftProviderProps) {
  const draftsRef = useRef<Map<string, BlogDraftRecord>>(new Map());
  const [, setTick] = useState(0);

  function getDraft(postID: string): BlogDraftRecord | undefined {
    return draftsRef.current.get(postID);
  }

  const saveDraft = useCallback((postID: string, draft: BlogDraftRecord): void => { draftsRef.current.set(postID, draft); setTick((v) => v + 1); }, []);

  const clearDraft = useCallback((postID: string): void => { if (draftsRef.current.delete(postID)) setTick((v) => v + 1); }, []);

  function isDirty(postID: string): boolean {
    const record = draftsRef.current.get(postID);
    return Boolean(record?.dirty);
  }

  return (
    <BlogDraftContext.Provider value={{ getDraft, saveDraft, clearDraft, isDirty }}>
      {children}
    </BlogDraftContext.Provider>
  );
}

export function useBlogDraft(postID?: string) {
  const context = useContext(BlogDraftContext);
  if (!context) {
    throw new Error('useBlogDraft must be used within a BlogDraftProvider');
  }
  return {
    draft: postID ? context.getDraft(postID) : undefined,
    isDirty: postID ? context.isDirty(postID) : false,
    saveDraft: (draft: BlogDraftRecord) => {
      if (postID) context.saveDraft(postID, draft);
    },
    clearDraft: () => {
      if (postID) context.clearDraft(postID);
    },
    getDraft: context.getDraft,
    contextIsDirty: context.isDirty,
    saveForPost: context.saveDraft,
    clearForPost: context.clearDraft,
  };
}

