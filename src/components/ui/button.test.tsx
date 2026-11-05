import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './button';

afterEach(cleanup);

describe('Button', () => {
  it('renders standard button with accessible text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies semantic classes for each variant', () => {
    const { rerender, container } = render(<Button variant="default">Button</Button>);
    expect(container.querySelector('button')).toHaveClass('bg-primary');

    rerender(<Button variant="destructive">Button</Button>);
    expect(container.querySelector('button')).toHaveClass('bg-destructive');

    rerender(<Button variant="outline">Button</Button>);
    expect(container.querySelector('button')).toHaveClass('border-border');

    rerender(<Button variant="secondary">Button</Button>);
    expect(container.querySelector('button')).toHaveClass('bg-secondary');

    rerender(<Button variant="ghost">Button</Button>);
    expect(container.querySelector('button')).toHaveClass('hover:bg-accent');

    rerender(<Button variant="link">Button</Button>);
    expect(container.querySelector('button')).toHaveClass('underline-offset-4');
  });

  it('applies size classes', () => {
    const { rerender, container } = render(<Button size="default">Button</Button>);
    expect(container.querySelector('button')).toHaveClass('h-9');

    rerender(<Button size="sm">Button</Button>);
    expect(container.querySelector('button')).toHaveClass('h-8');

    rerender(<Button size="lg">Button</Button>);
    expect(container.querySelector('button')).toHaveClass('h-10');

    rerender(<Button size="icon" aria-label="Icon action">×</Button>);
    expect(container.querySelector('button')).toHaveClass('size-9');
  });

  it('renders slotted anchor when asChild is passed', () => {
    render(
      <Button asChild variant="outline">
        <a href="/admin/settings">Settings</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Settings' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/admin/settings');
    expect(link).toHaveClass('border-border');
  });

  it('supports keyboard navigation, focus and click event', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    const button = screen.getByRole('button', { name: 'Submit' });

    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledOnce();

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('disables interaction when disabled prop is provided', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const button = screen.getByRole('button', { name: 'Disabled' });

    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
