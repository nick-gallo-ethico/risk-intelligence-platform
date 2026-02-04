'use client';

/**
 * SavedViewSelector Component
 *
 * A reusable dropdown component for selecting and managing saved views.
 *
 * Features:
 * - Displays pinned views at top with star icon
 * - Shows shared badge for team-shared views
 * - Save current filters as new view with dialog
 * - Delete views (with confirmation)
 * - Apply saved view on selection
 */
import React, { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Plus,
  Star,
  Trash2,
  Users,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SavedView } from '@/services/savedViews.service';

export interface SavedViewSelectorProps {
  /** All available views */
  views: SavedView[];
  /** Currently active/selected view */
  activeView: SavedView | null;
  /** Called when user selects a view */
  onApplyView: (viewId: string) => void;
  /** Called when user saves current filters as new view */
  onSaveView: (name: string, isShared: boolean, isPinned: boolean) => Promise<void>;
  /** Called when user deletes a view */
  onDeleteView: (viewId: string) => void;
  /** Called when user clears the active view */
  onClearView?: () => void;
  /** Whether there are active filters that can be saved */
  hasActiveFilters: boolean;
  /** Whether views are loading */
  loading?: boolean;
  /** Optional className for the trigger button */
  className?: string;
}

export function SavedViewSelector({
  views,
  activeView,
  onApplyView,
  onSaveView,
  onDeleteView,
  onClearView,
  hasActiveFilters,
  loading = false,
  className,
}: SavedViewSelectorProps) {
  const [open, setOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  // Separate pinned and non-pinned views
  const pinnedViews = views.filter((v) => v.isPinned);
  const otherViews = views.filter((v) => !v.isPinned);

  const handleSave = async () => {
    if (!newViewName.trim()) return;

    setSaving(true);
    try {
      await onSaveView(newViewName.trim(), isShared, isPinned);
      setSaveDialogOpen(false);
      setNewViewName('');
      setIsShared(false);
      setIsPinned(false);
    } catch (error) {
      console.error('Failed to save view:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectView = (viewId: string) => {
    onApplyView(viewId);
    setOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    onDeleteView(viewId);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-2', className)}
            disabled={loading}
          >
            {activeView ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            <span className="max-w-[150px] truncate">
              {activeView ? activeView.name : 'Saved Views'}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <div className="p-2">
            {/* Save current filters option */}
            {hasActiveFilters && (
              <>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                  onClick={() => {
                    setSaveDialogOpen(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Save current filters...</span>
                </button>
                <div className="my-2 h-px bg-border" />
              </>
            )}

            {/* Clear active view option */}
            {activeView && onClearView && (
              <>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent"
                  onClick={() => {
                    onClearView();
                    setOpen(false);
                  }}
                >
                  Clear view selection
                </button>
                <div className="my-2 h-px bg-border" />
              </>
            )}

            {/* Pinned views section */}
            {pinnedViews.length > 0 && (
              <>
                {pinnedViews.map((view) => (
                  <ViewItem
                    key={view.id}
                    view={view}
                    isActive={activeView?.id === view.id}
                    showStar
                    onSelect={() => handleSelectView(view.id)}
                    onDelete={(e) => handleDelete(e, view.id)}
                  />
                ))}
                {otherViews.length > 0 && <div className="my-2 h-px bg-border" />}
              </>
            )}

            {/* Other views section */}
            {otherViews.map((view) => (
              <ViewItem
                key={view.id}
                view={view}
                isActive={activeView?.id === view.id}
                onSelect={() => handleSelectView(view.id)}
                onDelete={(e) => handleDelete(e, view.id)}
              />
            ))}

            {/* Empty state */}
            {views.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No saved views yet
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>
              Save your current filters as a reusable view.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="e.g., My Open Cases"
                autoFocus
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shared"
                checked={isShared}
                onCheckedChange={(checked) => setIsShared(checked === true)}
              />
              <Label htmlFor="shared" className="font-normal cursor-pointer">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Share with team
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pinned"
                checked={isPinned}
                onCheckedChange={(checked) => setIsPinned(checked === true)}
              />
              <Label htmlFor="pinned" className="font-normal cursor-pointer">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  Pin to top
                </div>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!newViewName.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save View'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ViewItemProps {
  view: SavedView;
  isActive: boolean;
  showStar?: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function ViewItem({
  view,
  isActive,
  showStar,
  onSelect,
  onDelete,
}: ViewItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent',
        isActive && 'bg-accent'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0">
        {showStar && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
        <span className="truncate">{view.name}</span>
        {view.isShared && (
          <Badge variant="outline" className="ml-1 h-5 text-xs flex-shrink-0">
            Shared
          </Badge>
        )}
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity"
        onClick={onDelete}
        title="Delete view"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
