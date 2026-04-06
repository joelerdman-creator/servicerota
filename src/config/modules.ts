import {
  Home,
  Calendar,
  Users,
  Share2,
  LifeBuoy,
  Briefcase,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  rightAlign?: boolean;
}

export interface ScribeModule {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  navItems: NavItem[];
  isActive: boolean;
  basePath: string; // Used to identify module from URL
}

export const MODULES: ScribeModule[] = [
  {
    id: "rota",
    name: "RotaScribe",
    description: "Volunteer Scheduling",
    icon: Calendar,
    basePath: "/dashboard/admin",
    isActive: true,
    navItems: [
      { href: "/dashboard/admin", icon: Home, label: "Dashboard" },
      { href: "/dashboard/admin/events", icon: Calendar, label: "Services & Events" },
      { href: "/dashboard/admin/volunteers", icon: Users, label: "Volunteers" },
      { href: "/dashboard/admin/sharing", icon: Share2, label: "Sharing" },
      { href: "/dashboard/admin/support", icon: LifeBuoy, label: "Help", rightAlign: true },
    ],
  },
  {
    id: "vestry",
    name: "VestryScribe",
    description: "Board & Committee Management",
    icon: Briefcase,
    basePath: "/dashboard/admin/vestry",
    isActive: false,
    navItems: [],
  },
  {
    id: "giving",
    name: "GivingScribe",
    description: "Donations & Pledges",
    icon: HeartHandshake,
    basePath: "/dashboard/admin/giving",
    isActive: false,
    navItems: [],
  },
];
