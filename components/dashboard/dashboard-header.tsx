'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSession, clearSession, SESSION_QUERY_KEY } from '@/hooks/use-session-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ROLE_NAMES } from '@/types/auth';

export function DashboardHeader() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useSession();

  async function handleLogout() {
    await clearSession();
    queryClient.setQueryData(SESSION_QUERY_KEY, null);
    router.push('/login');
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Bienvenido, {session.user.firstName} {session.user.lastName}
            </h1>
            <p className="text-muted-foreground mt-1">
              <span className="font-medium">Rol:</span> {ROLE_NAMES[session.user.role]}
            </p>
            <p className="text-muted-foreground text-sm">
              <span className="font-medium">Usuario:</span> {session.user.username}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
