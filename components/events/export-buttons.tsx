'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ExportButtonsProps {
  filters?: Record<string, string | string[]>;
  eventId?: string;
}

export function ExportButtons({ filters, eventId }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: 'xlsx' | 'csv') {
    setIsExporting(true);
    try {
      let url: string;

      if (eventId) {
        url = `/api/events/${eventId}/export`;
      } else {
        const params = new URLSearchParams();
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (value && value !== 'all') {
              if (Array.isArray(value) && value.length > 0) {
                params.append(key, value.join(','));
              } else if (typeof value === 'string') {
                params.append(key, value);
              }
            }
          }
        }
        const queryString = params.toString();
        url = `/api/events/export/${format}${queryString ? `?${queryString}` : ''}`;
      }

      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const ext = eventId ? 'xlsx' : format;
      a.download = `eventos-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

      toast.success(`Archivo ${ext.toUpperCase()} descargado`);
    } catch {
      toast.error('Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  }

  if (eventId) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('xlsx')}
        disabled={isExporting}
        className="hover:cursor-pointer"
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Exportar historial
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className="hover:cursor-pointer"
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="mr-2 h-4 w-4" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
