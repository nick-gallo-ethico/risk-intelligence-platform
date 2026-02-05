'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  LogOut,
  Megaphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import type { UserRole } from '@/types/auth';

/**
 * Navigation item type definition
 */
interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  requiredRoles?: UserRole[];
}

/**
 * Main navigation items - visible to all authenticated users
 */
const mainNavItems: NavItem[] = [
  { title: 'Home', href: '/dashboard', icon: Home },
  { title: 'Cases', href: '/cases', icon: Briefcase },
  { title: 'Investigations', href: '/investigations', icon: Search },
  { title: 'Disclosures', href: '/disclosures', icon: FileWarning },
  { title: 'Policies', href: '/policies', icon: FileText },
  { title: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { title: 'Projects', href: '/projects', icon: FolderKanban },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
];

/**
 * Admin navigation items - restricted by role
 */
const adminNavItems: NavItem[] = [
  {
    title: 'Users',
    href: '/settings/users',
    icon: Users,
    requiredRoles: ['SYSTEM_ADMIN', 'CCO', 'COMPLIANCE_OFFICER'],
  },
  {
    title: 'Roles',
    href: '/settings/roles',
    icon: Shield,
    requiredRoles: ['SYSTEM_ADMIN'],
  },
  {
    title: 'Settings',
    href: '/settings/organization',
    icon: Settings,
    requiredRoles: ['SYSTEM_ADMIN', 'CCO', 'COMPLIANCE_OFFICER'],
  },
  {
    title: 'Audit Log',
    href: '/settings/audit',
    icon: ClipboardList,
    requiredRoles: ['SYSTEM_ADMIN', 'CCO', 'COMPLIANCE_OFFICER'],
  },
  {
    title: 'Integrations',
    href: '/settings/integrations',
    icon: Plug,
    requiredRoles: ['SYSTEM_ADMIN'],
  },
];

/**
 * Check if user has required role for a nav item
 */
function hasRequiredRole(
  userRole: UserRole | undefined,
  requiredRoles?: UserRole[]
): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

/**
 * Check if user should see admin section at all
 */
function canSeeAdminSection(userRole: UserRole | undefined): boolean {
  if (!userRole) return false;
  const adminRoles: UserRole[] = ['SYSTEM_ADMIN', 'CCO', 'COMPLIANCE_OFFICER'];
  return adminRoles.includes(userRole);
}

interface MobileMoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * MobileMoreDrawer
 *
 * Full navigation drawer that slides in from the left on mobile.
 * Contains all navigation items grouped by section (Main, Admin).
 * Shows user info and logout button at the bottom.
 */
export function MobileMoreDrawer({ open, onOpenChange }: MobileMoreDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  /**
   * Check if a route is active (exact match or starts with)
   */
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  /**
   * Handle navigation - close drawer and navigate
   */
  const handleNavigation = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    onOpenChange(false);
    await logout();
    router.push('/login');
  };

  /**
   * Get user's display name
   */
  const userName = user
    ? `${user.firstName} ${user.lastName}`
    : 'Unknown User';

  /**
   * Get user's role display name
   */
  const userRoleDisplay = user?.role?.replace(/_/g, ' ') || 'User';

  /**
   * Filter admin items based on user role
   */
  const visibleAdminItems = adminNavItems.filter((item) =>
    hasRequiredRole(user?.role, item.requiredRoles)
  );

  const showAdminSection = canSeeAdminSection(user?.role) && visibleAdminItems.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Ethico
          </SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation menu
          </SheetDescription>
        </SheetHeader>

        {/* Navigation sections - scrollable */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Main navigation */}
          <nav className="px-2">
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Navigation
            </p>
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-foreground hover:bg-accent/50'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.title}
                </button>
              ))}
            </div>
          </nav>

          {/* Admin section - only visible to authorized users */}
          {showAdminSection && (
            <>
              <Separator className="my-3" />
              <nav className="px-2">
                <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
                <div className="space-y-1">
                  {visibleAdminItems.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        'flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors',
                        isActive(item.href)
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-foreground hover:bg-accent/50'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.title}
                    </button>
                  ))}
                </div>
              </nav>
            </>
          )}
        </div>

        {/* User info and logout - fixed at bottom */}
        <div className="border-t p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.firstName?.charAt(0) || 'U'}
                {user?.lastName?.charAt(0) || ''}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">
                {userRoleDisplay}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
