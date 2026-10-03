'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Logo } from '@/components/layout/Logo';
import { apiRequest } from '@/lib/api';
import { safeAdminRedirect } from '@/lib/adminApi';

export function LoginForm() {
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username || !password) {
      setError('Enter your username and password');
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      await apiRequest('/admin/login', { method: 'POST', body: { username, password } });
      // Full navigation: the client router may hold a cached middleware redirect from before login.
      window.location.assign(safeAdminRedirect(params.get('next')));
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-5 p-8" noValidate>
      <Logo href="/admin" />
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold"><Lock className="h-5 w-5 text-brand-600" aria-hidden /> Pharmacy admin</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to manage orders.</p>
      </div>
      <Field label="Username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
      <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={loading}>Sign in</Button>
    </form>
  );
}
