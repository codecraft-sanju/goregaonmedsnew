//src/components/admin/LoginForm.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { 
  useState, 
  forwardRef, 
  useId, 
  type FormEvent, 
  type ButtonHTMLAttributes, 
  type InputHTMLAttributes, 
  type ReactNode 
} from 'react';
import { Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';


function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}


interface FieldIssue {
  path: string;
  message: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields: FieldIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

const NETWORK_MESSAGE = 'Could not reach GoregaonMeds. Check your connection and try again.';

async function apiRequest<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(NETWORK_MESSAGE, 0, 'NETWORK_ERROR');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      typeof error?.message === 'string' ? error.message : 'Something went wrong. Please try again.',
      response.status,
      typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      Array.isArray(error?.fields) ? error.fields : [],
    );
  }
  return data as T;
}

function safeAdminRedirect(next: string | null) {
  return next && next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/login') ? next : '/admin';
}


function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="GoregaonMeds home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white shadow-lift">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-ink">
        Goregaon<span className="text-brand-600">Meds</span>
      </span>
    </Link>
  );
}


type Variant = 'primary' | 'secondary' | 'ghost' | 'gift' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-lift disabled:bg-brand-700/60',
  secondary: 'bg-white text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-50 disabled:text-brand-800/50',
  ghost: 'text-brand-800 hover:bg-brand-50 disabled:text-brand-800/50',
  gift: 'bg-gift-500 text-white hover:bg-gift-600 shadow-[0_12px_30px_-12px_rgba(239,148,21,0.7)] disabled:bg-gift-500/60',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-[background-color,transform,box-shadow] duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});


interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  leading?: ReactNode;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, optional, leading, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink-soft">Optional</span>}
      </label>
      <div
        className={cn(
          'flex items-center rounded-2xl bg-white ring-1 ring-inset transition-shadow focus-within:ring-2',
          error ? 'ring-red-300 focus-within:ring-red-500' : 'ring-brand-100 focus-within:ring-brand-500',
        )}
      >
        {leading && <span className="pl-4 text-[15px] font-medium text-ink-muted">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-12 w-full rounded-2xl bg-transparent px-4 text-[15px] text-ink placeholder:text-ink-soft focus:outline-none"
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
});


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
        <h1 className="flex items-center gap-2 font-display text-xl font-bold">
          <Lock className="h-5 w-5 text-brand-600" aria-hidden /> Pharmacy admin
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to manage orders.</p>
      </div>
      <Field 
        label="Username" 
        autoComplete="username" 
        value={username} 
        onChange={(event) => setUsername(event.target.value)} 
      />
      <Field 
        label="Password" 
        type="password" 
        autoComplete="current-password" 
        value={password} 
        onChange={(event) => setPassword(event.target.value)} 
      />
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Sign in
      </Button>
    </form>
  );
}