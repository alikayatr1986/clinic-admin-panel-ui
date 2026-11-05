import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeframeSettingsTable } from './TimeframeSettingsTable';
import type { TimeframeSetting } from '../types/settings.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockTimeframes: TimeframeSetting[] = [
  {
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
  },
  {
    id: 'tf-2',
    code: '3-6-months',
    name_en: '3–6 Months',
    name_ar: '٣-٦ أشهر',
    min_months: 3,
    max_months: 6,
    display_order: 2,
    status: 'active',
    referenced_cases_count: 5,
    approved_by: 'admin-id',
    approved_at: '2026-11-05T00:00:00Z',
    approval_attestation: 'Clinical sign-off',
    created_at: '2026-11-05T00:00:00Z',
    updated_at: '2026-11-05T00:00:00Z',
  },
];

describe('TimeframeSettingsTable', () => {
  it('renders timeframe catalog with labels, intervals, badges, and reference counts', () => {
    render(
      <TimeframeSettingsTable
        timeframes={mockTimeframes}
        role="admin"
        isLoading={false}
        onEdit={vi.fn()}
        onActivate={vi.fn()}
        onRetire={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );

    expect(screen.getByText('0-3-months')).toBeInTheDocument();
    expect(screen.getByText('0–3 Months')).toBeInTheDocument();
    expect(screen.getByText('٠-٣ أشهر')).toBeInTheDocument();
    expect(screen.getByText('0–3 months [0, 3)')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();

    expect(screen.getByText('3-6-months')).toBeInTheDocument();
    expect(screen.getByText('3–6 Months')).toBeInTheDocument();
    expect(screen.getByText('٣-٦ أشهر')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('enables action triggers for admin role and invokes callbacks', () => {
    const onEdit = vi.fn();
    const onActivate = vi.fn();
    const onRetire = vi.fn();
    const onDelete = vi.fn();

    render(
      <TimeframeSettingsTable
        timeframes={mockTimeframes}
        role="admin"
        isLoading={false}
        onEdit={onEdit}
        onActivate={onActivate}
        onRetire={onRetire}
        onDelete={onDelete}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );

    const activateBtn = screen.getByRole('button', { name: 'Activate' });
    expect(activateBtn).toBeEnabled();
    fireEvent.click(activateBtn);
    expect(onActivate).toHaveBeenCalledWith(mockTimeframes[0]);

    const retireBtn = screen.getByRole('button', { name: 'Retire' });
    expect(retireBtn).toBeEnabled();
    fireEvent.click(retireBtn);
    expect(onRetire).toHaveBeenCalledWith(mockTimeframes[1]);

    const editBtns = screen.getAllByRole('button', { name: 'Edit' });
    expect(editBtns[0]).toBeEnabled();
    fireEvent.click(editBtns[0]);
    expect(onEdit).toHaveBeenCalledWith(mockTimeframes[0]);

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    expect(deleteBtn).toBeEnabled();
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(mockTimeframes[0]);
  });

  it('disables mutation triggers for staff role with read-only indicators', () => {
    render(
      <TimeframeSettingsTable
        timeframes={mockTimeframes}
        role="staff"
        isLoading={false}
        onEdit={vi.fn()}
        onActivate={vi.fn()}
        onRetire={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );

    const editBtns = screen.getAllByRole('button', { name: 'Edit' });
    expect(editBtns[0]).toBeDisabled();
    expect(editBtns[0]).toHaveAttribute('title', 'Staff read-only');

    const activateBtn = screen.getByRole('button', { name: 'Activate' });
    expect(activateBtn).toBeDisabled();
    expect(activateBtn).toHaveAttribute('title', 'Staff read-only');

    const retireBtn = screen.getByRole('button', { name: 'Retire' });
    expect(retireBtn).toBeDisabled();
    expect(retireBtn).toHaveAttribute('title', 'Staff read-only');

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveAttribute('title', 'Staff read-only');
  });

  it('handles reorder up and down buttons and disables boundary items', () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();

    render(
      <TimeframeSettingsTable
        timeframes={mockTimeframes}
        role="admin"
        isLoading={false}
        onEdit={vi.fn()}
        onActivate={vi.fn()}
        onRetire={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    );

    const firstUp = screen.getByLabelText('Move 0-3-months up');
    expect(firstUp).toBeDisabled();

    const firstDown = screen.getByLabelText('Move 0-3-months down');
    expect(firstDown).toBeEnabled();
    fireEvent.click(firstDown);
    expect(onMoveDown).toHaveBeenCalledWith(0);

    const secondUp = screen.getByLabelText('Move 3-6-months up');
    expect(secondUp).toBeEnabled();
    fireEvent.click(secondUp);
    expect(onMoveUp).toHaveBeenCalledWith(1);

    const secondDown = screen.getByLabelText('Move 3-6-months down');
    expect(secondDown).toBeDisabled();
  });

  it('disables delete action for admin when draft timeframe has referenced cases', () => {
    const referencedDraft: TimeframeSetting = {
      id: 'tf-ref',
      code: '6-9-months',
      name_en: '6–9 Months',
      name_ar: '٦-٩ أشهر',
      min_months: 6,
      max_months: 9,
      display_order: 3,
      status: 'draft',
      referenced_cases_count: 2,
      created_at: '2026-11-05T00:00:00Z',
      updated_at: '2026-11-05T00:00:00Z',
    };

    render(
      <TimeframeSettingsTable
        timeframes={[referencedDraft]}
        role="admin"
        isLoading={false}
        onEdit={vi.fn()}
        onActivate={vi.fn()}
        onRetire={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveAttribute('title', 'Cannot delete referenced timeframe');
  });
});

