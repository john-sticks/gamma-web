'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModeratorDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/moderator/events/map');
  }, [router]);

  return null;
}
