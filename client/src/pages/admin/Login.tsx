import { useQueryClient } from '@tanstack/react-query';
import { Lock, LogIn } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';
import { api, ApiError } from '../../lib/api';
import { useMe } from './AdminLayout';

export function LoginPage() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const rawNext = params.get('next') ?? '/admin';
  // Only allow internal admin redirects.
  const next = rawNext.startsWith('/admin') && !rawNext.startsWith('//') ? rawNext : '/admin';

  useEffect(() => {
    document.title = 'Admin sign in | Mandal Schemes Portal';
  }, []);

  if (me.data) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ user: unknown }>('/auth/login', { method: 'POST', body: { email, password } });
      qc.setQueryData(['me'], res.user);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-ocean-800 px-4">
      <main className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <LogoMark className="h-11 w-11" />
          <div>
            <p className="text-lg font-bold leading-tight">Mandal Schemes Portal</p>
            <p className="text-xs text-white/75">Administration</p>
          </div>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
          <h1 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <Lock className="h-5 w-5" aria-hidden="true" /> Admin sign in
          </h1>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy || !email || !password}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-xs text-ink-muted">Accounts are created by a super administrator. There is no public sign-up.</p>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/" className="text-white/85 underline-offset-2 hover:underline">
            ← Back to the portal
          </Link>
        </p>
      </main>
    </div>
  );
}
