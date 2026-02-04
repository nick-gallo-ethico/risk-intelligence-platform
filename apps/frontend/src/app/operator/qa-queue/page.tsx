'use client';

/**
 * QA Queue Page
 *
 * The main QA review queue interface for reviewers to process pending RIUs.
 *
 * Features:
 * - List view on left (40%) with filters and sorting
 * - Detail/review panel on right (60%)
 * - Edit mode for making changes before release
 * - Quick stats at top
 * - Responsive layout (mobile shows one view at a time)
 *
 * Requires QA_REVIEWER, TRIAGE_LEAD, or SYSTEM_ADMIN role.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QaQueueList } from '@/components/operator/qa-queue-list';
import { QaReviewPanel } from '@/components/operator/qa-review-panel';
import { QaEditForm } from '@/components/operator/qa-edit-form';
import { QaItemDetail, QaItemDetailSkeleton } from '@/components/operator/qa-item-detail';
import { useQaQueue } from '@/hooks/useQaQueue';
import { useQaItem } from '@/hooks/useQaItem';
import type { QaEditsDto } from '@/types/operator.types';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Inbox,
  ListTodo,
  Loader2,
} from 'lucide-react';

/**
 * Roles allowed to access QA queue.
 */
const QA_ROLES = ['TRIAGE_LEAD', 'QA_REVIEWER', 'SYSTEM_ADMIN'];

export default function QaQueuePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // State
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Queue data for stats
  const { items, total, isLoading: queueLoading } = useQaQueue({ limit: 100 });

  // Selected item data
  const {
    item: selectedItem,
    isLoading: itemLoading,
    release,
    isReleasing,
  } = useQaItem(selectedItemId);

  // Role check
  const hasQaRole = user && QA_ROLES.includes(user.role);

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?returnUrl=/operator/qa-queue');
    } else if (!authLoading && isAuthenticated && !hasQaRole) {
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, hasQaRole, router]);

  // Calculate stats
  const stats = useMemo(() => {
    const highSeverityCount = items.filter(
      (item) =>
        item.severityScore === 'HIGH' || item.severityScore === 'CRITICAL'
    ).length;

    const myClaims = items.filter(
      (item) =>
        item.qaStatus === 'IN_REVIEW' && item.qaReviewerId === user?.id
    ).length;

    // Released today would need a separate API call - show 0 for now
    const releasedToday = 0;

    return {
      total,
      highSeverityCount,
      myClaims,
      releasedToday,
    };
  }, [items, total, user?.id]);

  // Handle item selection
  const handleSelectItem = useCallback((riuId: string) => {
    setSelectedItemId(riuId);
    setIsEditing(false);
    setShowMobileDetail(true);
  }, []);

  // Handle review complete (release, reject, abandon)
  const handleComplete = useCallback(() => {
    setSelectedItemId(null);
    setIsEditing(false);
    setShowMobileDetail(false);
  }, []);

  // Handle panel close
  const handleClose = useCallback(() => {
    setSelectedItemId(null);
    setIsEditing(false);
    setShowMobileDetail(false);
  }, []);

  // Handle edit mode
  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(
    async (edits: QaEditsDto) => {
      await release(edits);
      handleComplete();
    },
    [release, handleComplete]
  );

  // Handle back to list (mobile)
  const handleBackToList = useCallback(() => {
    setShowMobileDetail(false);
  }, []);

  // Loading state
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authorized
  if (!hasQaRole) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header with Stats */}
      <header className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">QA Review Queue</h1>
            <p className="text-sm text-muted-foreground">
              Review and release hotline reports
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Stats Cards */}
            <div className="hidden md:flex items-center gap-3">
              <Card className="px-3 py-2 flex items-center gap-2">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{stats.total}</span>
                <span className="text-sm text-muted-foreground">in queue</span>
              </Card>

              {stats.highSeverityCount > 0 && (
                <Card className="px-3 py-2 flex items-center gap-2 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-700">
                    {stats.highSeverityCount}
                  </span>
                  <span className="text-sm text-orange-600">high severity</span>
                </Card>
              )}

              {stats.myClaims > 0 && (
                <Card className="px-3 py-2 flex items-center gap-2 border-blue-200 bg-blue-50">
                  <ListTodo className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-700">
                    {stats.myClaims}
                  </span>
                  <span className="text-sm text-blue-600">your claims</span>
                </Card>
              )}

              <Card className="px-3 py-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">{stats.releasedToday}</span>
                <span className="text-sm text-muted-foreground">
                  released today
                </span>
              </Card>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Queue List */}
        <div
          className={cn(
            'border-r flex flex-col',
            // Desktop: 40% width, always visible
            'w-full md:w-2/5',
            // Mobile: hide when detail is shown
            showMobileDetail && 'hidden md:flex'
          )}
        >
          <QaQueueList
            onSelectItem={handleSelectItem}
            selectedItemId={selectedItemId}
            currentUserId={user?.id}
          />
        </div>

        {/* Right: Detail Panel or Placeholder */}
        <div
          className={cn(
            'flex-1 flex flex-col overflow-hidden',
            // Mobile: hide when list is shown
            !showMobileDetail && 'hidden md:flex'
          )}
        >
          {/* Mobile Back Button */}
          <div className="md:hidden border-b p-2">
            <Button variant="ghost" size="sm" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queue
            </Button>
          </div>

          {selectedItemId ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Action Bar */}
              {selectedItem && !isEditing && (
                <div className="border-b px-6 py-3 flex items-center justify-between bg-muted/30">
                  <div>
                    <h2 className="font-semibold">{selectedItem.referenceNumber}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.client.name}
                    </p>
                  </div>
                  {selectedItem.qaStatus === 'IN_REVIEW' &&
                    selectedItem.qaReviewer?.id === user?.id && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => release()}
                          disabled={isReleasing}
                        >
                          {isReleasing ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Release
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleStartEdit}
                        >
                          Edit & Release
                        </Button>
                      </div>
                    )}
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {itemLoading ? (
                  <QaItemDetailSkeleton />
                ) : selectedItem && isEditing ? (
                  <QaEditForm
                    item={selectedItem}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    isSaving={isReleasing}
                  />
                ) : selectedItem ? (
                  <QaItemDetail item={selectedItem} />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Item not found
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Placeholder when no item selected
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Inbox className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-1">Select an item to review</h3>
                <p className="text-sm">
                  Click on a queue item to view details and take action
                </p>
                <div className="mt-4 space-y-1 text-xs">
                  <p>
                    <kbd className="px-2 py-1 bg-muted rounded">Click</kbd> Select item
                  </p>
                  <p>
                    <kbd className="px-2 py-1 bg-muted rounded">Claim</kbd> Reserve for review
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Panel (alternative to inline) - uncomment to use sheet instead */}
      {/* <QaReviewPanel
        riuId={selectedItemId || ''}
        onComplete={handleComplete}
        onClose={handleClose}
        onEdit={handleStartEdit}
        open={!!selectedItemId}
        currentUserId={user?.id}
      /> */}
    </div>
  );
}
