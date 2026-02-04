'use client';

/**
 * Operator Console Layout
 *
 * Root layout for the Operator Console.
 * - Requires authentication with OPERATOR role
 * - Minimal layout (no sidebar - full screen for console)
 * - Redirects unauthorized users
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

// Operator role check - in production this would come from auth types
const OPERATOR_ROLES = ['OPERATOR', 'SYSTEM_ADMIN'];

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login?returnUrl=/operator');
      return;
    }

    // Check for operator role
    if (!isLoading && isAuthenticated && user) {
      const hasOperatorRole = OPERATOR_ROLES.includes(user.role);
      if (!hasOperatorRole) {
        // Redirect non-operators to dashboard
        router.push('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Don't render children if not authenticated or not operator
  if (!isAuthenticated || !user || !OPERATOR_ROLES.includes(user.role)) {
    return null;
  }

  // Full-screen layout with no sidebar for operator console
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {children}
    </div>
  );
}
