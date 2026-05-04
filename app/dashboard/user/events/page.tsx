'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EventsManagement } from '@/components/events/events-management';

export default function MyEventsPage() {
  return (
    <DashboardLayout>
      <EventsManagement
        basePath="/dashboard/user"
        defaultFilterStatus="all"
        showRetroExport={false}
      />
    </DashboardLayout>
  );
}
