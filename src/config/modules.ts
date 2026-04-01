import {
  Home,
  Calendar,
  Users,
  Settings,
  Share2,
  LifeBuoy,
  Briefcase,
  HeartHandshake,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
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
      { href: "/dashboard/admin/settings", icon: Settings, label: "Settings" },
      { href: "/dashboard/admin/billing", icon: CreditCard, label: "Billing" },
      { href: "/dashboard/admin/support", icon: LifeBuoy, label: "Help" },
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
