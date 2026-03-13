'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/providers/api-provider';
import { saveSession, SESSION_QUERY_KEY } from '@/hooks/use-session-query';
import { getDashboardRoute } from '@/utils/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthResponse } from '@/types/auth';
import { authControllerLogin } from '@/lib/generated/sdk.gen';

export default function LoginPage() {
  const router = useRouter();
  const client = useApiClient();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: apiError } = await authControllerLogin({
        client,
        body: {
          username,
          password,
        },
      });

      if (apiError || !data) {
        console.error('Login API error:', apiError);
        setError('Usuario o contraseña incorrectos');
        setIsLoading(false);
        return;
      }

      if (data) {
        const authResponse = data as unknown as AuthResponse;

        // Guardar sesión en cookies y React Query cache
        const session = {
          accessToken: authResponse.access_token,
          user: authResponse.user,
        };

        // Esperar a que la sesión se guarde en la cookie
        await saveSession(session);
        queryClient.setQueryData(SESSION_QUERY_KEY, session);

        // Redirigir al dashboard según el rol
        const dashboardRoute = getDashboardRoute(authResponse.user.role);
        router.push(dashboardRoute);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error al iniciar sesión. Por favor, intenta nuevamente.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4 min-w-full">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Iniciar Sesión
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !username || !password}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
