'use client';

/**
 * Employee Portal Layout
 *
 * Root layout for the Employee Portal self-service application.
 * - Requires authentication (redirects to SSO login if not authenticated)
 * - Shows onboarding if authenticated but no employee profile
 * - Provides sidebar navigation (desktop) / bottom nav (mobile)
 * - Passes employee profile context to children
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  CheckSquare,
  History,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { EmployeeProvider, useEmployee } from '@/contexts/employee-context';
import { EmployeeHeader } from '@/components/employee/employee-header';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Navigation item configuration.
 */
interface NavItem {
  href: string;
  icon: typeof Home;
  label: string;
  badge?: number;
}

/**
 * Sidebar navigation component for desktop.
 */
function SidebarNav({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return (
    <nav className="hidden md:flex flex-col w-64 border-r bg-muted/30 p-4">
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive =
            item.href === '/employee'
              ? pathname === '/employee' && !pathname.includes('?')
              : pathname.startsWith(item.href) || pathname.includes(`tab=${item.href.split('=')[1]}`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge
                    variant={isActive ? 'secondary' : 'default'}
                    className="ml-auto"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Bottom navigation component for mobile.
 */
function BottomNav({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50">
      <ul className="flex justify-around items-center h-16">
        {items.map((item) => {
          const isActive =
            item.href === '/employee'
              ? pathname === '/employee'
              : pathname.includes(`tab=${item.href.split('=')[1]}`);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center h-full gap-1 transition-colors relative',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Loading state skeleton.
 */
function LoadingState() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Inner layout component that uses employee context.
 */
function EmployeeLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile, isLoading: profileLoading } = useEmployee();

  // Build navigation items with badge counts
  const navItems: NavItem[] = [
    { href: '/employee', icon: Home, label: 'Dashboard' },
    {
      href: '/employee?tab=tasks',
      icon: CheckSquare,
      label: 'Tasks',
      badge: profile?.pendingTaskCount,
    },
    { href: '/employee?tab=history', icon: History, label: 'History' },
    { href: '/employee?tab=policies', icon: FileText, label: 'Policies' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <EmployeeHeader profile={profile} isLoading={profileLoading} />

      {/* Main content area with sidebar */}
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <SidebarNav items={navItems} pathname={pathname ?? ''} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav items={navItems} pathname={pathname ?? ''} />
    </div>
  );
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname || '/employee');
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [authLoading, isAuthenticated, router, pathname]);

  // Show loading state while checking auth
  if (authLoading) {
    return <LoadingState />;
  }

  // Don't render if not authenticated (redirect is in progress)
  if (!isAuthenticated) {
    return <LoadingState />;
  }

  return (
    <EmployeeProvider>
      <EmployeeLayoutInner>{children}</EmployeeLayoutInner>
    </EmployeeProvider>
  );
}
