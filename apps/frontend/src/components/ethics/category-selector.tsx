'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Users,
  DollarSign,
  Shield,
  FileText,
  Briefcase,
  Scale,
  HeartPulse,
  Building,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Category } from '@/hooks/useTenantCategories';

/**
 * Icon mapping for category icons.
 */
const ICON_MAP: Record<string, React.ElementType> = {
  'alert-triangle': AlertTriangle,
  users: Users,
  'dollar-sign': DollarSign,
  shield: Shield,
  'file-text': FileText,
  briefcase: Briefcase,
  scale: Scale,
  'heart-pulse': HeartPulse,
  building: Building,
  lock: Lock,
  'help-circle': HelpCircle,
};

interface CategorySelectorProps {
  /** Categories to display */
  categories: Category[];
  /** Currently selected category ID */
  selectedId?: string | null;
  /** Callback when a category is selected */
  onSelect: (category: Category) => void;
  /** Disable interaction */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Recursive category item component.
 */
function CategoryItem({
  category,
  selectedId,
  onSelect,
  disabled,
  depth = 0,
  expandedIds,
  onToggleExpand,
}: {
  category: Category;
  selectedId?: string | null;
  onSelect: (category: Category) => void;
  disabled?: boolean;
  depth?: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const isSelected = selectedId === category.id;
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);

  const IconComponent = category.icon ? ICON_MAP[category.icon] : HelpCircle;

  const handleClick = () => {
    if (disabled) return;

    if (hasChildren) {
      onToggleExpand(category.id);
    } else {
      onSelect(category);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
      e.preventDefault();
      onToggleExpand(category.id);
    } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
      e.preventDefault();
      onToggleExpand(category.id);
    }
  };

  return (
    <div className="w-full">
      <div
        role={hasChildren ? 'treeitem' : 'option'}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer',
          'min-h-[56px]', // 44px min touch target + padding
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isSelected
            ? 'bg-primary/10 border-2 border-primary text-primary'
            : 'bg-card border border-border hover:bg-accent hover:border-accent-foreground/20',
          disabled && 'opacity-50 cursor-not-allowed',
          depth > 0 && 'ml-6'
        )}
        style={{ paddingLeft: depth > 0 ? `${depth * 24 + 16}px` : undefined }}
      >
        {/* Expand/collapse indicator for categories with children */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(category.id);
            }}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Category icon */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Category content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{category.name}</span>
            {category.isMostCommon && (
              <Badge variant="secondary" className="text-xs">
                Most common
              </Badge>
            )}
          </div>
          {category.description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {category.description}
            </p>
          )}
        </div>

        {/* Selection indicator */}
        {isSelected && !hasChildren && (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <svg
              className="w-3 h-3 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {category.children!.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelect={onSelect}
              disabled={disabled}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Category selector component for report submission.
 * Displays categories as an expandable tree with visual indicators.
 *
 * Features:
 * - Hierarchical tree structure
 * - Keyboard navigation
 * - Mobile-friendly (44px+ touch targets)
 * - "Most common" badges
 * - Selection highlighting
 *
 * @example
 * ```tsx
 * <CategorySelector
 *   categories={categories}
 *   selectedId={selectedCategoryId}
 *   onSelect={(cat) => setSelectedCategory(cat)}
 * />
 * ```
 */
export function CategorySelector({
  categories,
  selectedId,
  onSelect,
  disabled = false,
  className,
}: CategorySelectorProps) {
  // Track expanded categories
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const handleToggleExpand = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Auto-expand parent of selected category
  React.useEffect(() => {
    if (selectedId) {
      // Find parent IDs of selected category
      const findParents = (cats: Category[], targetId: string, parents: string[] = []): string[] => {
        for (const cat of cats) {
          if (cat.id === targetId) {
            return parents;
          }
          if (cat.children && cat.children.length > 0) {
            const found = findParents(cat.children, targetId, [...parents, cat.id]);
            if (found.length > 0) {
              return found;
            }
          }
        }
        return [];
      };

      const parents = findParents(categories, selectedId);
      if (parents.length > 0) {
        setExpandedIds((prev) => new Set([...prev, ...parents]));
      }
    }
  }, [selectedId, categories]);

  if (categories.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        No categories available
      </div>
    );
  }

  return (
    <div
      className={cn('space-y-2', className)}
      role="listbox"
      aria-label="Select a category"
    >
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          selectedId={selectedId}
          onSelect={onSelect}
          disabled={disabled}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  );
}
