'use client';

/**
 * Report Run Page
 *
 * Redirects to the report detail page where run functionality exists.
 * Route: /analytics/reports/[id]/run
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReportRunPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params?.id as string;

  useEffect(() => {
    // Redirect to the report detail page
    // The report detail page has the run functionality
    if (reportId) {
      router.replace(`/analytics/reports/${reportId}`);
    }
  }, [reportId, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Loading report...</p>
    </div>
  );
}
