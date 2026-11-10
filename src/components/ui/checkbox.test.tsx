import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';

afterEach(cleanup);

describe('Checkbox', () => {
  it('associates the label, forwards the ref, and toggles by label and keyboard', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();
    render(<Checkbox ref={ref} label="Review image" onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Review image' });
    expect(ref.current).toBe(box);
    await user.click(screen.getByText('Review image'));
    expect(box).toBeChecked();
    box.focus();
    await user.keyboard(' ');
    expect(box).not.toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('preserves disabled and validation attributes', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Unavailable" disabled aria-invalid="true" aria-describedby="error" onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Unavailable' });
    expect(box).toBeDisabled();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAttribute('aria-describedby', 'error');
    await userEvent.click(screen.getByText('Unavailable'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
