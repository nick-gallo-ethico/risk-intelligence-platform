'use client';

/**
 * Go-Live Readiness Page
 *
 * Shows go-live readiness status with:
 * - Summary status (can/cannot go live)
 * - List of blockers preventing go-live
 * - GoLiveChecklist component with gates, score, and sign-off
 */

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { GoLiveChecklist } from '@/components/implementation/GoLiveChecklist';
import {
  ArrowLeft,
  Rocket,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface GoLiveStatus {
  allGatesPassed: boolean;
  passedGates: number;
  totalGates: number;
  readinessScore: number;
  recommendedScore: number;
  isRecommendedMet: boolean;
  hasSignoff: boolean;
  canGoLive: boolean;
  blockers: string[];
}

export default function GoLivePage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const {
    data: status,
    isLoading,
    error,
  } = useQuery<GoLiveStatus>({
    queryKey: ['go-live-status', projectId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/internal/implementations/${projectId}/go-live/status`
      );
      if (!res.ok) {
        throw new Error('Failed to fetch go-live status');
      }
      return res.json();
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading go-live status...</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="text-center py-24">
        <p className="text-red-500 mb-4">Failed to load go-live status.</p>
        <Link
          href={`/internal/implementation/${projectId}`}
          className="text-blue-600 hover:underline"
        >
          Back to project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/internal/implementation/${projectId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Go-Live Readiness</h1>
          <p className="text-gray-500">
            Check all requirements before going live
          </p>
        </div>
        {status.canGoLive && (
          <button className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
            <Rocket className="h-5 w-5" />
            Launch!
          </button>
        )}
      </div>

      {/* Summary status card */}
      <div
        className={`p-6 rounded-lg border-2 ${
          status.canGoLive
            ? 'bg-green-50 border-green-300'
            : 'bg-yellow-50 border-yellow-300'
        }`}
      >
        <div className="flex items-center gap-4 mb-4">
          {status.canGoLive ? (
            <CheckCircle className="h-10 w-10 text-green-500" />
          ) : (
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {status.canGoLive ? 'Ready to Go Live!' : 'Not Yet Ready'}
            </h2>
            <p className="text-gray-600">
              {status.blockers?.length || 0} blocker(s) remaining
            </p>
          </div>
        </div>

        {/* Blockers list */}
        {status.blockers && status.blockers.length > 0 && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <h3 className="font-medium text-gray-900 mb-2">
              Issues to resolve:
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {status.blockers.map((blocker, i) => (
                <li key={i}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Go-Live Checklist component */}
      <GoLiveChecklist projectId={projectId} status={status} />
    </div>
  );
}
