import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, expect, test, vi } from 'vitest';
import { Providers } from './providers';

vi.mock('./router', async () => {
  const { createMemoryRouter } = await import('react-router-dom');
  const { createElement } = await import('react');
  return { router: createMemoryRouter([
    { path: '/', element: createElement('h1', null, 'First route') },
    { path: '/next', element: createElement('h1', null, 'Next route') },
  ]) };
});

import { router } from './router';

afterEach(() => {
  toast.dismiss();
  cleanup();
});

test('announces success and error feedback and allows keyboard dismissal', async () => {
  const user = userEvent.setup();
  render(<Providers />);
  act(() => { toast.success('Saved'); toast.error('Could not save'); });
  expect(await screen.findByText('Saved')).toBeInTheDocument();
  expect(await screen.findByText('Could not save')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /notifications/i })).toHaveAttribute('aria-live', 'polite');
  await user.tab();
  await user.tab();
  expect(screen.getAllByRole('button', { name: 'Close toast' })[0]).toHaveFocus();
  await user.keyboard('{Enter}');
  await waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument());
});

test('keeps an active notification and its host across navigation', async () => {
  render(<Providers />);
  act(() => { toast.success('Still here'); });
  expect(await screen.findByText('Still here')).toBeInTheDocument();
  const host = screen.getByRole('region', { name: /notifications/i });
  await act(async () => { await router.navigate('/next'); });
  expect(screen.getByRole('heading', { name: 'Next route' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /notifications/i })).toBe(host);
  expect(screen.getByText('Still here')).toBeInTheDocument();
});


test('uses RTL direction for the notification host', async () => {
  document.documentElement.dir = 'rtl';
  render(<Providers />);
  act(() => { toast.success('RTL feedback'); });
  await screen.findByText('RTL feedback');
  expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('dir', 'rtl');
  document.documentElement.removeAttribute('dir');
});
