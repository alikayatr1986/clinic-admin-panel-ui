import { useEffect, useRef } from 'react';
import type { AdminSidebarProps } from '../../types/layout.types';
import { isNavItemActive } from './navigation';
import { Button } from '@/components/ui/button';

export function AdminSidebar({
  items,
  currentPath,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  triggerRef,
}: AdminSidebarProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleDismiss = () => {
    onCloseMobile();
    triggerRef?.current?.focus();
  };

  useEffect(() => {
    if (!isOpenMobile) return;

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleDismiss();
        return;
      }

      if (event.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!drawerRef.current.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
          return;
        }

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpenMobile]);

  const renderNavList = (isMobile = false) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = isNavItemActive(item, currentPath);
        return (
          <li key={item.id}>
            <Button
              asChild
              variant={active ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <a
                href={item.path}
                aria-current={active ? 'page' : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  onNavigate(item.path);
                  if (isMobile) {
                    onCloseMobile();
                    triggerRef?.current?.focus();
                  }
                }}
              >
                {item.label}
              </a>
            </Button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Desktop right sidebar */}
      <aside
        aria-label="Admin sidebar"
        className="hidden lg:block w-64 shrink-0 border-l border-slate-200 bg-white p-6 order-last"
      >
        <nav aria-label="Admin desktop navigation">{renderNavList(false)}</nav>
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          className="lg:hidden"
        >
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={handleDismiss}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-64 flex-col border-l border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-base font-semibold text-midnight">Navigation</h2>
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation menu"
                onClick={handleDismiss}
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <nav aria-label="Admin mobile navigation">{renderNavList(true)}</nav>
          </div>
        </div>
      )}
    </>
  );
}
