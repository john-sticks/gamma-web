'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { NotificationsPage } from '@/components/notifications/notifications-page';

export default function AdminNotificationsPage() {
  return (
    <DashboardLayout>
      <NotificationsPage />
    </DashboardLayout>
  );
}
