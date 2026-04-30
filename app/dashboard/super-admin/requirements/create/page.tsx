'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { RequirementForm } from '@/components/requirements/requirement-form';

export default function SuperAdminRequirementsCreatePage() {
  return (
    <DashboardLayout>
      <RequirementForm backHref="/dashboard/super-admin/requirements" />
    </DashboardLayout>
  );
}
