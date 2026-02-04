'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { db, ReportDraft, AttachmentRef, cleanupExpiredDrafts } from '@/lib/ethics-offline-db';

/**
 * Generate a unique local ID for a draft.
 * Uses a simple random string generator with no ambiguous characters.
 */
function generateLocalId(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

/**
 * Configuration for the auto-save hook.
 */
export interface AutoSaveConfig {
  /** Debounce delay in milliseconds (default: 1000ms) */
  debounceMs?: number;
  /** Auto-expiration in days (default: 7) */
  expirationDays?: number;
}

/**
 * Result type for the auto-save hook.
 */
export interface AutoSaveResult {
  /** Save draft content (debounced) */
  saveDraft: (content: Record<string, unknown>, category?: string, attachments?: AttachmentRef[]) => Promise<string>;
  /** Load an existing draft */
  loadDraft: () => Promise<ReportDraft | null>;
  /** Load a draft by its localId (for cross-device resume) */
  loadDraftByCode: (localId: string) => Promise<ReportDraft | null>;
  /** Delete the current draft */
  deleteDraft: () => Promise<void>;
  /** Mark draft as pending submission */
  markPending: () => Promise<void>;
  /** Mark draft as synced (after successful submission) */
  markSynced: () => Promise<void>;
  /** Mark draft as failed (after submission failure) */
  markFailed: () => Promise<void>;
  /** Timestamp of last successful save */
  lastSaved: Date | null;
  /** Whether a save is currently in progress */
  isSaving: boolean;
  /** Current draft's local ID (for resume code) */
  draftLocalId: string | null;
  /** Whether database is initialized */
  isReady: boolean;
}

/**
 * Hook for auto-saving form drafts to encrypted IndexedDB.
 *
 * Features:
 * - Debounced saves to reduce database writes
 * - Automatic encryption of content and attachments
 * - Cross-device resume via localId code
 * - Automatic expiration after 7 days
 * - Status tracking for background sync
 *
 * @param tenantSlug - The tenant identifier for multi-tenant isolation
 * @param config - Optional configuration
 *
 * @example
 * ```tsx
 * const { saveDraft, loadDraft, lastSaved } = useAutoSaveDraft('acme-corp');
 *
 * // Auto-save on form changes
 * useEffect(() => {
 *   saveDraft(formData, selectedCategory);
 * }, [formData, selectedCategory]);
 *
 * // Load existing draft on mount
 * useEffect(() => {
 *   loadDraft().then(draft => {
 *     if (draft) setFormData(draft.content);
 *   });
 * }, []);
 * ```
 */
export function useAutoSaveDraft(
  tenantSlug: string,
  config: AutoSaveConfig = {}
): AutoSaveResult {
  const { debounceMs = 1000, expirationDays = 7 } = config;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLocalId, setDraftLocalId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draftIdRef = useRef<number | null>(null);

  // Initialize database encryption on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await db.initEncryption();
        await cleanupExpiredDrafts();
        if (mounted) {
          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize offline database:', error);
      }
    }

    init();

    return () => {
      mounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Save draft content with debouncing.
   * Returns the localId that can be used for cross-device resume.
   */
  const saveDraft = useCallback(
    async (
      content: Record<string, unknown>,
      category?: string,
      attachments: AttachmentRef[] = []
    ): Promise<string> => {
      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      return new Promise((resolve, reject) => {
        debounceTimerRef.current = setTimeout(async () => {
          if (!isReady) {
            reject(new Error('Database not initialized'));
            return;
          }

          setIsSaving(true);

          try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

            // Check for existing draft for this tenant
            const existing = await db.drafts
              .where('tenantSlug')
              .equals(tenantSlug)
              .and((draft) => draft.syncStatus === 'draft')
              .first();

            let localId: string;

            if (existing && existing.id) {
              // Update existing draft
              localId = existing.localId;
              draftIdRef.current = existing.id;

              const updatedDraft: ReportDraft = {
                ...existing,
                content,
                category,
                attachments,
                updatedAt: now,
              };

              await db.drafts.update(existing.id, db.encryptDraft(updatedDraft));
            } else {
              // Create new draft
              localId = generateLocalId();

              const newDraft: ReportDraft = {
                localId,
                tenantSlug,
                category,
                content,
                attachments,
                createdAt: now,
                updatedAt: now,
                expiresAt,
                syncStatus: 'draft',
              };

              const id = await db.drafts.add(db.encryptDraft(newDraft));
              draftIdRef.current = id as number;
            }

            setDraftLocalId(localId);
            setLastSaved(now);
            setIsSaving(false);
            resolve(localId);
          } catch (error) {
            setIsSaving(false);
            console.error('Failed to save draft:', error);
            reject(error);
          }
        }, debounceMs);
      });
    },
    [tenantSlug, debounceMs, expirationDays, isReady]
  );

  /**
   * Load the current draft for this tenant.
   */
  const loadDraft = useCallback(async (): Promise<ReportDraft | null> => {
    if (!isReady) return null;

    try {
      const draft = await db.drafts
        .where('tenantSlug')
        .equals(tenantSlug)
        .and((d) => d.syncStatus === 'draft')
        .first();

      if (draft) {
        draftIdRef.current = draft.id ?? null;
        setDraftLocalId(draft.localId);
        return db.decryptDraft(draft);
      }

      return null;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }, [tenantSlug, isReady]);

  /**
   * Load a draft by its localId (for cross-device resume).
   */
  const loadDraftByCode = useCallback(
    async (localId: string): Promise<ReportDraft | null> => {
      if (!isReady) return null;

      try {
        const draft = await db.drafts
          .where('localId')
          .equals(localId)
          .first();

        if (draft && draft.tenantSlug === tenantSlug) {
          draftIdRef.current = draft.id ?? null;
          setDraftLocalId(draft.localId);
          return db.decryptDraft(draft);
        }

        return null;
      } catch (error) {
        console.error('Failed to load draft by code:', error);
        return null;
      }
    },
    [tenantSlug, isReady]
  );

  /**
   * Delete the current draft.
   */
  const deleteDraft = useCallback(async (): Promise<void> => {
    if (draftIdRef.current) {
      try {
        await db.drafts.delete(draftIdRef.current);
        draftIdRef.current = null;
        setDraftLocalId(null);
        setLastSaved(null);
      } catch (error) {
        console.error('Failed to delete draft:', error);
      }
    }
  }, []);

  /**
   * Mark the draft as pending submission.
   */
  const markPending = useCallback(async (): Promise<void> => {
    if (draftIdRef.current) {
      try {
        await db.drafts.update(draftIdRef.current, { syncStatus: 'pending' });
      } catch (error) {
        console.error('Failed to mark draft as pending:', error);
      }
    }
  }, []);

  /**
   * Mark the draft as synced (after successful submission).
   */
  const markSynced = useCallback(async (): Promise<void> => {
    if (draftIdRef.current) {
      try {
        await db.drafts.update(draftIdRef.current, { syncStatus: 'synced' });
      } catch (error) {
        console.error('Failed to mark draft as synced:', error);
      }
    }
  }, []);

  /**
   * Mark the draft as failed (after submission failure).
   */
  const markFailed = useCallback(async (): Promise<void> => {
    if (draftIdRef.current) {
      try {
        await db.drafts.update(draftIdRef.current, { syncStatus: 'failed' });
      } catch (error) {
        console.error('Failed to mark draft as failed:', error);
      }
    }
  }, []);

  return {
    saveDraft,
    loadDraft,
    loadDraftByCode,
    deleteDraft,
    markPending,
    markSynced,
    markFailed,
    lastSaved,
    isSaving,
    draftLocalId,
    isReady,
  };
}
