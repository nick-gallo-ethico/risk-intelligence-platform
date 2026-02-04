'use client';

/**
 * EmployeeHeader Component
 *
 * Header for the Employee Portal with:
 * - User avatar and name
 * - Department/role display
 * - Notification bell with unread count
 * - Quick action dropdown (Report Issue, Settings, Logout)
 * - Mobile hamburger for navigation
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  ChevronDown,
  Menu,
  X,
  AlertTriangle,
  Settings,
  LogOut,
  User,
  Home,
  CheckSquare,
  History,
  FileText,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/auth-context';
import type { EmployeeProfile } from '@/hooks/useEmployeeProfile';

export interface EmployeeHeaderProps {
  /** Employee profile data */
  profile: EmployeeProfile | null;
  /** Whether profile is loading */
  isLoading?: boolean;
}

/**
 * Mobile navigation links for employee portal.
 */
const navLinks = [
  { href: '/employee', icon: Home, label: 'Dashboard' },
  { href: '/employee?tab=tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/employee?tab=history', icon: History, label: 'History' },
  { href: '/employee?tab=policies', icon: FileText, label: 'Policies' },
];

/**
 * Get initials from a name.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function EmployeeHeader({ profile, isLoading }: EmployeeHeaderProps) {
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Placeholder notification count (would come from notifications API)
  const notificationCount = 0;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and brand */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 -ml-2 hover:bg-muted rounded-md"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <Link href="/employee" className="flex items-center space-x-2">
            <span className="font-semibold text-lg">Ethico</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">
              | Employee Portal
            </span>
          </Link>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/employee/notifications">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Link>
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2"
                disabled={isLoading}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={profile?.name || 'User'} />
                  <AvatarFallback>
                    {profile ? getInitials(profile.name) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start text-sm">
                  <span className="font-medium">
                    {isLoading ? 'Loading...' : profile?.name || 'User'}
                  </span>
                  {profile?.department && (
                    <span className="text-xs text-muted-foreground">
                      {profile.department}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 hidden md:block text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.email || ''}
                  </p>
                  {profile?.jobTitle && (
                    <p className="text-xs text-muted-foreground">{profile.jobTitle}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/employee/report" className="cursor-pointer">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Report an Issue
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/employee/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container px-4 py-4">
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <link.icon className="h-5 w-5 text-muted-foreground" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}

export default EmployeeHeader;
