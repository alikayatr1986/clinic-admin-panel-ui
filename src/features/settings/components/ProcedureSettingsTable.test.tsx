import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProcedureSettingsTable } from './ProcedureSettingsTable';
import type { ProcedureSetting } from '../types/settings.types';

const procedure: ProcedureSetting = { id: '1', code: 'old', name_en: 'Old', name_ar: 'قديم', display_order: 1, status: 'draft', referenced_cases_count: 1, referenced_leads_count: 0 };
const callbacks = { onEdit: vi.fn(), onActivate: vi.fn(), onRetire: vi.fn(), onDelete: vi.fn(), onMove: vi.fn() };

afterEach(cleanup);

describe('ProcedureSettingsTable', () => {
  it('prevents deletion of referenced drafts', () => {
    render(<ProcedureSettingsTable procedures={[procedure]} role="admin" {...callbacks} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled();
  });
  it('shows staff a read-only view', () => {
    render(<ProcedureSettingsTable procedures={[procedure]} role="staff" {...callbacks} />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Activate' })).toBeDisabled();
  });
});
