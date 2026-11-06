import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerificationSettings } from './VerificationSettings';
import { useSaveVerificationMutation, useVerificationSettingsQuery } from '../hooks/useVerificationSettings';
vi.mock('../hooks/useVerificationSettings', () => ({ useSaveVerificationMutation: vi.fn(), useVerificationSettingsQuery: vi.fn() }));
const setting = { method: 'email', enabled: false, provider: 'twilio', expiry_minutes: 10, resend_cooldown_seconds: 60, max_sends: 3, max_checks: 5, lockout_minutes: 15, retention_days: 30, fallback_to_sms: false, account_sid: '', service_sid: '', sender: '', template_id: '', secret_configured: true, adapter_available: false, generation: 0 };
const save = vi.fn();
beforeEach(() => { vi.clearAllMocks(); vi.mocked(useSaveVerificationMutation).mockReturnValue({ mutateAsync: save, isPending: false, reset: vi.fn() } as never); vi.mocked(useVerificationSettingsQuery).mockReturnValue({ data: { data: [setting] }, isLoading: false, isError: false } as never); });
afterEach(cleanup);
describe('verification settings', () => {
  it('does not request protected settings for staff', () => { render(<VerificationSettings role="staff" />); expect(screen.getByText(/Only administrators/)).toBeInTheDocument(); expect(useVerificationSettingsQuery).not.toHaveBeenCalled(); });
  it('shows configured status, blocks unavailable activation, and preserves a failed draft', async () => {
    const user = userEvent.setup(); save.mockRejectedValue(new Error('failed'));
    render(<VerificationSettings role="admin" />);
    expect(screen.getByText(/Auth token: configured/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enable verification' })).toBeDisabled();
    const form = screen.getByRole('button', { name: 'Save Email' }).closest('form')!;
    await user.type(within(form).getByLabelText('Twilio account SID'), 'AC-test');
    await user.click(within(form).getByRole('button', { name: 'Save Email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('draft has been preserved');
    expect(within(form).getByLabelText('Twilio account SID')).toHaveValue('AC-test');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ method: 'email', input: expect.objectContaining({ secret: '', account_sid: 'AC-test' }) }));
  });
  it('shows bounds validation beside the field without saving', async () => {
    const user = userEvent.setup(); render(<VerificationSettings role="admin" />);
    const input = screen.getByLabelText(/Expiry/); await user.clear(input); await user.type(input, '11'); await user.click(screen.getByRole('button', { name: 'Save Email' }));
    expect(await screen.findByText(/Too big/)).toBeInTheDocument(); expect(save).not.toHaveBeenCalled();
  });
});

it('disables fields during a save and expires the session on 401', async () => {
  const { ApiError } = await import('@/lib/api');
  const user = userEvent.setup(); const onExpired = vi.fn();
  let rejectSave!: (error: Error) => void;
  save.mockReturnValue(new Promise((_resolve, reject) => { rejectSave = reject; }));
  const view = render(<VerificationSettings role="admin" onExpired={onExpired} />);
  await user.click(screen.getByRole('button', { name: 'Save Email' }));
  vi.mocked(useSaveVerificationMutation).mockReturnValue({ mutateAsync: save, isPending: true, reset: vi.fn() } as never);
  view.rerender(<VerificationSettings role="admin" onExpired={onExpired} />);
  expect(screen.getByLabelText('Twilio account SID')).toBeDisabled();
  rejectSave(new ApiError(401, 'UNAUTHORIZED', 'Session expired'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Session expired');
  expect(onExpired).toHaveBeenCalledOnce();
});

it('updates pristine forms and protects dirty drafts when server data changes', async () => {
  const user = userEvent.setup();
  const view = render(<VerificationSettings role="admin" />);
  const input = screen.getByLabelText('Twilio account SID');
  vi.mocked(useVerificationSettingsQuery).mockReturnValue({ data: { data: [{ ...setting, account_sid: 'server' }] }, isLoading: false, isError: false } as never);
  view.rerender(<VerificationSettings role="admin" />);
  expect(input).toHaveValue('server');
  await user.clear(input); await user.type(input, 'draft');
  vi.mocked(useVerificationSettingsQuery).mockReturnValue({ data: { data: [{ ...setting, account_sid: 'new server' }] }, isLoading: false, isError: false } as never);
  view.rerender(<VerificationSettings role="admin" />);
  expect(input).toHaveValue('draft');
  expect(screen.getByRole('alert')).toHaveTextContent('changed on the server');
  expect(screen.getByRole('button', { name: 'Save Email' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Discard draft and reload' }));
  expect(input).toHaveValue('new server');
});

it('associates server checkbox errors with their controls', async () => {
  const { ApiError } = await import('@/lib/api');
  const user = userEvent.setup();
  vi.mocked(useVerificationSettingsQuery).mockReturnValue({ data: { data: [{ ...setting, method: 'whatsapp' }] }, isLoading: false, isError: false } as never);
  save.mockRejectedValue(new ApiError(422, 'VALIDATION', 'Invalid', { enabled: 'Cannot enable', fallback_to_sms: 'Fallback invalid' }));
  render(<VerificationSettings role="admin" />);
  await user.click(screen.getByRole('button', { name: 'Save WhatsApp' }));
  expect(await screen.findByText('Cannot enable')).toHaveAttribute('id', screen.getByRole('checkbox', { name: 'Enable verification' }).getAttribute('aria-describedby'));
  expect(screen.getByText('Fallback invalid')).toHaveAttribute('id', screen.getByRole('checkbox', { name: /Allow SMS fallback/ }).getAttribute('aria-describedby'));
});
