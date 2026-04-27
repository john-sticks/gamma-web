'use client';

import { Suspense } from 'react';
import { EventsPresentation } from '@/components/events/events-presentation';

export default function PresentationMapPage() {
  return (
    <Suspense>
      <EventsPresentation />
    </Suspense>
  );
}
