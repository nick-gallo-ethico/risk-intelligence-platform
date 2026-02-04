'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Category from the API with tree structure support.
 */
export interface Category {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Description of the category */
  description?: string;
  /** Icon name (lucide-react) */
  icon?: string;
  /** Parent category ID for tree structure */
  parentId?: string | null;
  /** Child categories */
  children?: Category[];
  /** Sort order */
  sortOrder: number;
  /** Whether this is frequently selected */
  isMostCommon?: boolean;
  /** Whether this category is enabled */
  isEnabled: boolean;
}

/**
 * Response from categories API.
 */
interface CategoriesResponse {
  categories: Category[];
}

/**
 * Fetch categories from the public API.
 */
async function fetchTenantCategories(tenantSlug: string): Promise<Category[]> {
  const response = await fetch(`/api/v1/public/ethics/${tenantSlug}/categories`);

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  const data: CategoriesResponse = await response.json();
  return data.categories;
}

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
export interface UseTenantCategoriesResult {
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
 * Hook to fetch tenant categories from the public API.
 * Returns categories in a tree structure with caching.
 *
 * @param tenantSlug - The tenant identifier
 * @returns Categories, loading state, and error
 *
 * @example
 * ```tsx
 * const { categories, isLoading } = useTenantCategories('acme-corp');
 * ```
 */
export function useTenantCategories(tenantSlug: string): UseTenantCategoriesResult {
  const {
    data: flatCategories,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tenant-categories', tenantSlug],
    queryFn: () => fetchTenantCategories(tenantSlug),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    enabled: !!tenantSlug,
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
