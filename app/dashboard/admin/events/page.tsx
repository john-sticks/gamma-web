'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EventsManagement } from '@/components/events/events-management';

export default function EventsListPage() {
  return (
    <DashboardLayout>
      <EventsManagement basePath="/dashboard/admin" defaultFilterStatus="approved" />
    </DashboardLayout>
  );
}
