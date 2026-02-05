'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Briefcase, FileText, BarChart3, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileMoreDrawer } from './mobile-more-drawer';
import { useState } from 'react';

/**
 * Bottom navigation items for mobile view
 * These are the 4 primary navigation items visible at all times
 */
const bottomNavItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/cases', icon: Briefcase, label: 'Cases' },
  { href: '/policies', icon: FileText, label: 'Policies' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
];

/**
 * MobileBottomNav
 *
 * Fixed bottom navigation bar for mobile screens (< 768px).
 * Shows 4 primary navigation items + More button that opens full navigation drawer.
 * Hidden on desktop via md:hidden class.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  /**
   * Check if the current path matches or starts with the nav item's href
   * This ensures nested routes also highlight the parent nav item
   */
  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 bg-background border-t md:hidden z-50">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 transition-colors',
                isActive(item.href)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}

          {/* More button - opens the full navigation drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </nav>

      {/* More drawer with full navigation */}
      <MobileMoreDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
