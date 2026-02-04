'use client';

/**
 * CallerHistoryPanel - History Tab Content
 *
 * Displays previous RIUs from the same phone number:
 * - List with date, category, status, brief summary
 * - Click to view details in modal
 * - Helps operators identify repeat callers
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  History,
  Calendar,
  Tag,
  FileText,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import type { ClientProfile, CallerHistoryItem } from '@/types/operator.types';

export interface CallerHistoryPanelProps {
  /** Currently loaded client profile */
  clientProfile: ClientProfile | null;
  /** Current caller's phone number (for history lookup) */
  callerPhoneNumber?: string;
}

export function CallerHistoryPanel({
  clientProfile,
  callerPhoneNumber,
}: CallerHistoryPanelProps) {
  const [selectedItem, setSelectedItem] = useState<CallerHistoryItem | null>(
    null
  );

  // Fetch caller history
  const {
    data: history,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['operator', 'caller-history', clientProfile?.id, callerPhoneNumber],
    queryFn: async () => {
      if (!clientProfile?.id || !callerPhoneNumber) return [];
      return apiClient.get<CallerHistoryItem[]>(
        `/operator/clients/${clientProfile.id}/caller-history`,
        { params: { phoneNumber: callerPhoneNumber } }
      );
    },
    enabled: !!clientProfile?.id && !!callerPhoneNumber,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  if (!clientProfile) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Look up a client to view history</p>
        </div>
      </div>
    );
  }

  if (!callerPhoneNumber) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Caller history will appear here</p>
          <p className="text-xs mt-1">once a call is connected</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive">Failed to load history</p>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No previous reports from this caller</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">Previous Reports</span>
        <Badge variant="secondary">{history.length}</Badge>
      </div>

      {history.map((item) => (
        <HistoryCard
          key={item.id}
          item={item}
          onClick={() => setSelectedItem(item)}
        />
      ))}

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem?.referenceNumber}</DialogTitle>
            <DialogDescription>
              Previous report details
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Date</span>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedItem.createdAt), 'PPP')}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <p className="text-sm">
                    <StatusBadge status={selectedItem.status} />
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Category</span>
                  <p className="text-sm font-medium">
                    {selectedItem.category || 'Uncategorized'}
                  </p>
                </div>
              </div>
              {selectedItem.summary && (
                <div>
                  <span className="text-xs text-muted-foreground">Summary</span>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                    {selectedItem.summary}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * History item card.
 */
function HistoryCard({
  item,
  onClick,
}: {
  item: CallerHistoryItem;
  onClick: () => void;
}) {
  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-muted cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">
              {item.referenceNumber}
            </span>
            <StatusBadge status={item.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
            </div>
            {item.category && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span className="truncate">{item.category}</span>
              </div>
            )}
          </div>
          {item.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {item.summary}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}

/**
 * Status badge component.
 */
function StatusBadge({ status }: { status: string }) {
  const variant = getStatusVariant(status);
  return (
    <Badge variant={variant} className="text-xs">
      {formatStatus(status)}
    </Badge>
  );
}

function getStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status.toUpperCase()) {
    case 'OPEN':
    case 'IN_PROGRESS':
      return 'default';
    case 'CLOSED':
    case 'RELEASED':
      return 'secondary';
    case 'REJECTED':
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
