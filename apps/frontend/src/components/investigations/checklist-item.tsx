'use client';

import { useState } from 'react';
import {
  Check,
  Circle,
  Minus,
  ChevronDown,
  ChevronRight,
  Paperclip,
  MessageSquare,
  Lock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type {
  ChecklistItemState,
  TemplateItem,
  CustomItem,
} from '@/lib/checklist-api';

interface ChecklistItemProps {
  /** The template item or custom item data */
  item: TemplateItem | CustomItem;
  /** Whether this is a custom item (added by investigator) */
  isCustom?: boolean;
  /** Current state of the item */
  state: ChecklistItemState | undefined;
  /** Whether item is locked due to incomplete dependencies */
  isLocked?: boolean;
  /** IDs of locked dependencies */
  lockedByDependencies?: string[];
  /** Callback when item is completed */
  onComplete: (itemId: string, notes?: string, attachmentIds?: string[]) => void;
  /** Callback when item is skipped */
  onSkip: (itemId: string, reason: string) => void;
  /** Callback when item is uncompleted */
  onUncomplete: (itemId: string) => void;
  /** Whether actions are disabled (loading state) */
  disabled?: boolean;
}

/**
 * Individual checklist item with completion, skip, and uncomplete actions.
 * Shows item text, badges, completion state, and expandable guidance.
 */
export function ChecklistItem({
  item,
  isCustom = false,
  state,
  isLocked = false,
  lockedByDependencies = [],
  onComplete,
  onSkip,
  onUncomplete,
  disabled = false,
}: ChecklistItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [skipReason, setSkipReason] = useState('');

  const status = state?.status || 'pending';
  const isCompleted = status === 'completed';
  const isSkipped = status === 'skipped';
  const isPending = status === 'pending';

  // Check if item has guidance (only template items)
  const hasGuidance = 'guidance' in item && item.guidance;

  // Required badge should show for required items
  const isRequired = item.required;
  const needsEvidence = item.evidenceRequired;

  // Handle completion dialog open
  const handleCompleteClick = () => {
    if (needsEvidence || true) {
      // Always show dialog for notes
      setShowCompleteDialog(true);
    } else {
      onComplete(item.id);
    }
  };

  // Handle completion submit
  const handleCompleteSubmit = () => {
    onComplete(item.id, completionNotes || undefined);
    setShowCompleteDialog(false);
    setCompletionNotes('');
  };

  // Handle skip submit
  const handleSkipSubmit = () => {
    if (skipReason.trim()) {
      onSkip(item.id, skipReason.trim());
      setShowSkipDialog(false);
      setSkipReason('');
    }
  };

  // Handle uncomplete
  const handleUncomplete = () => {
    onUncomplete(item.id);
  };

  return (
    <>
      <div
        className={cn(
          'group flex items-start gap-3 py-3 px-2 rounded-md transition-colors',
          isPending && !isLocked && 'hover:bg-gray-50',
          isCompleted && 'bg-green-50/50',
          isSkipped && 'bg-gray-50/50',
          isLocked && 'opacity-60'
        )}
      >
        {/* Status indicator / checkbox */}
        <div className="flex-shrink-0 mt-0.5">
          {isCompleted ? (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
          ) : isSkipped ? (
            <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center">
              <Minus className="h-3 w-3 text-white" />
            </div>
          ) : isLocked ? (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
              <Lock className="h-3 w-3 text-gray-400" />
            </div>
          ) : (
            <button
              onClick={handleCompleteClick}
              disabled={disabled}
              className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-primary hover:bg-primary/10 transition-colors flex items-center justify-center disabled:cursor-not-allowed"
            >
              <Circle className="h-3 w-3 text-transparent" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Item text and badges */}
          <div className="flex items-start gap-2">
            <span
              className={cn(
                'text-sm',
                isCompleted && 'text-gray-600',
                isSkipped && 'text-gray-500 line-through'
              )}
            >
              {item.text}
            </span>
            {isRequired && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-red-50 text-red-700 border-red-200">
                Required
              </Badge>
            )}
            {needsEvidence && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200">
                <Paperclip className="h-3 w-3 mr-0.5" />
                Evidence
              </Badge>
            )}
            {isCustom && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-purple-50 text-purple-700 border-purple-200">
                Custom
              </Badge>
            )}
          </div>

          {/* Locked message */}
          {isLocked && lockedByDependencies.length > 0 && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Complete prerequisite items first
            </p>
          )}

          {/* Completion info */}
          {isCompleted && state && (
            <div className="mt-1.5 text-xs text-gray-500">
              <span>Completed by {state.completedByName}</span>
              {state.completedAt && (
                <span> on {new Date(state.completedAt).toLocaleDateString()}</span>
              )}
              {state.completionNotes && (
                <p className="mt-1 text-gray-600 italic">&ldquo;{state.completionNotes}&rdquo;</p>
              )}
              {state.attachmentIds && state.attachmentIds.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Paperclip className="h-3 w-3" />
                  <span>{state.attachmentIds.length} attachment(s)</span>
                </div>
              )}
            </div>
          )}

          {/* Skipped info */}
          {isSkipped && (
            <p className="text-xs text-gray-500 mt-1">
              Skipped - reason will be shown in progress record
            </p>
          )}

          {/* Guidance toggle */}
          {hasGuidance && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {expanded ? 'Hide guidance' : 'Show guidance'}
            </button>
          )}

          {/* Expanded guidance */}
          {expanded && hasGuidance && (
            <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-100">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">{item.guidance}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isPending && !isLocked && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCompleteClick}
                disabled={disabled}
                className="h-7 px-2 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Complete
              </Button>
              {!isRequired && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSkipDialog(true)}
                  disabled={disabled}
                  className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  <Minus className="h-3 w-3 mr-1" />
                  Skip
                </Button>
              )}
            </>
          )}
          {(isCompleted || isSkipped) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUncomplete}
              disabled={disabled}
              className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Undo
            </Button>
          )}
        </div>
      </div>

      {/* Complete dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Item</DialogTitle>
            <DialogDescription>
              {needsEvidence
                ? 'This item requires evidence. Add notes and any supporting documentation.'
                : 'Add optional notes for this item.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">{item.text}</p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">
                Notes {needsEvidence && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add completion notes..."
                rows={3}
              />
            </div>

            {/* TODO: Add attachment upload component */}
            {needsEvidence && (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachment upload coming soon
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteSubmit}
              disabled={needsEvidence && !completionNotes.trim()}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Item</DialogTitle>
            <DialogDescription>
              Provide a reason for skipping this item. This will be recorded in the investigation progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">{item.text}</p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">
                Reason for skipping <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="Explain why this item is not applicable..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSkipDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSkipSubmit}
              disabled={!skipReason.trim()}
              variant="secondary"
            >
              <Minus className="h-4 w-4 mr-1" />
              Skip Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
