'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session-query';
import { sidebarConfig } from '@/config/sidebar-config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ROLE_NAMES } from '@/types/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  onClose?: () => void;
  onLogout: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onClose, onLogout, collapsed = false, onToggleCollapse }: SidebarProps) {

  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/unread-count', {
        credentials: 'include',
      });
      if (!response.ok) return { count: 0 };
      return response.json() as Promise<{ count: number }>;
    },
    refetchInterval: 30000,
  });

  const canModerate = session?.user.role && ['level_1', 'level_2', 'level_3'].includes(session.user.role);
  const isLevel4 = session?.user.role === 'level_4';

  const { data: pendingData } = useQuery({
    queryKey: ['events', 'pending-count'],
    queryFn: async () => {
      const response = await fetch('/api/events/pending-count', {
        credentials: 'include',
      });
      if (!response.ok) return { count: 0 };
      return response.json() as Promise<{ count: number }>;
    },
    refetchInterval: 30000,
    enabled: !!canModerate,
  });

  const { data: pendingUpdatesData } = useQuery({
    queryKey: ['events', 'pending-updates-count'],
    queryFn: async () => {
      const response = await fetch('/api/events/updates/pending-count', {
        credentials: 'include',
      });
      if (!response.ok) return { count: 0 };
      return response.json() as Promise<{ count: number }>;
    },
    refetchInterval: 30000,
    enabled: !!canModerate,
  });

  const { data: pendingRequirementsData } = useQuery({
    queryKey: ['requirements', 'pending-count'],
    queryFn: async () => {
      const response = await fetch('/api/requirements/my/pending-count', {
        credentials: 'include',
      });
      if (!response.ok) return { count: 0 };
      return response.json() as Promise<{ count: number }>;
    },
    refetchInterval: 60000,
    enabled: !!isLevel4,
  });

  if (!session) {
    return null;
  }

  const sections = sidebarConfig[session.user.role];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col bg-card border-r border-border">
        {/* Header */}
        <div className={cn(
          'flex items-center border-b border-border',
          collapsed ? 'justify-center p-4' : 'justify-between p-6'
        )}>
          {!collapsed && (
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Gamma</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {ROLE_NAMES[session.user.role]}
              </p>
            </div>
          )}
          {collapsed && (
            <h2 className="text-lg font-semibold">G</h2>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex h-8 w-8 hover:cursor-pointer"
                  onClick={onToggleCollapse}
                >
                  {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? 'Expandir' : 'Colapsar'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* User Info */}
        {!collapsed ? (
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold shrink-0">
                {session.user.firstName[0]}
                {session.user.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session.user.firstName} {session.user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{session.user.username}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 border-b border-border flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {session.user.firstName[0]}
                  {session.user.lastName[0]}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {session.user.firstName} {session.user.lastName}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn('flex-1 overflow-y-auto', collapsed ? 'p-2' : 'p-4')}>
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-6">
              {!collapsed && (
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  const badge = (
                    <>
                      {item.badge === 'notifications' && unreadData && unreadData.count > 0 && (
                        <span className={cn(
                          'flex items-center justify-center rounded-full bg-destructive font-bold text-destructive-foreground',
                          collapsed ? 'absolute -top-1 -right-1 h-4 min-w-4 text-[9px] px-1' : 'h-5 min-w-5 text-[10px] px-1.5'
                        )}>
                          {unreadData.count > 99 ? '99+' : unreadData.count}
                        </span>
                      )}
                      {item.badge === 'pending-events' && pendingData && pendingData.count > 0 && (
                        <span className={cn(
                          'flex items-center justify-center rounded-full bg-orange-500 font-bold text-white',
                          collapsed ? 'absolute -top-1 -right-1 h-4 min-w-4 text-[9px] px-1' : 'h-5 min-w-5 text-[10px] px-1.5'
                        )}>
                          {pendingData.count > 99 ? '99+' : pendingData.count}
                        </span>
                      )}
                      {item.badge === 'pending-updates' && pendingUpdatesData && pendingUpdatesData.count > 0 && (
                        <span className={cn(
                          'flex items-center justify-center rounded-full bg-amber-500 font-bold text-white',
                          collapsed ? 'absolute -top-1 -right-1 h-4 min-w-4 text-[9px] px-1' : 'h-5 min-w-5 text-[10px] px-1.5'
                        )}>
                          {pendingUpdatesData.count > 99 ? '99+' : pendingUpdatesData.count}
                        </span>
                      )}
                      {item.badge === 'pending-requirements' && pendingRequirementsData && pendingRequirementsData.count > 0 && (
                        <span className={cn(
                          'flex items-center justify-center rounded-full bg-blue-500 font-bold text-white',
                          collapsed ? 'absolute -top-1 -right-1 h-4 min-w-4 text-[9px] px-1' : 'h-5 min-w-5 text-[10px] px-1.5'
                        )}>
                          {pendingRequirementsData.count > 99 ? '99+' : pendingRequirementsData.count}
                        </span>
                      )}
                    </>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              'relative flex items-center justify-center rounded-lg p-2 transition-all',
                              isActive
                                ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            {badge}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex-1">
                        <div>{item.title}</div>
                        {item.description && !isActive && (
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </div>
                      {badge}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn('border-t border-border space-y-2', collapsed ? 'p-2' : 'p-4')}>
          {!collapsed ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Tema</span>
                <ThemeToggle />
              </div>
              <Button
                variant="outline"
                className="w-full justify-start hover:cursor-pointer"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-full hover:cursor-pointer"
                    onClick={onLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Cerrar Sesión
                </TooltipContent>
              </Tooltip>
            </>
          )}

        </div>
      </div>
    </TooltipProvider>
  );
}
