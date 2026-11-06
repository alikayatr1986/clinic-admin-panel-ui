import { useEffect } from 'react';

export function useEditorBlocker(
  blocked: boolean,
  registerBlocker: (blocker: (() => boolean) | null) => void
) {
  useEffect(() => {
    registerBlocker(
      blocked
        ? () => window.confirm('You have unsaved changes or an operation in progress. Leave this case?')
        : null
    );
    const handler = (e: BeforeUnloadEvent) => {
      if (!blocked) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      registerBlocker(null);
      window.removeEventListener('beforeunload', handler);
    };
  }, [blocked, registerBlocker]);
}
