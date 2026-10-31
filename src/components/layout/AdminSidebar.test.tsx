import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from './AdminSidebar';
import type { NavItem } from '../../types/layout.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin/' },
  { id: 'gallery', label: 'Gallery', path: '/admin/gallery' },
  { id: 'blogs', label: 'Blogs', path: '/admin/blogs' },
  { id: 'leads', label: 'Leads', path: '/admin/leads', adminOnly: true },
];

describe('AdminSidebar component', () => {
  it('renders right-aligned desktop sidebar and marks parent item active for child route', () => {
    const onNavigate = vi.fn();
    const onCloseMobile = vi.fn();

    render(
      <AdminSidebar
        items={mockItems}
        currentPath="/admin/blogs/post-1/edit"
        onNavigate={onNavigate}
        isOpenMobile={false}
        onCloseMobile={onCloseMobile}
      />
    );

    const desktopAside = screen.getByLabelText('Admin sidebar');
    expect(desktopAside).toHaveClass('order-last', 'w-64');

    const blogsLink = screen.getByRole('link', { name: 'Blogs' });
    expect(blogsLink).toHaveAttribute('aria-current', 'page');
    expect(blogsLink).toHaveClass('text-crimson');

    const galleryLink = screen.getByRole('link', { name: 'Gallery' });
    expect(galleryLink).not.toHaveAttribute('aria-current');
  });

  it('opens mobile drawer with focus trap, dismisses with Escape, and returns focus to trigger', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onCloseMobile = vi.fn();

    const triggerButton = document.createElement('button');
    triggerButton.setAttribute('aria-label', 'Open navigation menu');
    document.body.appendChild(triggerButton);
    const triggerRef = { current: triggerButton };
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    render(
      <AdminSidebar
        items={mockItems}
        currentPath="/admin/"
        onNavigate={onNavigate}
        isOpenMobile={true}
        onCloseMobile={onCloseMobile}
        triggerRef={triggerRef}
      />
    );

    const drawer = screen.getByRole('dialog', { name: 'Navigation drawer' });
    expect(drawer).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close navigation menu' });
    await vi.waitFor(() => expect(document.activeElement).toBe(closeButton));

    // Press Escape to dismiss
    await user.keyboard('{Escape}');
    expect(onCloseMobile).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(triggerButton);

    document.body.removeChild(triggerButton);
  });

  it('traps Tab and Shift+Tab focus within mobile drawer elements', async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();

    render(
      <AdminSidebar
        items={mockItems}
        currentPath="/admin/"
        onNavigate={vi.fn()}
        isOpenMobile={true}
        onCloseMobile={onCloseMobile}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Close navigation menu' });
    await vi.waitFor(() => expect(document.activeElement).toBe(closeButton));

    const mobileLinks = screen.getAllByRole('link');
    const lastLink = mobileLinks[mobileLinks.length - 1]; // Leads link in mobile nav

    // Focus last link and Tab -> should wrap to closeButton
    lastLink.focus();
    expect(document.activeElement).toBe(lastLink);
    await user.keyboard('{Tab}');
    expect(document.activeElement).toBe(closeButton);

    // Focus closeButton and Shift+Tab -> should wrap to lastLink
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(lastLink);
  });

  it('dismisses mobile drawer on close button click and returns focus to trigger', async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    const triggerButton = document.createElement('button');
    document.body.appendChild(triggerButton);
    const triggerRef = { current: triggerButton };

    render(
      <AdminSidebar
        items={mockItems}
        currentPath="/admin/"
        onNavigate={vi.fn()}
        isOpenMobile={true}
        onCloseMobile={onCloseMobile}
        triggerRef={triggerRef}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Close navigation menu' });
    await user.click(closeButton);

    expect(onCloseMobile).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(triggerButton);

    document.body.removeChild(triggerButton);
  });

  it('dismisses mobile drawer on backdrop click and returns focus to trigger', async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    const triggerButton = document.createElement('button');
    document.body.appendChild(triggerButton);
    const triggerRef = { current: triggerButton };

    render(
      <AdminSidebar
        items={mockItems}
        currentPath="/admin/"
        onNavigate={vi.fn()}
        isOpenMobile={true}
        onCloseMobile={onCloseMobile}
        triggerRef={triggerRef}
      />
    );

    // Backdrop is aria-hidden
    const backdrop = document.querySelector('.bg-black\\/40')!;
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop);

    expect(onCloseMobile).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(triggerButton);

    document.body.removeChild(triggerButton);
  });

  it('calls onNavigate and closes mobile drawer when link is clicked', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onCloseMobile = vi.fn();

    render(
      <AdminSidebar
        items={mockItems}
        currentPath="/admin/"
        onNavigate={onNavigate}
        isOpenMobile={true}
        onCloseMobile={onCloseMobile}
      />
    );

    // Click Blogs link in mobile navigation
    const mobileNav = screen.getByRole('navigation', { name: 'Admin mobile navigation' });
    const blogsLink = screen.getAllByRole('link', { name: 'Blogs' })[1];
    await user.click(blogsLink);

    expect(onNavigate).toHaveBeenCalledWith('/admin/blogs');
    expect(onCloseMobile).toHaveBeenCalledOnce();
  });
});
