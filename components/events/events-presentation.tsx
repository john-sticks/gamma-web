'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { X, Filter, Info, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MapEvent } from '@/components/events/events-map';
import { EVENT_LIFECYCLE_STATUS_LABELS } from '@/types/events';
import { useRouter } from 'next/navigation';
import {
  type TimeFilter,
  TIME_FILTER_LABELS,
  MONTH_NAMES,
  filterEventsByTime,
  getAvailableYears,
} from '@/lib/filter-events';

const EventsMap = dynamic(
  () => import('@/components/events/events-map').then((mod) => ({ default: mod.EventsMap })),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse" /> }
);

export function EventsPresentation() {
  const router = useRouter();
  const now = new Date();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLifecycle, setFilterLifecycle] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: allEvents, isLoading } = useQuery({
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

  // Filter events by time, then by type, then by lifecycle status
  const timeFilteredEvents = allEvents
    ? filterEventsByTime(allEvents, timeFilter, selectedMonth, selectedYear)
    : undefined;
  const filteredEvents = timeFilteredEvents
    ?.filter(event => filterType === 'all' || event.eventType === filterType)
    .filter(event => filterLifecycle === 'all' || event.lifecycleStatus === filterLifecycle);

  const availableYears = allEvents ? getAvailableYears(allEvents) : [now.getFullYear()];

  const toggleFullscreen = () => {
    if (typeof window === 'undefined') return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen to fullscreen changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="fixed inset-0 bg-background">
      {/* Map Container */}
      <div className="absolute inset-0">
        {isLoading ? (
          <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
            <p className="text-lg text-muted-foreground">Cargando mapa...</p>
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <EventsMap events={filteredEvents} zoom={10} />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <p className="text-lg text-muted-foreground">No hay eventos para mostrar</p>
          </div>
        )}
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <Card className="pointer-events-auto shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl">
                  Mapa de Eventos - Buenos Aires
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary animate-pulse"></div>
                    <span className="font-medium">
                      {filteredEvents?.length || 0} eventos
                    </span>
                  </div>
                  {filterType !== 'all' && (
                    <Badge variant="outline">
                      Tipo: {filterType}
                    </Badge>
                  )}
                  {filterLifecycle !== 'all' && (
                    <Badge variant="outline">
                      Estado: {EVENT_LIFECYCLE_STATUS_LABELS[filterLifecycle as keyof typeof EVENT_LIFECYCLE_STATUS_LABELS]}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 pointer-events-auto">
              <Button
                variant={showFilters ? 'default' : 'secondary'}
                size="icon"
                className="shadow-lg"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="shadow-lg"
                onClick={() => setShowLegend(!showLegend)}
              >
                <Info className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="shadow-lg"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="shadow-lg"
                onClick={() => router.back()}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute top-6 right-52 z-10 pointer-events-none">
          <Card className="w-80 shadow-lg pointer-events-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Time Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Período</label>
                  <div className="flex gap-1 rounded-lg border p-1">
                    {(Object.entries(TIME_FILTER_LABELS) as [TimeFilter, string][]).map(([key, label]) => (
                      <Button
                        key={key}
                        variant={timeFilter === key ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setTimeFilter(key)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  {timeFilter === 'month' && (
                    <div className="flex gap-2 mt-2">
                      <Select
                        value={String(selectedMonth)}
                        onValueChange={(v) => setSelectedMonth(Number(v))}
                      >
                        <SelectTrigger className="flex-1">
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
                        <SelectTrigger className="w-24">
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
                    </div>
                  )}
                </div>

                {/* Event Type Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Evento</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="manifestacion">Manifestación</SelectItem>
                      <SelectItem value="marcha">Marcha</SelectItem>
                      <SelectItem value="concentracion">Concentración</SelectItem>
                      <SelectItem value="asamblea">Asamblea</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lifecycle Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Estado del Evento</label>
                  <Select value={filterLifecycle} onValueChange={setFilterLifecycle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      {Object.entries(EVENT_LIFECYCLE_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(filterType !== 'all' || filterLifecycle !== 'all' || timeFilter !== 'today') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setFilterType('all');
                      setFilterLifecycle('all');
                      setTimeFilter('today');
                      setSelectedMonth(now.getMonth());
                      setSelectedYear(now.getFullYear());
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
          <Card className="shadow-lg pointer-events-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leyenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 shrink-0"></div>
                  <span className="text-sm">Manifestación</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500 shrink-0"></div>
                  <span className="text-sm">Marcha</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 shrink-0"></div>
                  <span className="text-sm">Concentración</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 shrink-0"></div>
                  <span className="text-sm">Asamblea</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-indigo-500 shrink-0"></div>
                  <span className="text-sm">Otro</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event Count Bottom Right */}
      <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
        <Card className="shadow-lg pointer-events-auto">
          <CardContent className="pt-4 px-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-primary">
                {filteredEvents?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                evento{filteredEvents?.length !== 1 ? 's' : ''}<br />
                {filterType === 'all' && filterLifecycle === 'all' && timeFilter === 'today' ? 'total' : 'filtrado'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
