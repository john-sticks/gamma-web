'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { RequirementsManagement } from '@/components/requirements/requirements-management';

export default function AdminRequirementsPage() {
  return (
    <DashboardLayout>
      <RequirementsManagement role="admin" />
    </DashboardLayout>
  );
}
