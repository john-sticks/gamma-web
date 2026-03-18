'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MapEvent } from '@/components/events/events-map';
import {
  type TimeFilter,
  TIME_FILTER_LABELS,
  MONTH_NAMES,
  filterEventsByTime,
  getAvailableYears,
} from '@/lib/filter-events';

const EventsMap = dynamic(
  () => import('@/components/events/events-map').then((mod) => ({ default: mod.EventsMap })),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-lg" /> }
);

export default function EventsMapPage() {
  const now = new Date();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', 'map'],
    queryFn: async () => {
      const response = await fetch('/api/events/map', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json() as Promise<MapEvent[]>;
    },
  });

  const filteredEvents = events
    ? filterEventsByTime(events, timeFilter, selectedMonth, selectedYear)
    : undefined;

  const availableYears = events ? getAvailableYears(events) : [now.getFullYear()];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-full mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Mapa de Eventos</h1>
            <p className="text-muted-foreground mt-2">
              Visualiza todos los eventos aprobados en Buenos Aires
            </p>
          </div>

          {/* Map Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Eventos en Buenos Aires</CardTitle>
                  <CardDescription>
                    {filteredEvents ? `${filteredEvents.length} eventos aprobados` : 'Cargando eventos...'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 rounded-lg border p-1">
                    {(Object.entries(TIME_FILTER_LABELS) as [TimeFilter, string][]).map(([key, label]) => (
                      <Button
                        key={key}
                        variant={timeFilter === key ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTimeFilter(key)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  {timeFilter === 'month' && (
                    <>
                      <Select
                        value={String(selectedMonth)}
                        onValueChange={(v) => setSelectedMonth(Number(v))}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((name, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(selectedYear)}
                        onValueChange={(v) => setSelectedYear(Number(v))}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] w-full">
                {isLoading ? (
                  <div className="h-full w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Cargando mapa...</p>
                  </div>
                ) : filteredEvents && filteredEvents.length > 0 ? (
                  <EventsMap events={filteredEvents} />
                ) : (
                  <div className="h-full w-full bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">No hay eventos para mostrar</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle>Leyenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm">Manifestación</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <span className="text-sm">Marcha</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Concentración</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm">Asamblea</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-indigo-500"></div>
                  <span className="text-sm">Otro</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
