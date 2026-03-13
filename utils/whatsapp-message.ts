import type { Event, EventUpdate } from '@/types/events';

interface LatestUpdateData {
  attendeeCount?: number | null;
  policePresence?: boolean;
  streetClosure?: boolean;
  notes?: string;
  updateType?: string;
}

export function generateWhatsAppMessage(
  event: Event,
  updates?: EventUpdate[],
  latestUpdate?: LatestUpdateData | null,
): string {
  const lines: string[] = [];

  // Header
  lines.push('*Panorama*');
  lines.push('');

  // Location: Localidad/Ciudad
  const locationParts: string[] = [];
  if (event.locality) {
    locationParts.push(event.locality.name);
  }
  if (event.city?.name) {
    locationParts.push(event.city.name);
  }
  if (locationParts.length > 0) {
    lines.push(locationParts.join('/'));
  }

  // Determine the update data to use (from updates array or latestUpdate prop)
  let updateData: LatestUpdateData | null = null;

  if (updates && updates.length > 0) {
    const sorted = [...updates]
      .filter((u) => u.updateType !== 'event_created')
      .sort(
        (a, b) =>
          new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime(),
      );
    if (sorted.length > 0) {
      updateData = sorted[0];
    }
  } else if (latestUpdate && latestUpdate.updateType !== 'event_created') {
    updateData = latestUpdate;
  }

  // Build the main body: "Título: notas. Personas. Con/Sin corte."
  const suffixParts: string[] = [];
  let body = event.title;

  if (updateData) {
    if (updateData.notes) {
      body += `: ${updateData.notes}`;
    }

    if (updateData.attendeeCount != null && updateData.attendeeCount > 0) {
      suffixParts.push(`${updateData.attendeeCount} personas`);
    }

    if (updateData.policePresence) {
      suffixParts.push('Con presencia policial');
    }

    if (updateData.streetClosure) {
      suffixParts.push('Con corte');
    } else {
      suffixParts.push('Sin corte');
    }
  } else {
    if (event.description) {
      body += `: ${event.description}`;
    }
    if (event.attendeeCount) {
      suffixParts.push(`~${event.attendeeCount} personas estimadas`);
    }
  }

  lines.push(
    body + (suffixParts.length > 0 ? '. ' + suffixParts.join('. ') + '.' : ''),
  );

  return lines.join('\n');
}
