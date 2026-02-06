'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, ArrowUp, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkQaActionsProps {
  selectedCount: number;
  onAction: (
    action: string,
    data?: { reason?: string; assignToUserId?: string; priority?: number }
  ) => void;
  isLoading: boolean;
}

export function BulkQaActions({ selectedCount, onAction, isLoading }: BulkQaActionsProps) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (rejectReason.trim()) {
      onAction('REJECT', { reason: rejectReason });
      setShowRejectReason(false);
      setRejectReason('');
    }
  };

  const handleCancelReject = () => {
    setShowRejectReason(false);
    setRejectReason('');
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-primary font-medium">
          {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
        </span>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>

      <div className="flex items-center gap-2">
        {/* Approve All Button */}
        <button
          onClick={() => onAction('APPROVE')}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded font-medium text-sm transition-colors',
            'bg-green-600 text-white hover:bg-green-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <CheckCircle className="h-4 w-4" />
          Approve All
        </button>

        {/* Reject All Button / Reason Input */}
        {showRejectReason ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Rejection reason (required)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="px-3 py-1.5 border rounded text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleReject();
                if (e.key === 'Escape') handleCancelReject();
              }}
            />
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim() || isLoading}
              className={cn(
                'px-3 py-1.5 rounded font-medium text-sm',
                'bg-red-600 text-white hover:bg-red-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Confirm Reject
            </button>
            <button
              onClick={handleCancelReject}
              className="p-1.5 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRejectReason(true)}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded font-medium text-sm transition-colors',
              'bg-red-600 text-white hover:bg-red-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <XCircle className="h-4 w-4" />
            Reject All
          </button>
        )}

        {/* Escalate Button */}
        <button
          onClick={() => onAction('CHANGE_PRIORITY', { priority: 3 })}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded font-medium text-sm transition-colors',
            'bg-yellow-500 text-white hover:bg-yellow-600',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <ArrowUp className="h-4 w-4" />
          Escalate
        </button>
      </div>
    </div>
  );
}
