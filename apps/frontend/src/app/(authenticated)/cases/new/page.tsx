'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { CaseCreationForm } from '@/components/cases/case-creation-form';

/**
 * Case Creation Page
 *
 * Route: /cases/new
 *
 * Multi-section form for creating new cases with:
 * - Basic Information (source, type, severity)
 * - Details (summary, rich text description)
 * - Reporter Information (optional)
 * - Incident Location (optional)
 */
export default function NewCasePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/cases">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to cases</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Create New Case
              </h1>
              <p className="text-sm text-gray-500">
                Report an incident, concern, or inquiry
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <CaseCreationForm />
      </main>
    </div>
  );
}
