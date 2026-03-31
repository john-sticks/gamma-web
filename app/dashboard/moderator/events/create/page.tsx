'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EventForm } from '@/components/events/event-form';

export default function CreateEventPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Crear Nuevo Evento</h1>
            <p className="text-muted-foreground mt-2">
              Completa el formulario para crear un nuevo evento
            </p>
          </div>

          <EventForm mode="create" />
        </div>
      </div>
    </DashboardLayout>
  );
}
