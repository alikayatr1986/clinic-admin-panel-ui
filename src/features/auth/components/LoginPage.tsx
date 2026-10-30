import { useState, type FormEvent } from 'react';
import { ApiError } from '../../../lib/api';
import type { LoginPageProps } from '../types/auth.types';
import { describeError } from '../utils/auth.utils';

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onLogin(username, password);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) setError('Invalid username or password.');
      else setError(describeError(failure));
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-crimson">Clinic administration</p>
        <h1 className="mt-3 text-3xl font-semibold">Staff sign in</h1>
        <p className="mt-2 text-slate-600">Use your clinic staff credentials.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium">Username</label>
            <input id="username" name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-crimson" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-crimson" />
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button disabled={busy} type="submit" className="w-full rounded-md bg-crimson px-4 py-2.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}

