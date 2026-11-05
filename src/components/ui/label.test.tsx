import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Label } from './label';
import { Input } from './input';

afterEach(cleanup);

describe('Label', () => {
  it('renders label text and associates with input via htmlFor', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Label htmlFor="lead-name">Patient Name</Label>
        <Input id="lead-name" placeholder="Name" />
      </div>
    );
    const label = screen.getByText('Patient Name');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('data-slot', 'label');

    await user.click(label);
    const input = screen.getByPlaceholderText('Name');
    expect(input).toHaveFocus();
  });

  it('renders with peer disabled classes', () => {
    render(<Label>Standard Label</Label>);
    const label = screen.getByText('Standard Label');
    expect(label).toHaveClass('text-sm', 'font-medium', 'peer-disabled:cursor-not-allowed');
  });
});
