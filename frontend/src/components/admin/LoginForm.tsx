// src/components/admin/LoginForm.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { 
  useState, 
  forwardRef, 
  useId, 
  type FormEvent, 
  type ButtonHTMLAttributes, 
  type InputHTMLAttributes 
} from 'react';
import { Loader2, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


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

// ============================================================================
// UI COMPONENTS
// ============================================================================
function Logo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#156253] text-[#FFFFFF] shadow-[0_4px_16px_rgba(21,98,83,0.3)] ring-1 ring-inset ring-white/10">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <div className="font-display text-[22px] font-bold tracking-tight text-[#0F1F1C]">
        Goregaon<span className="text-[#156253]">Meds</span>
      </div>
    </div>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { loading = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative flex h-12 w-full select-none items-center justify-center rounded-xl bg-[#156253] px-6 text-[15px] font-bold text-[#FFFFFF] shadow-[0_4px_16px_rgba(21,98,83,0.2)] transition-all duration-300',
        'hover:bg-[#0F1F1C] hover:shadow-[0_6px_20px_rgba(15,31,28,0.2)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#156253]',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:bg-[#156253]',
        className,
      )}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span>Verifying...</span>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
});

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: boolean;
  togglePassword?: () => void;
  showPassword?: boolean;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, type = 'text', togglePassword, showPassword, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[#0F1F1C]/60">
        {label}
      </label>
      <div
        className={cn(
          'relative flex h-12 items-center rounded-xl bg-[#F6FAF8] shadow-sm ring-1 ring-inset transition-all duration-300',
          error 
            ? 'ring-red-300 focus-within:bg-[#FFFFFF] focus-within:ring-2 focus-within:ring-red-500' 
            : 'ring-[#156253]/15 hover:ring-[#156253]/30 focus-within:bg-[#FFFFFF] focus-within:ring-2 focus-within:ring-[#156253]'
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={error ? true : undefined}
          className="h-full w-full rounded-xl bg-transparent px-4 text-[15px] font-semibold text-[#0F1F1C] placeholder:text-[#0F1F1C]/30 focus:outline-none"
          {...props}
        />
        {togglePassword && (
          <button
            type="button"
            onClick={togglePassword}
            tabIndex={-1}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-[#0F1F1C]/40 transition-colors hover:bg-[#0F1F1C]/5 hover:text-[#0F1F1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#156253]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT (LoginForm)
// ============================================================================
export function LoginForm() {
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username || !password) {
      setError('Enter your username and password to continue.');
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
    <motion.div 
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[420px]"
    >
      <form 
        onSubmit={submit} 
        className="relative overflow-hidden rounded-[32px] bg-[#FFFFFF] p-8 shadow-[0_8px_40px_rgba(15,31,28,0.06)] ring-1 ring-[#156253]/10 sm:p-10" 
        noValidate
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-8 flex items-center gap-2 font-display text-[22px] font-bold text-[#0F1F1C]">
            <ShieldCheck className="h-6 w-6 text-[#156253]" aria-hidden /> 
            Pharmacy Admin
          </h1>
          <p className="mt-2 text-[14px] font-medium text-[#0F1F1C]/60">
            Secure operations and order management.
          </p>
        </div>

        <div className="space-y-5">
          <Field 
            label="Username" 
            autoComplete="username" 
            placeholder="Enter administrator ID"
            value={username} 
            onChange={(event) => setUsername(event.target.value)}
            error={!!error}
            disabled={loading}
          />
          
          <Field 
            label="Password" 
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password" 
            placeholder="••••••••••••"
            value={password} 
            onChange={(event) => setPassword(event.target.value)}
            togglePassword={() => setShowPassword(!showPassword)}
            showPassword={showPassword}
            error={!!error}
            disabled={loading}
          />
        </div>

        <div className="mt-6 min-h-[52px]">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mb-6 flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 ring-1 ring-inset ring-red-100"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-red-600" aria-hidden />
                <p className="text-[13.5px] font-medium leading-snug text-red-800">
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <Button type="submit" loading={loading}>
            Sign In to Workspace
          </Button>
        </div>
      </form>
    </motion.div>
  );
}