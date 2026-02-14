"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthenticatedCategories } from "@/hooks/useAuthenticatedCategories";
import type { Category } from "@/hooks/useTenantCategories";

/**
 * Props for CategorySelector component.
 */
export interface CategorySelectorProps {
  /** Currently selected primary category ID */
  primaryCategoryId?: string | null;
  /** Currently selected secondary (sub) category ID */
  secondaryCategoryId?: string | null;
  /** Called when the primary category changes */
  onPrimaryCategoryChange: (categoryId: string | null) => void;
  /** Called when the secondary (sub) category changes */
  onSecondaryCategoryChange: (categoryId: string | null) => void;
  /** Disable both dropdowns */
  disabled?: boolean;
}

/**
 * CategorySelector - Dependent category/subcategory dropdown pair.
 *
 * Used in the Classification card of the left sidebar on record detail pages.
 * Fetches tenant-configured categories via `useAuthenticatedCategories` and
 * presents two linked Select dropdowns:
 *
 * 1. **Primary Category** - top-level categories (parentId is null)
 * 2. **Subcategory** - children of the selected primary category
 *
 * When Primary Category changes, Subcategory resets to null.
 * Subcategory is disabled until a Primary Category is selected.
 *
 * Per spec Section 14.6.
 */
export function CategorySelector({
  primaryCategoryId,
  secondaryCategoryId,
  onPrimaryCategoryChange,
  onSecondaryCategoryChange,
  disabled = false,
}: CategorySelectorProps) {
  const { categories, isLoading, error } = useAuthenticatedCategories();

  // Top-level categories (parentId is null/undefined = roots)
  const primaryCategories = useMemo(() => {
    return categories.filter((cat) => !cat.parentId || cat.parentId === null);
  }, [categories]);

  // Find the selected primary category to get its children
  const selectedPrimary = useMemo(() => {
    if (!primaryCategoryId) return null;
    return findCategoryById(categories, primaryCategoryId);
  }, [categories, primaryCategoryId]);

  // Subcategories: children of the selected primary category
  const subcategories = useMemo(() => {
    if (!selectedPrimary) return [];
    return selectedPrimary.children ?? [];
  }, [selectedPrimary]);

  // Handle primary category change - reset subcategory
  const handlePrimaryChange = (value: string) => {
    if (value === "__clear__") {
      onPrimaryCategoryChange(null);
      onSecondaryCategoryChange(null);
      return;
    }
    onPrimaryCategoryChange(value);
    // Reset subcategory when primary changes
    onSecondaryCategoryChange(null);
  };

  // Handle subcategory change
  const handleSubcategoryChange = (value: string) => {
    if (value === "__clear__") {
      onSecondaryCategoryChange(null);
      return;
    }
    onSecondaryCategoryChange(value);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div>
          <Skeleton className="h-3 w-24 mb-1.5" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-1.5" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <p className="text-sm text-destructive py-1">Failed to load categories</p>
    );
  }

  // Empty state - no categories configured
  if (primaryCategories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-1">
        No categories configured
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Primary Category */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Primary Category
        </label>
        <Select
          value={primaryCategoryId ?? undefined}
          onValueChange={handlePrimaryChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select category..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__" className="text-muted-foreground">
              None
            </SelectItem>
            {primaryCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategory */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Subcategory
        </label>
        <Select
          value={secondaryCategoryId ?? undefined}
          onValueChange={handleSubcategoryChange}
          disabled={disabled || !primaryCategoryId}
        >
          <SelectTrigger
            className={`h-8 text-sm ${!primaryCategoryId ? "opacity-50" : ""}`}
          >
            <SelectValue
              placeholder={
                !primaryCategoryId
                  ? "Select primary category first"
                  : subcategories.length === 0
                    ? "No subcategories"
                    : "Select subcategory..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {subcategories.length > 0 ? (
              <>
                <SelectItem value="__clear__" className="text-muted-foreground">
                  None
                </SelectItem>
                {subcategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </>
            ) : (
              <SelectItem value="__empty__" disabled>
                No subcategories available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Recursively find a category by ID in the tree.
 */
function findCategoryById(categories: Category[], id: string): Category | null {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    if (cat.children && cat.children.length > 0) {
      const found = findCategoryById(cat.children, id);
      if (found) return found;
    }
  }
  return null;
}
