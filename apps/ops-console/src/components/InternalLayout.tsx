'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Headphones,
  Settings,
  Users,
  BarChart3,
  Shield,
  ListChecks,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImpersonationBar } from './ImpersonationBar';
import { useImpersonation } from '@/hooks/useImpersonation';

interface InternalLayoutProps {
  children: React.ReactNode;
}

/**
 * Navigation items for the internal operations console.
 * Organized by team/function per CONTEXT.md user personas.
 */
const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Support Console', href: '/support', icon: Shield },
  { name: 'Implementation', href: '/implementation', icon: ListChecks },
  { name: 'Hotline Ops', href: '/hotline', icon: Headphones },
  { name: 'Client Success', href: '/client-success', icon: TrendingUp },
  { name: 'Training', href: '/training', icon: GraduationCap },
];

/**
 * Main layout wrapper for the Internal Operations Console.
 *
 * Per CONTEXT.md architecture:
 * - Separate admin subdomain (ops.ethico.com)
 * - ImpersonationBar always visible when impersonating
 * - Sidebar navigation for different internal teams
 * - VPN required banner
 */
export function InternalLayout({ children }: InternalLayoutProps) {
  const pathname = usePathname();
  const { isImpersonating } = useImpersonation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Impersonation bar - always at top when active */}
      <ImpersonationBar />

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'w-64 bg-white border-r flex flex-col',
            isImpersonating && 'border-l-4 border-l-blue-500'
          )}
        >
          {/* Logo / Title */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg internal-ops-banner flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-sm">Ethico Ops</h1>
                <p className="text-xs text-gray-500">Internal Console</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" role="navigation" aria-label="Main navigation">
            {navigation.map((item) => {
              const isActive =
                (item.href === '/' && pathname === '/') ||
                (item.href !== '/' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="text-xs text-gray-500">
              <p>Internal Use Only</p>
              <p className="mt-1">ops.ethico.com</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Internal ops banner - only show when NOT impersonating (bar takes over) */}
          {!isImpersonating && (
            <div className="internal-ops-banner px-4 py-1.5">
              <p className="text-white text-xs font-medium text-center">
                Internal Operations Console - VPN Required
              </p>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 p-6 overflow-auto bg-gray-50">{children}</div>
        </div>
      </div>
    </div>
  );
}
