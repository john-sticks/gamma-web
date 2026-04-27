import {
  LayoutDashboard,
  Users,
  // Activity,
  MapPin,
  Calendar,
  PlusCircle,
  ClipboardCheck,
  FileCheck,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '@/types/auth';

export interface SidebarItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

// Super Admin - Acceso completo
const superAdminItems: SidebarSection[] = [
  {
    title: 'General',
    items: [
      {
        title: 'Mapa de Eventos',
        href: '/dashboard/super-admin/events/map',
        icon: MapPin,
        description: 'Visualizar eventos en mapa',
      },
      {
        title: 'Eventos',
        href: '/dashboard/super-admin/events',
        icon: Calendar,
        description: 'Gestión de eventos',
      },
      {
        title: 'Notificaciones',
        href: '/dashboard/super-admin/notifications',
        icon: Bell,
        badge: 'notifications',
      },
    ],
  },
  {
    title: 'Moderación',
    items: [
      {
        title: 'Eventos Pendientes',
        href: '/dashboard/super-admin/events/pending',
        icon: ClipboardCheck,
        description: 'Aprobar/Rechazar eventos',
        badge: 'pending-events',
      },
      {
        title: 'Panoramas Pendientes',
        href: '/dashboard/super-admin/events/pending-updates',
        icon: FileCheck,
        description: 'Aprobar/Rechazar panoramas',
        badge: 'pending-updates',
      },
    ],
  },
  {
    title: 'Gestión',
    items: [
      {
        title: 'Usuarios',
        href: '/dashboard/super-admin/users',
        icon: Users,
        description: 'Gestión de usuarios',
      },
    ],
  },
];

// Admin - Gestión de eventos y usuarios
const adminItems: SidebarSection[] = [
  {
    title: 'General',
    items: [
      {
        title: 'Mapa de Eventos',
        href: '/dashboard/admin/events/map',
        icon: MapPin,
        description: 'Visualizar eventos en mapa',
      },
      {
        title: 'Eventos',
        href: '/dashboard/admin/events',
        icon: Calendar,
        description: 'Gestión de eventos',
      },
      {
        title: 'Notificaciones',
        href: '/dashboard/admin/notifications',
        icon: Bell,
        badge: 'notifications',
      },
    ],
  },
  {
    title: 'Moderación',
    items: [
      {
        title: 'Eventos Pendientes',
        href: '/dashboard/admin/events/pending',
        icon: ClipboardCheck,
        description: 'Aprobar/Rechazar eventos',
        badge: 'pending-events',
      },
      {
        title: 'Panoramas Pendientes',
        href: '/dashboard/admin/events/pending-updates',
        icon: FileCheck,
        description: 'Aprobar/Rechazar panoramas',
        badge: 'pending-updates',
      },
    ],
  },
  {
    title: 'Gestión',
    items: [
      {
        title: 'Usuarios',
        href: '/dashboard/admin/users',
        icon: Users,
        description: 'Gestión de usuarios',
      },
    ],
  },
];

// Moderator - Vista de eventos y usuarios
const moderatorItems: SidebarSection[] = [
  {
    title: 'General',
    items: [
      {
        title: 'Mapa de Eventos',
        href: '/dashboard/moderator/events/map',
        icon: MapPin,
        description: 'Visualizar eventos en mapa',
      },
      {
        title: 'Eventos',
        href: '/dashboard/moderator/events',
        icon: Calendar,
        description: 'Ver eventos',
      },
      {
        title: 'Notificaciones',
        href: '/dashboard/moderator/notifications',
        icon: Bell,
        badge: 'notifications',
      },
    ],
  },
  {
    title: 'Moderación',
    items: [
      {
        title: 'Eventos Pendientes',
        href: '/dashboard/moderator/events/pending',
        icon: ClipboardCheck,
        description: 'Aprobar eventos',
        badge: 'pending-events',
      },
      {
        title: 'Panoramas Pendientes',
        href: '/dashboard/moderator/events/pending-updates',
        icon: FileCheck,
        description: 'Aprobar panoramas',
        badge: 'pending-updates',
      },
      // {
      //   title: 'Actividad',
      //   href: '/dashboard/moderator/activity',
      //   icon: Activity,
      //   description: 'Monitoreo de actividad',
      // },
    ],
  },
  // {
  //   title: 'Gestión',
  //   items: [
  //     {
  //       title: 'Usuarios',
  //       href: '/dashboard/moderator/users',
  //       icon: Users,
  //       description: 'Ver usuarios',
  //     },
  //   ],
  // },
];

// Standard User - Vista básica
const userItems: SidebarSection[] = [
  {
    title: 'General',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard/user',
        icon: LayoutDashboard,
        description: 'Mi dashboard',
      },
      {
        title: 'Mis Eventos',
        href: '/dashboard/user/events',
        icon: Calendar,
        description: 'Ver mis eventos',
      },
      {
        title: 'Crear Evento',
        href: '/dashboard/user/events/create',
        icon: PlusCircle,
        description: 'Crear nuevo evento',
      },
      {
        title: 'Notificaciones',
        href: '/dashboard/user/notifications',
        icon: Bell,
        badge: 'notifications',
      },
    ],
  },
];

// Read Only - Solo visualización
const readOnlyItems: SidebarSection[] = [
  {
    title: 'General',
    items: [
      {
        title: 'Mapa de Eventos',
        href: '/dashboard/readonly/events/map',
        icon: MapPin,
        description: 'Visualizar eventos en mapa',
      },
      {
        title: 'Eventos',
        href: '/dashboard/readonly/events',
        icon: Calendar,
        description: 'Ver eventos',
      },
      {
        title: 'Notificaciones',
        href: '/dashboard/readonly/notifications',
        icon: Bell,
        badge: 'notifications',
      },
    ],
  },
];

export const sidebarConfig: Record<UserRole, SidebarSection[]> = {
  level_1: superAdminItems,
  level_2: adminItems,
  level_3: moderatorItems,
  level_4: userItems,
  level_5: readOnlyItems,
};
