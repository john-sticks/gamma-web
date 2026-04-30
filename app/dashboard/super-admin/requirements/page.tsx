'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { RequirementsManagement } from '@/components/requirements/requirements-management';

export default function SuperAdminRequirementsPage() {
  return (
    <DashboardLayout>
      <RequirementsManagement role="super-admin" />
    </DashboardLayout>
  );
}
