'use client';

/**
 * Internal Operations Layout
 *
 * Layout for internal Ethico operations tools (Support, Implementation, CSM, etc.)
 * Includes navigation, tenant context display, and session management.
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,
  Settings,
  Headphones,
  Users,
  LayoutDashboard,
  LogOut,
  User,
} from 'lucide-react';

interface InternalLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  {
    label: 'Support',
    href: '/internal/support',
    icon: Headphones,
  },
  {
    label: 'Implementation',
    href: '/internal/implementation',
    icon: Building2,
  },
  {
    label: 'Client Health',
    href: '/internal/health',
    icon: LayoutDashboard,
  },
  {
    label: 'Admin',
    href: '/internal/admin',
    icon: Settings,
  },
];

export function InternalLayout({ children }: InternalLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo and title */}
          <div className="flex items-center gap-4">
            <Link
              href="/internal"
              className="flex items-center gap-2 font-semibold text-lg"
            >
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">
                E
              </div>
              <span>Ethico Internal</span>
            </Link>

            {/* Main navigation */}
            <nav className="hidden md:flex items-center gap-1 ml-8">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.href) ?? false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Internal User</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">{children}</main>
    </div>
  );
}
