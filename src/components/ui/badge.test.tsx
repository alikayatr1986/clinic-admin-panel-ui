import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Badge } from './badge';

afterEach(cleanup);

describe('Badge', () => {
  it('renders badge content', () => {
    render(<Badge>Active</Badge>);
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-slot', 'badge');
  });

  it('renders all variants correctly', () => {
    const { rerender, container } = render(<Badge variant="default">Status</Badge>);
    expect(container.querySelector('[data-slot="badge"]')).toHaveClass('bg-primary');

    rerender(<Badge variant="secondary">Status</Badge>);
    expect(container.querySelector('[data-slot="badge"]')).toHaveClass('bg-secondary');

    rerender(<Badge variant="midnight">Status</Badge>);
    expect(container.querySelector('[data-slot="badge"]')).toHaveClass('bg-midnight');

    rerender(<Badge variant="destructive">Status</Badge>);
    expect(container.querySelector('[data-slot="badge"]')).toHaveClass('bg-destructive');

    rerender(<Badge variant="outline">Status</Badge>);
    expect(container.querySelector('[data-slot="badge"]')).toHaveClass('border-border');

    rerender(<Badge variant="promo">Status</Badge>);
    expect(container.querySelector('[data-slot="badge"]')).toHaveClass('bg-primary');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>Ref Badge</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ref.current).toHaveTextContent('Ref Badge');
  });

  it('supports asChild rendering', () => {
    render(
      <Badge asChild variant="outline">
        <a href="/admin/leads?status=new">New Leads</a>
      </Badge>
    );
    const link = screen.getByRole('link', { name: 'New Leads' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/admin/leads?status=new');
    expect(link).toHaveClass('border-border');
  });
});
