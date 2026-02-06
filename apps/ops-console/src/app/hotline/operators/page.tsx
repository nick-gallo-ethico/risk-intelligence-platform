'use client';

import { useQuery } from '@tanstack/react-query';
import { OperatorStatusBoard } from '@/components/hotline/OperatorStatusBoard';
import { RefreshCw, Wifi } from 'lucide-react';

interface OperatorStatus {
  operatorId: string;
  status: string;
  languages?: string[];
  currentCallId?: string;
  updatedAt: string;
}

interface OperatorStatusData {
  available: number;
  onCall: number;
  onBreak: number;
  offline: number;
  operators: OperatorStatus[];
}

export default function OperatorsPage() {
  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery<OperatorStatusData>({
    queryKey: ['operator-status'],
    queryFn: async () => {
      const res = await fetch('/api/v1/internal/hotline-ops/operator-status');
      if (!res.ok) throw new Error('Failed to fetch operator status');
      return res.json();
    },
    refetchInterval: 5000, // Refresh every 5s for real-time status per CONTEXT.md
  });

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Never';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operator Status Board</h1>
          <p className="text-gray-500 flex items-center gap-2">
            <Wifi className="h-3 w-3 text-green-500" />
            Live updates every 5 seconds
            {isFetching && !isLoading && (
              <RefreshCw className="h-3 w-3 animate-spin text-primary ml-2" />
            )}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated}
        </div>
      </div>

      {/* Status Board */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Loading operator status...</span>
        </div>
      ) : data ? (
        <OperatorStatusBoard data={data} />
      ) : (
        <div className="text-center py-12 bg-white border rounded-lg">
          <p className="text-gray-500">Unable to load operator status</p>
        </div>
      )}
    </div>
  );
}
