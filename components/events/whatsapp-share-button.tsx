'use client';

import { useState } from 'react';
import { MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { Event, EventUpdate } from '@/types/events';
import { generateWhatsAppMessage } from '@/utils/whatsapp-message';

interface WhatsAppShareButtonProps {
  event: Event;
  updates?: EventUpdate[];
  latestUpdate?: {
    attendeeCount?: number | null;
    policePresence?: boolean;
    streetClosure?: boolean;
    notes?: string;
    updateType?: string;
  } | null;
  size?: 'default' | 'sm' | 'icon';
  variant?: 'outline' | 'ghost' | 'default';
}

export function WhatsAppShareButton({
  event,
  updates,
  latestUpdate,
  size = 'icon',
  variant = 'outline',
}: WhatsAppShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const message = generateWhatsAppMessage(event, updates, latestUpdate);
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Mensaje copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleCopy}
            className="hover:cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copiar mensaje para WhatsApp</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
