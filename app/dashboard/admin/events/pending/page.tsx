'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { PendingEventsManagement } from '@/components/events/pending-events-management';

export default function PendingEventsPage() {
  return (
    <DashboardLayout>
      <PendingEventsManagement />
    </DashboardLayout>
  );
}
