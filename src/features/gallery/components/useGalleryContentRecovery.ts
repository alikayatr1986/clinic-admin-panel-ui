import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../lib/api';
import type {
  GalleryContent, GalleryContentRecovery, GalleryLocale,
  RestoredContent, UseGalleryContentRecoveryParams,
} from '../types/gallery.content.types';

export function useGalleryContentRecovery({
  username, onExpired, queryEnError, queryArError, getSnapshot,
}: UseGalleryContentRecoveryParams) {
  const recoveryKey = `gallery-content-recovery:${username}`;
  const [storageError, setStorageError] = useState('');

  const [initialLang] = useState<GalleryLocale>(() => {
    try {
      const val = sessionStorage.getItem(recoveryKey);
      const parsed: GalleryContentRecovery | null = val ? JSON.parse(val) : null;
      return parsed?.lang === 'ar' ? 'ar' : 'en';
    } catch { return 'en'; }
  });

  const saveRecovery = useCallback(() => {
    try {
      sessionStorage.setItem(recoveryKey, JSON.stringify(getSnapshot()));
      return true;
    } catch { return false; }
  }, [recoveryKey, getSnapshot]);

  const clearRecovery = useCallback(() => {
    try { sessionStorage.removeItem(recoveryKey); } catch { /* ignore */ }
  }, [recoveryKey]);

  useEffect(() => {
    const is401 = (queryEnError instanceof ApiError && queryEnError.status === 401) ||
      (queryArError instanceof ApiError && queryArError.status === 401);
    if (is401) {
      const snapshot = getSnapshot();
      if (snapshot.initializedOrDirty && !saveRecovery()) {
        setStorageError('Your session expired and your edits could not be stored. Copy them before signing in again.');
      }
      onExpired();
    }
  }, [queryEnError, queryArError, onExpired, saveRecovery, getSnapshot]);

  const checkRestore = useCallback(
    (locale: GalleryLocale, serverItem?: GalleryContent): RestoredContent | null => {
      try {
        const val = sessionStorage.getItem(recoveryKey);
        if (!val) return null;
        const restored: GalleryContentRecovery = JSON.parse(val);
        const serverRev = serverItem?.revision ?? 1;

        if (restored.forms && restored.forms[locale]) {
          const form = restored.forms[locale]!;
          const revision = restored.revisions?.[locale] ?? serverRev;
          return {
            form, revision, conflict: revision !== serverRev,
            notice: 'Your edits were restored after session expiry.',
          };
        }
        if (restored.lang === locale && restored.form) {
          const revision = restored.revision ?? serverRev;
          return {
            form: restored.form, revision, conflict: revision !== serverRev,
            notice: 'Your edits were restored after session expiry.',
          };
        }
      } catch { /* storage unavailable */ }
      return null;
    },
    [recoveryKey]
  );

  return { initialLang, saveRecovery, clearRecovery, checkRestore, storageError };
}
