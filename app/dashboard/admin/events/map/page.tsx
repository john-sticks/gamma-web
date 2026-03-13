'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EventsMapView } from '@/components/events/events-map-view';

export default function EventsMapPage() {
  return (
    <DashboardLayout>
      <EventsMapView presentationUrl="/dashboard/admin/events/presentation" />
    </DashboardLayout>
  );
}
