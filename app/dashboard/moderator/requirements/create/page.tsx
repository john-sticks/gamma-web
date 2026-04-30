'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { RequirementForm } from '@/components/requirements/requirement-form';

export default function ModeratorRequirementsCreatePage() {
  return (
    <DashboardLayout>
      <RequirementForm backHref="/dashboard/moderator/requirements" />
    </DashboardLayout>
  );
}
