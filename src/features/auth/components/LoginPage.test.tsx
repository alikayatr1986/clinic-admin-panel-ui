import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { ApiError } from '../../../lib/api';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LoginPage component', () => {
  it('renders card container, accessible inputs, labels, and submit button using shared primitives', () => {
    render(<LoginPage onLogin={vi.fn()} />);

    // Shared Card container
    const card = document.querySelector('[data-slot="card"]');
    expect(card).toBeInTheDocument();

    // Headings and description
    expect(screen.getByRole('heading', { level: 1, name: 'Staff sign in' })).toBeInTheDocument();
    expect(screen.getByText('Use your clinic staff credentials.')).toBeInTheDocument();

    // Inputs and Labels
    const usernameInput = screen.getByLabelText('Username');
    expect(usernameInput).toHaveAttribute('data-slot', 'input');
    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(usernameInput).toHaveAttribute('autoComplete', 'username');
    expect(usernameInput).toBeRequired();

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('data-slot', 'input');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    expect(passwordInput).toBeRequired();

    // Submit button
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    expect(submitButton).toHaveAttribute('data-slot', 'button');
    expect(submitButton).not.toBeDisabled();
  });

  it('submits credentials, disables button with pending label, and clears password on success', async () => {
    const user = userEvent.setup();
    let resolveLogin!: () => void;
    const loginPromise = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
    const onLogin = vi.fn().mockReturnValue(loginPromise);

    render(<LoginPage onLogin={onLogin} />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(usernameInput, 'clinicstaff');
    await user.type(passwordInput, 'Secret123!');
    await user.click(submitButton);

    expect(onLogin).toHaveBeenCalledWith('clinicstaff', 'Secret123!');
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();

    // Resolve login
    resolveLogin();
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
    });
    expect(passwordInput).toHaveValue('');
  });

  it('displays invalid credentials alert on 401 error, re-enables button, and clears password', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Invalid credentials'));

    render(<LoginPage onLogin={onLogin} />);

    await user.type(screen.getByLabelText('Username'), 'staff');
    await user.type(screen.getByLabelText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid username or password.');
    expect(alert).toHaveClass('border-destructive/20', 'bg-destructive/10', 'text-destructive');
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('triggers form submission on Enter key press within inputs', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue(undefined);

    render(<LoginPage onLogin={onLogin} />);

    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(usernameInput, 'adminuser');
    await user.type(passwordInput, 'validpass{Enter}');

    expect(onLogin).toHaveBeenCalledWith('adminuser', 'validpass');
  });

  it('displays generic API error message on non-401 failure', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockRejectedValue(new ApiError(503, 'SERVICE_UNAVAILABLE', 'Server maintenance in progress'));

    render(<LoginPage onLogin={onLogin} />);

    await user.type(screen.getByLabelText('Username'), 'staff');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Server maintenance in progress');
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
  });
});
