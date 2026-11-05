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
    const view = render(<ProcedureFormDialog procedure={null} isSubmitting={false} error={null} onClose={close} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Code')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
