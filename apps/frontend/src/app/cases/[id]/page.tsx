'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { casesApi } from '@/lib/cases-api';
import { CaseDetailLayout } from '@/components/cases/case-detail-layout';
import type { Case } from '@/types/case';

/**
 * Case Detail Page
 *
 * Displays a single case with HubSpot-style 3-column layout:
 * - Left: Case properties
 * - Center: Activity timeline
 * - Right: Investigations, AI summary
 *
 * Route: /cases/[id]
 */
export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const caseId = params.id as string;

  const fetchCase = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await casesApi.getById(caseId);
      setCaseData(data);
    } catch (err) {
      console.error('Failed to fetch case:', err);
      // Check if it's a 404
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          setError('Case not found. It may have been deleted or you may not have access.');
        } else {
          setError('Failed to load case. Please try again.');
        }
      } else {
        setError('Failed to load case. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch case data when authenticated
  useEffect(() => {
    if (isAuthenticated && caseId) {
      fetchCase();
    }
  }, [isAuthenticated, caseId, fetchCase]);

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
    <CaseDetailLayout
      caseData={caseData}
      isLoading={loading}
      error={error}
    />
  );
}
