'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for managing draft content in localStorage.
 * Used to persist unsaved editor content across page reloads.
 *
 * @param key - Unique identifier for the draft (e.g., investigationId)
 * @returns Draft state and methods to save/clear
 */
export function useDraft(key: string | undefined) {
  const [draft, setDraft] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const storageKey = key ? `draft:${key}` : null;

  // Load draft from localStorage on mount
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setDraft(saved);
        }
      } catch (error) {
        console.warn('Failed to load draft from localStorage:', error);
      }
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save draft to localStorage
  const saveDraft = useCallback(
    (content: string) => {
      if (storageKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, content);
          setDraft(content);
        } catch (error) {
          console.warn('Failed to save draft to localStorage:', error);
        }
      }
    },
    [storageKey]
  );

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
        setDraft(null);
      } catch (error) {
        console.warn('Failed to clear draft from localStorage:', error);
      }
    }
  }, [storageKey]);

  // Check if a draft exists
  const hasDraft = draft !== null && draft.length > 0;

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft,
    isLoaded,
  };
}
