import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProcedureFormDialog } from './ProcedureFormDialog';

afterEach(cleanup);

describe('ProcedureFormDialog', () => {
  it('focuses the form and supports Escape and focus return', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const close = vi.fn();
    const view = render(
      <ProcedureFormDialog
        procedure={null}
        isSubmitting={false}
        error={null}
        onClose={close}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Code')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('does not dismiss dialog on Escape when isSubmitting is true', () => {
    const close = vi.fn();
    render(
      <ProcedureFormDialog
        procedure={null}
        isSubmitting={true}
        error={null}
        onClose={close}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).not.toHaveBeenCalled();
  });

  it('validates whitespace and trims inputs before submission', () => {
    const onSubmit = vi.fn();
    render(
      <ProcedureFormDialog
        procedure={null}
        isSubmitting={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    // Empty English label
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: ' rhinoplasty ' } });
    fireEvent.change(screen.getByLabelText('English label'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Arabic label'), { target: { value: '   ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('English label is required.');
    expect(screen.getByLabelText('English label')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();

    // Empty Arabic label
    fireEvent.change(screen.getByLabelText('English label'), { target: { value: '  Rhinoplasty  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Arabic label is required.');
    expect(screen.getByLabelText('Arabic label')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();

    // Valid inputs trimmed
    fireEvent.change(screen.getByLabelText('Arabic label'), { target: { value: '  تجميل الأنف  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith({
      code: 'rhinoplasty',
      name_en: 'Rhinoplasty',
      name_ar: 'تجميل الأنف',
      display_order: 0,
    });
  });
});
