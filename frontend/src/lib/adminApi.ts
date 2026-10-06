//src/lib/adminApi.ts
import { ApiError, apiRequest } from './api';

type Options = Parameters<typeof apiRequest>[1];

/** Admin requests: an expired or missing session sends the user back to the login page. */
export async function adminRequest<T>(path: string, options?: Options): Promise<T> {
  try {
    return await apiRequest<T>(`/admin${path}`, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/admin/login?next=${next}`);
    }
    throw error;
  }
}

/** Only allows redirects back into the admin area, never to another site. */
export function safeAdminRedirect(next: string | null) {
  return next && next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/login') ? next : '/admin';
}
