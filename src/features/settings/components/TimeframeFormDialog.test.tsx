import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeframeFormDialog } from './TimeframeFormDialog';
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

describe('TimeframeFormDialog', () => {
  it('renders create timeframe dialog with accessible form fields', () => {
    render(
      <TimeframeFormDialog
        isOpen={true}
        timeframe={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create Timeframe Option' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Code/i)).toBeEnabled();
    expect(screen.getByLabelText(/English Label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Arabic Label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Min Months/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Max Months/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Sort Order/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Draft Timeframe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('validates required English and Arabic labels', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TimeframeFormDialog
        isOpen={true}
        timeframe={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Create Draft Timeframe' }));
    expect(screen.getByRole('alert')).toHaveTextContent('English label is required.');
    expect(screen.getByLabelText(/English Label/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/English Label/i)).toHaveAttribute('aria-describedby', 'timeframe-error');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/English Label/i), '6–12 Months');
    await user.click(screen.getByRole('button', { name: 'Create Draft Timeframe' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Arabic label is required.');
    expect(screen.getByLabelText(/Arabic Label/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Arabic Label/i)).toHaveAttribute('aria-describedby', 'timeframe-error');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates code format on creation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TimeframeFormDialog
        isOpen={true}
        timeframe={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/English Label/i), '6–12 Months');
    await user.type(screen.getByLabelText(/Arabic Label/i), '٦-١٢ شهراً');
    await user.type(screen.getByLabelText(/Code/i), 'INVALID CODE!');
    await user.click(screen.getByRole('button', { name: 'Create Draft Timeframe' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Code must be lowercase alphanumeric with hyphens');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates clinical interval where max must exceed min', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TimeframeFormDialog
        isOpen={true}
        timeframe={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/Code/i), '6-12-months');
    await user.type(screen.getByLabelText(/English Label/i), '6–12 Months');
    await user.type(screen.getByLabelText(/Arabic Label/i), '٦-١٢ شهراً');
    fireEvent.change(screen.getByLabelText(/Min Months/i), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/Max Months/i), { target: { value: '6' } });

    await user.click(screen.getByRole('button', { name: 'Create Draft Timeframe' }));
    expect(screen.getByRole('alert')).toHaveTextContent('strictly greater than minimum');
    expect(screen.getByLabelText(/Min Months/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Min Months/i)).toHaveAttribute('aria-describedby', 'timeframe-error');
    expect(screen.getByLabelText(/Max Months/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Max Months/i)).toHaveAttribute('aria-describedby', 'timeframe-error');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid form data including open-ended interval', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TimeframeFormDialog
        isOpen={true}
        timeframe={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/Code/i), '12-plus-months');
    await user.type(screen.getByLabelText(/English Label/i), '12+ Months');
    await user.type(screen.getByLabelText(/Arabic Label/i), '١٢+ شهراً');
    fireEvent.change(screen.getByLabelText(/Min Months/i), { target: { value: '12' } });

    // Check open-ended
    await user.click(screen.getByLabelText(/Open-ended upper boundary/i));
    expect(screen.getByLabelText(/Max Months/i)).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Create Draft Timeframe' }));
    expect(onSubmit).toHaveBeenCalledWith({
      code: '12-plus-months',
      name_en: '12+ Months',
      name_ar: '١٢+ شهراً',
      min_months: 12,
      max_months: null,
      display_order: 1,
    });
  });

  it('locks code and range inputs when editing referenced timeframe', () => {
    const referencedTf: TimeframeSetting = {
      ...mockTimeframe,
      referenced_cases_count: 7,
    };

    render(
      <TimeframeFormDialog
        isOpen={true}
        timeframe={referencedTf}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Edit Timeframe Option' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Code/i)).toBeDisabled();
    expect(screen.getByLabelText(/Min Months/i)).toBeDisabled();
    expect(screen.getByLabelText(/Max Months/i)).toBeDisabled();
    expect(screen.getByLabelText(/Open-ended/i)).toBeDisabled();
    expect(screen.getByText(/Range boundaries are locked because this timeframe is referenced/i)).toBeInTheDocument();
  });

  it('does not dismiss dialog on Escape when isSubmitting is true', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TimeframeFormDialog
        isOpen={true}
        timeframe={null}
        isSubmitting={true}
        onClose={onClose}
        onSubmit={vi.fn()}
      />
    );

    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel button or Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TimeframeFormDialog
        isOpen={true}
        timeframe={null}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
