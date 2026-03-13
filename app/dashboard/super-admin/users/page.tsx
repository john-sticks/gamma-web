'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { UsersManagement } from '@/components/users/users-management';

export default function UsersPage() {
  return (
    <DashboardLayout>
      <UsersManagement />
    </DashboardLayout>
  );
}
