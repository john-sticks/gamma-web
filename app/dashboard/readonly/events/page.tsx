'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EventsManagement } from '@/components/events/events-management';

export default function EventsListPage() {
  return (
    <DashboardLayout>
      <EventsManagement basePath="/dashboard/readonly" defaultFilterStatus="approved" readonly />
    </DashboardLayout>
  );
}
