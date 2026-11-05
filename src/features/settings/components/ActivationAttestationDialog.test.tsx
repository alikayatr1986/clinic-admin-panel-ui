import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivationAttestationDialog } from './ActivationAttestationDialog';
import type { TimeframeSetting } from '../types/settings.types';

afterEach(cleanup);

const mockTimeframe: TimeframeSetting = {
  id: 'tf-1',
  code: '0-3-months',
  name_en: '0–3 Months',
  name_ar: '٠-٣ أشهر',
  min_months: 0,
  max_months: 3,
  display_order: 1,
  status: 'draft',
  referenced_cases_count: 0,
  created_at: '2026-11-05T00:00:00Z',
  updated_at: '2026-11-05T00:00:00Z',
};

describe('ActivationAttestationDialog', () => {
  it('renders activation attestation dialog with timeframe details', () => {
    render(
      <ActivationAttestationDialog
        isOpen={true}
        timeframe={mockTimeframe}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clinical Activation Approval' })).toBeInTheDocument();
    expect(screen.getByText(/0–3 Months/i)).toBeInTheDocument();
    expect(screen.getByText(/Interval: \[0, 3\) months/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Clinic Representative Approval Attestation/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm Clinical Activation' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('enables confirm button when attestation is typed and invokes callback', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ActivationAttestationDialog
        isOpen={true}
        timeframe={mockTimeframe}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const textarea = screen.getByLabelText(/Clinic Representative Approval Attestation/i);
    await user.type(textarea, 'Approved by Dr. Naserzadeh for post-op gallery cases.');

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Clinical Activation' });
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith('Approved by Dr. Naserzadeh for post-op gallery cases.');
  });

  it('rejects whitespace-only attestation on submit', () => {
    const onConfirm = vi.fn();
    render(
      <ActivationAttestationDialog
        isOpen={true}
        timeframe={mockTimeframe}
        isSubmitting={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const textarea = screen.getByLabelText(/Clinic Representative Approval Attestation/i);
    fireEvent.change(textarea, { target: { value: '   ' } });

    // Submit form directly
    fireEvent.submit(textarea.closest('form')!);

    expect(screen.getByRole('alert')).toHaveTextContent('Clinical approval attestation cannot be empty.');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('aria-describedby', 'attestation-error');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not dismiss dialog on Escape when isSubmitting is true', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ActivationAttestationDialog
        isOpen={true}
        timeframe={mockTimeframe}
        isSubmitting={true}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );

    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel button or Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ActivationAttestationDialog
        isOpen={true}
        timeframe={mockTimeframe}
        isSubmitting={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

