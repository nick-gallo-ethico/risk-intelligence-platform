'use client';

/**
 * AiNoteCleanup - AI-powered Note Cleanup Component
 *
 * Transforms bullet points and rough notes into formal narrative prose.
 *
 * Features:
 * - Two cleanup styles: light (preserves voice) vs full (formal rewrite)
 * - Comparison view showing before/after
 * - Apply, keep original, or edit actions
 * - Rate limiting handling
 *
 * @see useAiNoteCleanup for AI API integration
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Pencil,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiNoteCleanup, type CleanupStyle } from '@/hooks/useAiNoteCleanup';

export interface AiNoteCleanupProps {
  /** Original content to clean up */
  originalContent: string;
  /** Called when cleaned content is applied */
  onApply: (cleanedContent: string) => void;
}

/**
 * AI note cleanup component with comparison view.
 *
 * @param props - Component props
 * @returns AiNoteCleanup component
 */
export function AiNoteCleanup({
  originalContent,
  onApply,
}: AiNoteCleanupProps) {
  const [style, setStyle] = useState<CleanupStyle>('light');
  const [showComparison, setShowComparison] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const { cleanup, cleanedContent, isProcessing, error, rateLimitRetryAfter } =
    useAiNoteCleanup();

  /**
   * Handle cleanup button click.
   */
  const handleCleanup = useCallback(async () => {
    try {
      await cleanup(originalContent, style);
      setShowComparison(true);
      setEditMode(false);
    } catch {
      // Error is handled by hook state
    }
  }, [cleanup, originalContent, style]);

  /**
   * Handle apply button click.
   */
  const handleApply = useCallback(() => {
    const content = editMode ? editedContent : cleanedContent;
    if (content) {
      onApply(content);
      setShowComparison(false);
      setEditedContent('');
    }
  }, [onApply, cleanedContent, editMode, editedContent]);

  /**
   * Handle keep original button click.
   */
  const handleKeepOriginal = useCallback(() => {
    setShowComparison(false);
    setEditMode(false);
    setEditedContent('');
  }, []);

  /**
   * Handle edit button click.
   */
  const handleEdit = useCallback(() => {
    setEditMode(true);
    setEditedContent(cleanedContent || '');
  }, [cleanedContent]);

  /**
   * Handle retry button click.
   */
  const handleRetry = useCallback(() => {
    handleCleanup();
  }, [handleCleanup]);

  // Rate limit display
  if (rateLimitRetryAfter && rateLimitRetryAfter > 0) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            AI cleanup rate limit reached. Please wait{' '}
            {Math.ceil(rateLimitRetryAfter / 1000)} seconds before trying again.
          </span>
        </div>
      </div>
    );
  }

  // Error display
  if (error && !showComparison) {
    return (
      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              AI cleanup failed: {error.message}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Comparison view
  if (showComparison && cleanedContent) {
    return (
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Cleanup Preview</span>
            <Badge variant="secondary" className="text-xs">
              {style === 'light' ? 'Light' : 'Full'} style
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              disabled={editMode}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Redo
            </Button>
          </div>
        </div>

        {/* Side-by-side comparison or edit mode */}
        <div className={cn('grid gap-4', editMode ? 'grid-cols-1' : 'grid-cols-2')}>
          {!editMode && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Original</p>
              <div className="p-3 bg-background rounded border text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
                {originalContent}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {editMode ? 'Edit Cleaned Version' : 'Cleaned'}
            </p>
            {editMode ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[150px]"
              />
            ) : (
              <div className="p-3 bg-primary/5 rounded border border-primary/20 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
                {cleanedContent}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleKeepOriginal}>
            <X className="h-3 w-3 mr-1" />
            Keep Original
          </Button>
          <Button size="sm" onClick={handleApply}>
            <Check className="h-3 w-3 mr-1" />
            Apply Changes
          </Button>
        </div>
      </div>
    );
  }

  // Default state: cleanup button
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <Select
          value={style}
          onValueChange={(value: CleanupStyle) => setStyle(value)}
          disabled={isProcessing}
        >
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <span className="text-sm">Light</span>
            </SelectItem>
            <SelectItem value="full">
              <span className="text-sm">Full</span>
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {style === 'light' ? 'Preserves voice' : 'Formal rewrite'}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCleanup}
        disabled={isProcessing || originalContent.length < 20}
        className="ml-auto"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Clean Up Notes
      </Button>
    </div>
  );
}
