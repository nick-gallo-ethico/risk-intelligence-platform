/**
 * useSavedViewContext Hook
 *
 * Provides access to the SavedViewContext with proper error handling
 * if used outside of a SavedViewProvider.
 */
"use client";

import { useContext } from "react";
import {
  SavedViewContext,
  SavedViewContextValue,
} from "@/components/views/SavedViewProvider";

/**
 * Access the SavedViewContext value.
 *
 * Must be used within a SavedViewProvider. Throws an error if used
 * outside of the provider to help catch configuration errors early.
 *
 * @returns The SavedViewContextValue containing state and actions
 * @throws Error if used outside of SavedViewProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { filters, setFilters, saveView } = useSavedViewContext();
 *
 *   return (
 *     <button onClick={() => saveView()}>
 *       Save ({filters.length} filters)
 *     </button>
 *   );
 * }
 * ```
 */
export function useSavedViewContext(): SavedViewContextValue {
  const context = useContext(SavedViewContext);

  if (!context) {
    throw new Error(
      "useSavedViewContext must be used within a SavedViewProvider. " +
        "Make sure your component is wrapped in a SavedViewProvider."
    );
  }

  return context;
}
