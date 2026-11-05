import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

afterEach(cleanup);

describe('Card', () => {
  it('renders card with full hierarchy and data-slots', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Settings Card</CardTitle>
          <CardDescription>Manage your clinic procedures</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Body content</p>
        </CardContent>
        <CardFooter>
          <button>Save</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Settings Card')).toBeInTheDocument();
    expect(screen.getByText('Manage your clinic procedures')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders muted variant correctly', () => {
    const { container } = render(<Card variant="muted">Muted card</Card>);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toHaveClass('bg-muted/50');
  });

  it('forwards ref to container element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref Card</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
