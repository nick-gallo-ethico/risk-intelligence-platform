'use client';

/**
 * useAuthenticatedCategories Hook
 *
 * Hook to fetch categories for authenticated users (Employee Portal).
 * Uses the authenticated API endpoint instead of the public tenant endpoint.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Category } from './useTenantCategories';

export type { Category };

/**
 * Build tree structure from flat category list.
 */
function buildCategoryTree(categories: Category[]): Category[] {
  const categoryMap = new Map<string, Category>();
  const roots: Category[] = [];

  // First pass: create map
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      const parent = categoryMap.get(cat.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(category);
    } else {
      roots.push(category);
    }
  });

  // Sort by sortOrder
  const sortCategories = (cats: Category[]): Category[] => {
    return cats.sort((a, b) => a.sortOrder - b.sortOrder).map((cat) => ({
      ...cat,
      children: cat.children ? sortCategories(cat.children) : [],
    }));
  };

  return sortCategories(roots);
}

/**
 * Hook result type.
 */
export interface UseAuthenticatedCategoriesResult {
  /** Categories in tree structure */
  categories: Category[];
  /** Flat list of all categories */
  flatCategories: Category[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch categories */
  refetch: () => void;
}

/**
 * Hook to fetch categories for authenticated users.
 * Uses the authenticated /api/v1/categories endpoint.
 *
 * @returns Categories, loading state, and error
 */
export function useAuthenticatedCategories(): UseAuthenticatedCategoriesResult {
  const {
    data: flatCategories,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['authenticated-categories'],
    queryFn: async () => {
      const response = await apiClient.get<{ categories: Category[] }>('/categories');
      return response.categories || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const categories = flatCategories
    ? buildCategoryTree(flatCategories.filter((c) => c.isEnabled))
    : [];

  return {
    categories,
    flatCategories: flatCategories || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
