'use client';

/**
 * QaReviewPanel - Panel for Reviewing QA Items
 *
 * Slide-over/modal panel for QA review:
 * - Loads full item detail
 * - Action bar: Release, Reject, Edit, Abandon
 * - Keyboard shortcuts (R, E, Esc)
 * - Confirmation dialogs for release and reject
 *
 * @see QaItemDetail for detail view
 * @see QaEditForm for edit mode
 */

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { QaItemDetail, QaItemDetailSkeleton } from './qa-item-detail';
import { useQaItem } from '@/hooks/useQaItem';
import type { QaEditsDto } from '@/types/operator.types';
import {
  Check,
  Edit,
  Loader2,
  LogOut,
  X,
} from 'lucide-react';

export interface QaReviewPanelProps {
  /** RIU ID to review */
  riuId: string;
  /** Called when review is complete (released, rejected, or abandoned) */
  onComplete: () => void;
  /** Called when panel should close */
  onClose: () => void;
  /** Called when entering edit mode */
  onEdit?: (riuId: string) => void;
  /** Whether panel is open */
  open: boolean;
  /** Current user ID */
  currentUserId?: string;
}

export function QaReviewPanel({
  riuId,
  onComplete,
  onClose,
  onEdit,
  open,
  currentUserId,
}: QaReviewPanelProps) {
  // State
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch item detail and actions
  const {
    item,
    isLoading,
    error,
    isReleasing,
    isRejecting,
    isAbandoning,
    release,
    reject,
    abandon,
  } = useQaItem(riuId);

  // Check if current user is the claimer
  const isClaimedBySelf =
    item?.qaStatus === 'IN_REVIEW' &&
    item.qaReviewer?.id === currentUserId;

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // R - Release
      if (e.key === 'r' || e.key === 'R') {
        if (isClaimedBySelf && !isReleasing && !isRejecting) {
          setShowReleaseDialog(true);
        }
      }

      // E - Edit
      if (e.key === 'e' || e.key === 'E') {
        if (isClaimedBySelf && onEdit) {
          onEdit(riuId);
        }
      }

      // Escape - Close
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    open,
    isClaimedBySelf,
    isReleasing,
    isRejecting,
    onEdit,
    onClose,
    riuId,
  ]);

  // Handle release confirmation
  const handleRelease = useCallback(async () => {
    try {
      await release();
      setShowReleaseDialog(false);
      onComplete();
    } catch (err) {
      // Error handling is done in mutation
      console.error('Release failed:', err);
    }
  }, [release, onComplete]);

  // Handle reject confirmation
  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) return;

    try {
      await reject(rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
      onComplete();
    } catch (err) {
      console.error('Reject failed:', err);
    }
  }, [reject, rejectReason, onComplete]);

  // Handle abandon
  const handleAbandon = useCallback(async () => {
    try {
      await abandon();
      onComplete();
    } catch (err) {
      console.error('Abandon failed:', err);
    }
  }, [abandon, onComplete]);

  // Handle edit
  const handleEdit = useCallback(() => {
    onEdit?.(riuId);
  }, [onEdit, riuId]);

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl p-0 flex flex-col">
          {/* Header with actions */}
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg">QA Review</SheetTitle>
                <SheetDescription>
                  {item?.referenceNumber || 'Loading...'}
                </SheetDescription>
              </div>
              {item && (
                <div className="flex items-center gap-2">
                  {isClaimedBySelf ? (
                    <>
                      {/* Release button */}
                      <Button
                        size="sm"
                        onClick={() => setShowReleaseDialog(true)}
                        disabled={isReleasing || isRejecting || isAbandoning}
                        className="gap-1"
                      >
                        {isReleasing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Release
                      </Button>

                      {/* Reject button */}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowRejectDialog(true)}
                        disabled={isReleasing || isRejecting || isAbandoning}
                        className="gap-1"
                      >
                        {isRejecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Reject
                      </Button>

                      {/* Edit button */}
                      {onEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleEdit}
                          disabled={isReleasing || isRejecting || isAbandoning}
                          className="gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      )}

                      {/* Abandon button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleAbandon}
                        disabled={isReleasing || isRejecting || isAbandoning}
                        className="gap-1 text-muted-foreground"
                      >
                        {isAbandoning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        Abandon
                      </Button>
                    </>
                  ) : item.qaStatus === 'IN_REVIEW' ? (
                    <span className="text-sm text-muted-foreground italic">
                      Being reviewed by {item.qaReviewer?.name || 'another reviewer'}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Status: {item.qaStatus}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Keyboard shortcuts hint */}
            {isClaimedBySelf && (
              <div className="text-xs text-muted-foreground mt-2">
                Shortcuts: <kbd className="px-1 bg-muted rounded">R</kbd> Release,{' '}
                <kbd className="px-1 bg-muted rounded">E</kbd> Edit,{' '}
                <kbd className="px-1 bg-muted rounded">Esc</kbd> Close
              </div>
            )}
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <QaItemDetailSkeleton />
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <p>Failed to load item</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error.message}
                </p>
              </div>
            ) : item ? (
              <QaItemDetail item={item} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Release Confirmation Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release for Case Creation?</DialogTitle>
            <DialogDescription>
              This will approve the RIU and trigger automatic Case creation.
              The item will be removed from the QA queue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReleaseDialog(false)}
              disabled={isReleasing}
            >
              Cancel
            </Button>
            <Button onClick={handleRelease} disabled={isReleasing}>
              {isReleasing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Releasing...
                </>
              ) : (
                'Confirm Release'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject to Operator</DialogTitle>
            <DialogDescription>
              This will send the RIU back to the operator for revision.
              Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain what needs to be corrected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Confirm Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
