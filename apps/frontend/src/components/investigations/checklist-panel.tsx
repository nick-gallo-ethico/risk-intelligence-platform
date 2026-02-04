'use client';

import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  Trash2,
  FileText,
  CheckCircle2,
  Circle,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChecklistItem } from './checklist-item';
import type {
  ChecklistProgress,
  TemplateSection,
  TemplateItem,
  CustomItem,
  ChecklistItemState,
  SectionState,
  SkippedItem,
} from '@/lib/checklist-api';

interface ChecklistPanelProps {
  /** Checklist progress data */
  progress: ChecklistProgress;
  /** Callback when an item is completed */
  onCompleteItem: (itemId: string, notes?: string, attachmentIds?: string[]) => Promise<void>;
  /** Callback when an item is skipped */
  onSkipItem: (itemId: string, reason: string) => Promise<void>;
  /** Callback when an item is uncompleted */
  onUncompleteItem: (itemId: string) => Promise<void>;
  /** Callback when a custom item is added */
  onAddCustomItem: (sectionId: string, text: string) => Promise<void>;
  /** Callback when template is changed/swapped */
  onSwapTemplate?: () => void;
  /** Callback when checklist is removed */
  onRemoveChecklist?: () => void;
  /** Whether the panel is in a loading state */
  loading?: boolean;
}

/**
 * Section component for grouping checklist items with progress indicator.
 */
