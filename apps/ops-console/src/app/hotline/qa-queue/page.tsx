'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BulkQaActions } from '@/components/hotline/BulkQaActions';
import { format } from 'date-fns';
import { Building2, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QaQueueItem {
  id: string;
  referenceNumber: string;
  organization?: { id: string; name: string };
  category?: { id: string; name: string };
  priority?: number;
  createdAt: string;
  qaStatus: string;
  summary?: string;
}

interface QaQueueResponse {
  items: QaQueueItem[];
  total: number;
}

type BulkActionData = {
  reason?: string;
  assignToUserId?: string;
  priority?: number;
};

export default function QaQueuePage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery<QaQueueResponse>({
    queryKey: ['qa-queue', statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/hotline-ops/qa-queue?status=${statusFilter}`);
      if (!res.ok) throw new Error('Failed to fetch QA queue');
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30s per CONTEXT.md
  });

  const bulkActionMutation = useMutation({
    mutationFn: async (payload: {
      riuIds: string[];
      action: string;
      reason?: string;
      assignToUserId?: string;
      priority?: number;
    }) => {
      const res = await fetch('/api/v1/internal/hotline-ops/qa-queue/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Bulk action failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-queue'] });
      setSelectedIds(new Set());
    },
  });

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data?.items?.length && data?.items?.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data?.items?.map((r) => r.id) || []));
    }
  };

  const handleBulkAction = (action: string, actionData?: BulkActionData) => {
    bulkActionMutation.mutate({
      riuIds: Array.from(selectedIds),
      action,
      ...actionData,
    });
  };

  const getPriorityLabel = (priority?: number) => {
    if (!priority) return 'LOW';
    if (priority >= 3) return 'HIGH';
    if (priority >= 2) return 'MEDIUM';
    return 'LOW';
  };

  const getPriorityClasses = (priority?: number) => {
    if (!priority) return 'bg-gray-100 text-gray-700';
    if (priority >= 3) return 'bg-red-100 text-red-700';
    if (priority >= 2) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      case 'IN_REVIEW':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">QA Queue</h1>
          <p className="text-gray-500">
            {data?.total || 0} items
            {isFetching && !isLoading && (
              <span className="ml-2 text-blue-500">
                <RefreshCw className="h-3 w-3 inline animate-spin" /> Refreshing...
              </span>
            )}
            {!isFetching && <span className="ml-2">Auto-refreshes every 30s</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh now"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
          <div className="flex items-center gap-2">
            {['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <BulkQaActions
          selectedCount={selectedIds.size}
          onAction={handleBulkAction}
          isLoading={bulkActionMutation.isPending}
        />
      )}

      {/* Queue table */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === data?.items?.length && (data?.items?.length ?? 0) > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">Reference</th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">Client</th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">Category</th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">Priority</th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">Created</th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">Status</th>
              <th className="p-3 text-left text-sm font-medium text-gray-600 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading queue...
                </td>
              </tr>
            ) : data?.items?.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  No items in queue with status: {statusFilter}
                </td>
              </tr>
            ) : (
              data?.items?.map((riu) => (
                <tr
                  key={riu.id}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    selectedIds.has(riu.id) && 'bg-primary/5'
                  )}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(riu.id)}
                      onChange={() => toggleSelect(riu.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-primary">{riu.referenceNumber}</div>
                    {riu.summary && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {riu.summary}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span>{riu.organization?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-3">{riu.category?.name || '-'}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        getPriorityClasses(riu.priority)
                      )}
                    >
                      {getPriorityLabel(riu.priority)}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-500">
                    {format(new Date(riu.createdAt), 'MMM d, h:mm a')}
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        getStatusClasses(riu.qaStatus)
                      )}
                    >
                      {riu.qaStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      className="p-1 hover:bg-gray-100 rounded"
                      title="View details"
                    >
                      <ExternalLink className="h-4 w-4 text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
