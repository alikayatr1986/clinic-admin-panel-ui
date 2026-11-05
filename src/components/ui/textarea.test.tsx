import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Textarea } from './textarea';

afterEach(cleanup);

describe('Textarea', () => {
  it('renders textarea with placeholder and data-slot', () => {
    render(<Textarea placeholder="Enter clinical notes" />);
    const textarea = screen.getByPlaceholderText('Enter clinical notes');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('data-slot', 'textarea');
  });

  it('accepts multi-line text input', async () => {
    const user = userEvent.setup();
    render(<Textarea placeholder="Notes" />);
    const textarea = screen.getByPlaceholderText('Notes');
    await user.type(textarea, 'First line\nSecond line');
    expect(textarea).toHaveValue('First line\nSecond line');
  });

  it('handles disabled state', () => {
    render(<Textarea disabled placeholder="Disabled notes" />);
    const textarea = screen.getByPlaceholderText('Disabled notes');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:cursor-not-allowed');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} placeholder="Ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
