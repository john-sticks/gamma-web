'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { PendingUpdatesManagement } from '@/components/events/pending-updates-management';

export default function PendingUpdatesPage() {
  return (
    <DashboardLayout>
      <PendingUpdatesManagement />
    </DashboardLayout>
  );
}
