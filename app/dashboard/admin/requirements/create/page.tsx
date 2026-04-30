'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { RequirementForm } from '@/components/requirements/requirement-form';

export default function AdminRequirementsCreatePage() {
  return (
    <DashboardLayout>
      <RequirementForm backHref="/dashboard/admin/requirements" />
    </DashboardLayout>
  );
}
