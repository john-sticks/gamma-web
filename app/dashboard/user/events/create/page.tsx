'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EventForm } from '@/components/events/event-form';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

export default function CreateEventPage() {
  return (
    <DashboardLayout>
      <div className="p-6 pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Crear Nuevo Evento</h1>
            <p className="text-muted-foreground mt-2">
              Completa el formulario para cargar un evento
            </p>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Proceso de Aprobación</p>
                  <p className="text-sm text-muted-foreground">
                    Tu evento será revisado por un moderador antes de aparecer públicamente en el mapa.
                    Esto asegura la calidad y veracidad de la información. Recibirás una notificación
                    cuando tu evento sea aprobado o si necesita modificaciones.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <EventForm mode="create" />
        </div>
      </div>
    </DashboardLayout>
  );
}
