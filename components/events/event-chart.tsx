'use client';

import { Users, BarChart3, ShieldAlert, Construction } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EventChartData } from '@/types/events';
import { UPDATE_TYPE_LABELS } from '@/types/events';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface EventChartProps {
  chartData: EventChartData;
  className?: string;
}

interface TooltipData {
  timestamp: string;
  attendees: number;
  type: string;
  policePresence?: boolean;
  streetClosure?: boolean;
  notes?: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TooltipData }> }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm max-w-65">
      <div className="font-semibold mb-1.5">
        {format(new Date(data.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="font-bold text-primary">{data.attendees}</span>
          <span className="text-muted-foreground">personas</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {UPDATE_TYPE_LABELS[data.type as keyof typeof UPDATE_TYPE_LABELS] || data.type}
        </div>
        {data.policePresence && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <ShieldAlert className="h-3 w-3" />
            Presencia policial
          </div>
        )}
        {data.streetClosure && (
          <div className="flex items-center gap-1.5 text-xs text-orange-600">
            <Construction className="h-3 w-3" />
            Corte de calle
          </div>
        )}
        {data.notes && (
          <div className="text-xs text-muted-foreground italic border-t border-border pt-1 mt-1">
            {data.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export function EventChart({ chartData, className }: EventChartProps) {
  // Eliminado estado mounted y useEffect innecesario

  const { dataPoints, duration } = chartData;

  if (dataPoints.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Gráfico de Progreso
          </CardTitle>
          <CardDescription>No hay datos suficientes para mostrar el gráfico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Se necesitan actualizaciones con cantidad de personas para generar el gráfico</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxAttendees = Math.max(...dataPoints.map(dp => dp.attendees));
  const minAttendees = Math.min(...dataPoints.map(dp => dp.attendees));
  const avgAttendees = Math.round(
    dataPoints.reduce((sum, dp) => sum + dp.attendees, 0) / dataPoints.length,
  );

  // Prepare data for recharts
  const chartPoints = dataPoints.map((point) => ({
    ...point,
    timeLabel: format(new Date(point.timestamp), 'HH:mm', { locale: es }),
    dateLabel: format(new Date(point.timestamp), 'dd/MM HH:mm', { locale: es }),
  }));

  // Find indices where police or street closure events happen for reference lines
  const policePoints = chartPoints.filter(p => p.policePresence);
  const streetPoints = chartPoints.filter(p => p.streetClosure);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          Progreso del Evento
        </CardTitle>
        <CardDescription>
          {dataPoints.length} actualizaciones
          {duration && (
            <span>
              {' · '}
              {Math.floor(duration.durationMinutes / 60) > 0
                ? `${Math.floor(duration.durationMinutes / 60)}h ${duration.durationMinutes % 60}m`
                : `${duration.durationMinutes}m`
              } de duración
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-primary">{maxAttendees}</div>
            <div className="text-[10px] text-muted-foreground">Pico máximo</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-primary">{minAttendees}</div>
            <div className="text-[10px] text-muted-foreground">Mínimo</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-primary">{avgAttendees}</div>
            <div className="text-[10px] text-muted-foreground">Promedio</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-primary">{dataPoints.length}</div>
            <div className="text-[10px] text-muted-foreground">Reportes</div>
          </div>
        </div>

        {/* Interactive Chart */}
        <div className="w-full h-62.5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="attendeesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Reference line for average */}
                <ReferenceLine
                  y={avgAttendees}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                />
                {/* Mark police presence points */}
                {policePoints.map((p, i) => (
                  <ReferenceLine
                    key={`police-${i}`}
                    x={p.timeLabel}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                ))}
                {/* Mark street closure points */}
                {streetPoints.map((p, i) => (
                  <ReferenceLine
                    key={`street-${i}`}
                    x={p.timeLabel}
                    stroke="hsl(var(--chart-4, orange))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                ))}
                <Area
                  type="monotone"
                  dataKey="attendees"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#attendeesGradient)"
                  dot={{
                    r: 4,
                    fill: 'hsl(var(--primary))',
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: 'hsl(var(--primary))',
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary rounded" />
            Asistentes
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 border-t-2 border-dashed border-muted-foreground" />
            Promedio
          </div>
          {policePoints.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 border-t-2 border-dashed border-destructive" />
              Policía
            </div>
          )}
          {streetPoints.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 border-t-2 border-dashed border-orange-500" />
              Corte de calle
            </div>
          )}
        </div>

        {/* Duration footer */}
        {duration && (
          <div className="flex items-center justify-between text-xs text-muted-foreground p-2 bg-muted/50 rounded-lg">
            <span>
              Inicio: {format(new Date(duration.start), 'dd/MM/yyyy HH:mm', { locale: es })}
            </span>
            <span>
              Fin: {format(new Date(duration.end), 'dd/MM/yyyy HH:mm', { locale: es })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
