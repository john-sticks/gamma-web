'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Client } from '@/lib/generated/client';
import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';
import { client as generatedClient } from '@/lib/generated/client.gen';
import { UserSession } from '@/types/auth';
import { SESSION_QUERY_KEY } from '@/hooks/use-session-query';
import { NODE_ENV, API_BASE_URL } from '@/lib/consts';
import { isAuthPage } from '@/utils/auth-utils';

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import('@tanstack/query-core').QueryClient;
  }
}

export const ApiClientContext = createContext<Client | null>(null);
let browserQueryClient: QueryClient;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  }

  // Browser: make a new query client if we don't already have one
  // This is very important, so we don't re-make a new client if React
  // suspends during the initial render. This may not be needed if we
  // have a suspense boundary BELOW the creation of the query client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  if (NODE_ENV === 'development') {
    window.__TANSTACK_QUERY_CLIENT__ = browserQueryClient;
  }

  return browserQueryClient;
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const [client] = useState(() => {
    // Set the base URL for the client
    generatedClient.setConfig({
      baseUrl: API_BASE_URL,
    });

    // Request interceptor to add auth token
    generatedClient.interceptors.request.use(async (request) => {
      // Try to get session from React Query cache first
      const cachedSession = queryClient.getQueryData<UserSession | null>(
        SESSION_QUERY_KEY,
      );

      if (cachedSession?.accessToken) {
        request.headers.set(
          'Authorization',
          `Bearer ${cachedSession.accessToken}`,
        );
      }
      // If no cached session, proceed without auth header
      // This is normal for public endpoints like login

      return request;
    });

    // Response interceptor to handle 401 errors
    generatedClient.interceptors.response.use(async (response) => {
      if (response.status === 401 && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;

        console.warn('[auth] Received 401 response', {
          url: response.url,
          currentPath,
          isAuthPage: isAuthPage(currentPath),
        });

        // Avoid infinite loops - don't redirect if already on auth pages
        if (!isAuthPage(currentPath)) {
          console.warn('[auth] Session expired (401), logging out');

          // Clear session from cache
          queryClient.setQueryData(SESSION_QUERY_KEY, null);

          // Clear session cookie
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });

          // Redirect to login
          window.location.href = '/login';
        }
      }

      return response;
    });

    return generatedClient;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>
    </QueryClientProvider>
  );
}

export function useApiClient() {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used within ApiProvider');
  }
  return client;
}
