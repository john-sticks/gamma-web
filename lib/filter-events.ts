export type TimeFilter = 'today' | 'week' | 'month';

export const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Mes',
};

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

export function filterEventsByTime<T extends { eventDate: string }>(
  events: T[],
  filter: TimeFilter,
  selectedMonth?: number,
  selectedYear?: number
): T[] {
  const now = new Date();

  switch (filter) {
    case 'today': {
      return events.filter((e) => {
        const d = new Date(e.eventDate);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      });
    }
    case 'week': {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(now.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return events.filter((e) => {
        const d = new Date(e.eventDate);
        return d >= monday && d <= sunday;
      });
    }
    case 'month': {
      const year = selectedYear ?? now.getFullYear();
      const month = selectedMonth ?? now.getMonth();
      return events.filter((e) => {
        const d = new Date(e.eventDate);
        return d.getFullYear() === year && d.getMonth() === month;
      });
    }
  }
}

/** Returns sorted unique years from events, or a default range if empty. */
export function getAvailableYears<T extends { eventDate: string }>(events: T[]): number[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>();
  for (const e of events) {
    years.add(new Date(e.eventDate).getFullYear());
  }
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
}
