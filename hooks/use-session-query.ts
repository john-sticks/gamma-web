import { useQuery } from '@tanstack/react-query';
import { UserSession } from '@/types/auth';

export const SESSION_QUERY_KEY = ['session'];

/**
 * Fetch the current session from cookies via API route
 */
export async function fetchSession(): Promise<UserSession | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.session || null;
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return null;
  }
}

/**
 * Save session to cookies via API route
 */
export async function saveSession(session: UserSession): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      throw new Error('Failed to save session');
    }
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
}

/**
 * Clear session from cookies via API route
 */
export async function clearSession(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Check if a JWT token is expired (with 60s buffer)
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000 - 60000;
  } catch {
    return true;
  }
}

/**
 * Fetch session and validate token expiration.
 * If the token is expired, clears the session and redirects to login.
 */
async function fetchAndValidateSession(): Promise<UserSession | null> {
  const session = await fetchSession();

  if (session?.accessToken && isTokenExpired(session.accessToken)) {
    // Token expired — clear session and redirect
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }

    return null;
  }

  return session;
}

/**
 * Hook to get the current user session.
 * Re-validates every 60 seconds to detect expired tokens.
 */
export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchAndValidateSession,
    staleTime: 60 * 1000, // Re-validate every 60 seconds
    gcTime: Infinity, // Keep session in cache indefinitely
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchIntervalInBackground: true, // Keep checking even when tab is not focused
  });
}
