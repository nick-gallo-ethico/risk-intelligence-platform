'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { CaseCreationFormData } from '@/lib/validations/case-schema';

const DRAFT_KEY = 'draft:case-creation';
const AUTO_SAVE_INTERVAL_MS = 30000; // 30 seconds

interface DraftData {
  formData: Partial<CaseCreationFormData>;
  savedAt: number; // timestamp
}

interface UseCaseFormDraftReturn {
  /** Restore saved draft data, or undefined if none exists */
  loadDraft: () => Partial<CaseCreationFormData> | undefined;
  /** Save current form data as draft */
  saveDraft: (data: Partial<CaseCreationFormData>) => void;
  /** Clear draft from storage */
  clearDraft: () => void;
  /** Whether a draft exists */
  hasDraft: boolean;
  /** Timestamp of last save (for display) */
  lastSavedAt: Date | null;
  /** Whether draft was just saved (for animation) */
  justSaved: boolean;
}

/**
 * Hook for persisting case creation form drafts to localStorage.
 *
 * Features:
 * - Auto-save every 30 seconds when data changes
 * - Restore draft on page load
 * - Clear draft on successful submit
 * - Visual feedback when draft is saved
 *
 * @param getFormData - Function to get current form values
 * @param enabled - Whether auto-save is enabled (default: true)
 */
export function useCaseFormDraft(
  getFormData: () => Partial<CaseCreationFormData>,
  enabled: boolean = true
): UseCaseFormDraftReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save function - defined first so it can be used in useEffect
  const saveDraftToStorage = useCallback((data: Partial<CaseCreationFormData>) => {
    if (typeof window === 'undefined') return;

    try {
      const draftData: DraftData = {
        formData: data,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setHasDraft(true);
      setLastSavedAt(new Date(draftData.savedAt));

      // Trigger "just saved" indicator
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }, []);

  // Check for existing draft on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const parsed: DraftData = JSON.parse(stored);
        setHasDraft(true);
        setLastSavedAt(new Date(parsed.savedAt));
      }
    } catch (error) {
      console.warn('Failed to check draft status:', error);
    }
  }, []);

  // Auto-save timer
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    autoSaveTimerRef.current = setInterval(() => {
      const formData = getFormData();
      // Only save if form has meaningful content
      if (formData.details && formData.details.length > 0) {
        saveDraftToStorage(formData);
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [enabled, getFormData, saveDraftToStorage]);

  const saveDraft = useCallback(
    (data: Partial<CaseCreationFormData>) => {
      saveDraftToStorage(data);
    },
    [saveDraftToStorage]
  );

  const loadDraft = useCallback((): Partial<CaseCreationFormData> | undefined => {
    if (typeof window === 'undefined') return undefined;

    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (!stored) return undefined;

      const parsed: DraftData = JSON.parse(stored);
      return parsed.formData;
    } catch (error) {
      console.warn('Failed to load draft:', error);
      return undefined;
    }
  }, []);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setLastSavedAt(null);
    } catch (error) {
      console.warn('Failed to clear draft:', error);
    }
  }, []);

  return {
    loadDraft,
    saveDraft,
    clearDraft,
    hasDraft,
    lastSavedAt,
    justSaved,
  };
}

/**
 * Format relative time for display (e.g., "2 minutes ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