function ChecklistSection({
  section,
  sectionState,
  itemStates,
  customItems,
  skippedItems,
  onCompleteItem,
  onSkipItem,
  onUncompleteItem,
  onAddCustomItem,
  loading,
}: {
  section: TemplateSection;
  sectionState: SectionState | undefined;
  itemStates: Record<string, ChecklistItemState>;
  customItems: CustomItem[];
  skippedItems: SkippedItem[];
  onCompleteItem: (itemId: string, notes?: string, attachmentIds?: string[]) => Promise<void>;
  onSkipItem: (itemId: string, reason: string) => Promise<void>;
  onUncompleteItem: (itemId: string) => Promise<void>;
  onAddCustomItem: (sectionId: string, text: string) => Promise<void>;
  loading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Get custom items for this section
  const sectionCustomItems = customItems.filter(
    (item) => item.sectionId === section.id
  );

  // Calculate section progress
  const totalItems = section.items.length + sectionCustomItems.length;
  const completedItems = sectionState?.completedItems || 0;
  const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Build dependency map for this section
  const dependencyMap = useMemo(() => {
    const map = new Map<string, string[]>();
    section.items.forEach((item) => {
      if (item.dependencies && item.dependencies.length > 0) {
        map.set(item.id, item.dependencies);
      }
    });
    return map;
  }, [section.items]);

  // Check if an item is locked by dependencies
  const isItemLocked = (itemId: string): boolean => {
    const dependencies = dependencyMap.get(itemId);
    if (!dependencies || dependencies.length === 0) return false;

    return dependencies.some((depId) => {
      const depState = itemStates[depId];
      return !depState || depState.status !== 'completed';
    });
  };

  // Get locked dependencies for an item
  const getLockedDependencies = (itemId: string): string[] => {
    const dependencies = dependencyMap.get(itemId);
    if (!dependencies) return [];

    return dependencies.filter((depId) => {
      const depState = itemStates[depId];
      return !depState || depState.status !== 'completed';
    });
  };

  // Handle add custom item
  const handleAddCustomItem = async () => {
    if (!newItemText.trim()) return;

    setIsAddingItem(true);
    try {
      await onAddCustomItem(section.id, newItemText.trim());
      setNewItemText('');
      setShowAddItem(false);
    } finally {
      setIsAddingItem(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-white">
        {/* Section header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
              <div className="text-left">
                <h3 className="font-medium text-gray-900">{section.name}</h3>
                <p className="text-sm text-gray-500">
                  {completedItems} of {totalItems} items complete
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24">
                <Progress value={progressPercent} />
              </div>
              {progressPercent === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Section content */}
        <CollapsibleContent>
          <div className="border-t">
            {/* Template items */}
            <div className="divide-y">
              {section.items.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  state={itemStates[item.id]}
                  isLocked={isItemLocked(item.id)}
                  lockedByDependencies={getLockedDependencies(item.id)}
                  onComplete={onCompleteItem}
                  onSkip={onSkipItem}
                  onUncomplete={onUncompleteItem}
                  disabled={loading}
                />
              ))}

              {/* Custom items */}
              {sectionCustomItems.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  isCustom
                  state={itemStates[item.id]}
                  onComplete={onCompleteItem}
                  onSkip={onSkipItem}
                  onUncomplete={onUncompleteItem}
                  disabled={loading}
                />
              ))}
            </div>

            {/* Add custom item */}
            <div className="p-3 border-t bg-gray-50">
              {showAddItem ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Enter item text..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddCustomItem();
                      }
                      if (e.key === 'Escape') {
                        setShowAddItem(false);
                        setNewItemText('');
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleAddCustomItem}
                    disabled={!newItemText.trim() || isAddingItem}
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddItem(false);
                      setNewItemText('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddItem(true)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add custom item
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * Main checklist panel component showing template with sections and progress.
 */
export function ChecklistPanel({
  progress,
  onCompleteItem,
  onSkipItem,
  onUncompleteItem,
  onAddCustomItem,
  onSwapTemplate,
  onRemoveChecklist,
  loading = false,
}: ChecklistPanelProps) {
  const [showSkippedItems, setShowSkippedItems] = useState(false);

  // Overall progress
  const progressPercent = progress.progressPercent;
  const isComplete = progressPercent === 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">
              {progress.template.name}
            </h2>
            <Badge variant="outline" className="text-xs">
              v{progress.templateVersion}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {progress.completedItems} of {progress.totalItems} items complete
            {progress.skippedCount > 0 && ` (${progress.skippedCount} skipped)`}
            {progress.customCount > 0 && ` (${progress.customCount} custom)`}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onSwapTemplate && (
              <DropdownMenuItem onClick={onSwapTemplate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Change template
              </DropdownMenuItem>
            )}
            {onRemoveChecklist && (
              <DropdownMenuItem
                onClick={onRemoveChecklist}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove checklist
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Overall progress</span>
          <span
            className={cn(
              'font-medium',
              isComplete ? 'text-green-600' : 'text-gray-900'
            )}
          >
            {Math.round(progressPercent)}%
          </span>
        </div>
        <Progress
          value={progressPercent}
          className={cn('h-2', isComplete && '[&>div]:bg-green-500')}
        />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {progress.template.sections.map((section) => (
          <ChecklistSection
            key={section.id}
            section={section}
            sectionState={progress.sectionStates[section.id]}
            itemStates={progress.itemStates}
            customItems={progress.customItems}
            skippedItems={progress.skippedItems}
            onCompleteItem={onCompleteItem}
            onSkipItem={onSkipItem}
            onUncompleteItem={onUncompleteItem}
            onAddCustomItem={onAddCustomItem}
            loading={loading}
          />
        ))}
      </div>

      {/* Skipped items summary */}
      {progress.skippedItems.length > 0 && (
        <div className="border rounded-lg bg-gray-50 p-4">
          <button
            onClick={() => setShowSkippedItems(!showSkippedItems)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {showSkippedItems ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>
              {progress.skippedItems.length} skipped item
              {progress.skippedItems.length !== 1 ? 's' : ''}
            </span>
          </button>

          {showSkippedItems && (
            <div className="mt-3 space-y-2">
              {progress.skippedItems.map((skipped) => {
                // Find the item text
                let itemText = 'Unknown item';
                for (const section of progress.template.sections) {
                  const item = section.items.find((i) => i.id === skipped.itemId);
                  if (item) {
                    itemText = item.text;
                    break;
                  }
                }

                return (
                  <div
                    key={skipped.itemId}
                    className="p-2 bg-white rounded border text-sm"
                  >
                    <p className="font-medium text-gray-600 line-through">
                      {itemText}
                    </p>
                    <p className="text-gray-500 mt-1">
                      <span className="font-medium">Reason:</span> {skipped.reason}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Skipped by {skipped.skippedByName} on{' '}
                      {new Date(skipped.skippedAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Completion timestamp */}
      {progress.completedAt && (
        <p className="text-sm text-green-600 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Checklist completed on{' '}
          {new Date(progress.completedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
