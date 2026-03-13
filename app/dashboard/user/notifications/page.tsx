'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { NotificationsPage } from '@/components/notifications/notifications-page';

export default function UserNotificationsPage() {
  return (
    <DashboardLayout>
      <NotificationsPage />
    </DashboardLayout>
  );
}
