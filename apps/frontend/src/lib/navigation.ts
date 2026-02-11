/**
 * Navigation configuration for the main sidebar
 */

import {
  Home,
  Briefcase,
  Search,
  FileWarning,
  FileText,
  FolderKanban,
  BarChart3,
  Users,
  Shield,
  Settings,
  ClipboardList,
  Plug,
  Megaphone,
  FileInput,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/auth";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: NavSubItem[];
  requiredRoles?: UserRole[];
}

export interface NavSubItem {
  title: string;
  url: string;
}

/**
 * Main navigation items visible to all authenticated users
 */
export const navigationItems: NavItem[] = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Cases",
    url: "/cases",
    icon: Briefcase,
  },
  {
    title: "Investigations",
    url: "/investigations",
    icon: Search,
  },
  {
    title: "Disclosures",
    url: "/disclosures",
    icon: FileWarning,
  },
  {
    title: "Policies",
    url: "/policies",
    icon: FileText,
  },
  {
    title: "Campaigns",
    url: "/campaigns",
    icon: Megaphone,
  },
  {
    title: "Forms",
    url: "/forms",
    icon: FileInput,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
];

/**
 * Admin navigation items - requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role
 */
export const adminItems: NavItem[] = [
  {
    title: "Workflows",
    url: "/settings/workflows",
    icon: Workflow,
    requiredRoles: ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER"],
  },
  {
    title: "Users",
    url: "/settings/users",
    icon: Users,
    requiredRoles: ["SYSTEM_ADMIN"],
  },
  {
    title: "Roles",
    url: "/settings/roles",
    icon: Shield,
    requiredRoles: ["SYSTEM_ADMIN"],
  },
  {
    title: "Settings",
    url: "/settings/organization",
    icon: Settings,
    requiredRoles: ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER"],
  },
  {
    title: "Audit Log",
    url: "/settings/audit",
    icon: ClipboardList,
    requiredRoles: ["SYSTEM_ADMIN", "COMPLIANCE_OFFICER"],
  },
  {
    title: "Integrations",
    url: "/settings/integrations",
    icon: Plug,
    requiredRoles: ["SYSTEM_ADMIN"],
  },
];

/**
 * Check if a user role has access to a nav item
 */
export function hasAccess(
  userRole: UserRole,
  requiredRoles?: UserRole[],
): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }
  return requiredRoles.includes(userRole);
}

/**
 * Filter admin items based on user role
 */
export function getAdminItemsForRole(userRole: UserRole): NavItem[] {
  return adminItems.filter((item) => hasAccess(userRole, item.requiredRoles));
}

/**
 * Check if user has access to any admin items
 */
export function canSeeAdminSection(userRole: UserRole): boolean {
  return getAdminItemsForRole(userRole).length > 0;
}
