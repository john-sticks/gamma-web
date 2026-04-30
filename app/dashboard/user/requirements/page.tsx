'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { UserRequirementsPage } from '@/components/requirements/user-requirements-page';

export default function UserRequirementsPageRoute() {
  return (
    <DashboardLayout>
      <UserRequirementsPage />
    </DashboardLayout>
  );
}
