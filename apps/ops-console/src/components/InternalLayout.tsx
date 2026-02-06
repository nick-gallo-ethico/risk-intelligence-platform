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
  FileText,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InternalLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Hotline Ops', href: '/hotline', icon: Headphones },
  { name: 'Support Console', href: '/support', icon: Shield },
  { name: 'Implementations', href: '/implementations', icon: ListChecks },
  { name: 'Client Health', href: '/health', icon: BarChart3 },
  { name: 'Training', href: '/training', icon: GraduationCap },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function InternalLayout({ children }: InternalLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* Logo / Title */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg internal-ops-banner flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">Ethico Internal</h1>
              <p className="text-xs text-gray-500">Operations Console</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
              >
                <item.icon className="h-5 w-5" />
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
      <div className="flex-1 flex flex-col">
        {/* Internal ops banner */}
        <div className="internal-ops-banner px-4 py-1.5">
          <p className="text-white text-xs font-medium text-center">
            Internal Operations Console - VPN Required
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
