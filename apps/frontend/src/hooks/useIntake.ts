'use client';

/**
 * useIntake Hook
 *
 * Manages intake form state for the Operator Console.
 *
 * Features:
 * - State management for intake data
 * - Auto-save every 30 seconds when dirty
 * - Save draft, submit to QA, and reset functionality
 * - Integration with operator API
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

/**
 * RIU type for intake classification.
 */
export type RiuType = 'REPORT' | 'REQUEST_FOR_INFO' | 'WRONG_NUMBER';

/**
 * Anonymity tier for caller identification.
 */
export type AnonymityTier = 'ANONYMOUS' | 'CONFIDENTIAL' | 'IDENTIFIED';

/**
 * Selected subject for intake.
 */
export interface IntakeSubject {
  type: 'hris' | 'manual';
  hrisEmployeeId?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  relationship?: string;
}

/**
 * Intake data structure.
 */
export interface IntakeData {
  /** Unique intake ID (set after first save) */
  id?: string;
  /** RIU type classification */
  riuType: RiuType | null;
  /** Selected category ID (for REPORT type) */
  categoryId: string | null;
  /** Content/notes from caller */
  content: string;
  /** Caller anonymity tier */
  anonymityTier: AnonymityTier;
  /** Caller phone number (if provided) */
  callerPhoneNumber?: string;
  /** Caller name (if identified) */
  callerName?: string;
  /** Selected subject (for REPORT type) */
  subject?: IntakeSubject;
  /** Is urgent flag */
  isUrgent: boolean;
  /** Category-specific question answers */
  categoryAnswers: Record<string, unknown>;
  /** Attachment IDs */
  attachmentIds: string[];
  /** AI cleanup applied flag */
  aiCleanupApplied?: boolean;
}

/**
 * Save response from API.
 */
interface SaveResponse {
  id: string;
  status: 'draft' | 'pending_qa' | 'released';
}

/**
 * Return type for useIntake hook.
 */
export interface UseIntakeReturn {
  /** Current intake data */
  intakeData: IntakeData;
  /** Whether form has unsaved changes */
  isDirty: boolean;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Whether submit is in progress */
  isSubmitting: boolean;
  /** Last save error */
  saveError: Error | null;
  /** Update a single field */
  updateField: <K extends keyof IntakeData>(field: K, value: IntakeData[K]) => void;
  /** Update content (notes) */
  updateContent: (content: string) => void;
  /** Update category answers */
  updateCategoryAnswers: (answers: Record<string, unknown>) => void;
  /** Save draft */
  save: () => Promise<void>;
  /** Submit to QA queue */
  submit: () => Promise<void>;
  /** Reset form for new intake */
  reset: () => void;
  /** Set subject */
  setSubject: (subject: IntakeSubject | undefined) => void;
}

/**
 * Initial intake data state.
 */
const initialIntakeData: IntakeData = {
  riuType: null,
  categoryId: null,
  content: '',
  anonymityTier: 'ANONYMOUS',
  callerPhoneNumber: undefined,
  callerName: undefined,
  subject: undefined,
  isUrgent: false,
  categoryAnswers: {},
  attachmentIds: [],
  aiCleanupApplied: false,
};

/**
 * Hook for managing intake form state.
 *
 * @param clientId - Current client organization ID
 * @returns Intake state and methods
 */
export function useIntake(clientId: string): UseIntakeReturn {
  const [intakeData, setIntakeData] = useState<IntakeData>(initialIntakeData);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  // Ref to track auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Track clientId changes to reset form
  const prevClientIdRef = useRef(clientId);
  useEffect(() => {
    if (prevClientIdRef.current !== clientId) {
      setIntakeData(initialIntakeData);
      setIsDirty(false);
      setSaveError(null);
      prevClientIdRef.current = clientId;
    }
  }, [clientId]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Auto-save every 30 seconds when dirty
  useEffect(() => {
    if (isDirty && intakeData.id && clientId) {
      autoSaveTimerRef.current = setTimeout(async () => {
        if (isMountedRef.current && isDirty) {
          try {
            await saveInternal();
          } catch {
            // Auto-save errors are silent
          }
        }
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, intakeData.id, clientId]);

  /**
   * Internal save function.
   */
  const saveInternal = async () => {
    if (!clientId) {
      throw new Error('No client selected');
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = {
        riuType: intakeData.riuType,
        categoryId: intakeData.categoryId,
        content: intakeData.content,
        anonymityTier: intakeData.anonymityTier,
        callerPhoneNumber: intakeData.callerPhoneNumber,
        callerName: intakeData.callerName,
        subject: intakeData.subject,
        isUrgent: intakeData.isUrgent,
        categoryAnswers: intakeData.categoryAnswers,
        attachmentIds: intakeData.attachmentIds,
        aiCleanupApplied: intakeData.aiCleanupApplied,
      };

      let response: SaveResponse;

      if (intakeData.id) {
        // Update existing draft
        response = await apiClient.put<SaveResponse>(
          `/operator/clients/${clientId}/intake/${intakeData.id}`,
          payload
        );
      } else {
        // Create new draft
        response = await apiClient.post<SaveResponse>(
          `/operator/clients/${clientId}/intake`,
          payload
        );
      }

      if (isMountedRef.current) {
        setIntakeData((prev) => ({ ...prev, id: response.id }));
        setIsDirty(false);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed');
      if (isMountedRef.current) {
        setSaveError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  /**
   * Update a single field in intake data.
   */
  const updateField = useCallback(
    <K extends keyof IntakeData>(field: K, value: IntakeData[K]) => {
      setIntakeData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      setSaveError(null);
    },
    []
  );

  /**
   * Update content (notes).
   */
  const updateContent = useCallback((content: string) => {
    setIntakeData((prev) => ({ ...prev, content }));
    setIsDirty(true);
    setSaveError(null);
  }, []);

  /**
   * Update category-specific answers.
   */
  const updateCategoryAnswers = useCallback(
    (answers: Record<string, unknown>) => {
      setIntakeData((prev) => ({
        ...prev,
        categoryAnswers: { ...prev.categoryAnswers, ...answers },
      }));
      setIsDirty(true);
      setSaveError(null);
    },
    []
  );

  /**
   * Save draft.
   */
  const save = useCallback(async () => {
    await saveInternal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeData, clientId]);

  /**
   * Submit to QA queue.
   */
  const submit = useCallback(async () => {
    if (!clientId) {
      throw new Error('No client selected');
    }

    setIsSubmitting(true);
    setSaveError(null);

    try {
      // Save first if there are unsaved changes
      if (isDirty || !intakeData.id) {
        await saveInternal();
      }

      // Submit to QA
      await apiClient.post(
        `/operator/clients/${clientId}/intake/${intakeData.id}/submit-qa`
      );

      if (isMountedRef.current) {
        // Reset form after successful submission
        setIntakeData(initialIntakeData);
        setIsDirty(false);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Submit failed');
      if (isMountedRef.current) {
        setSaveError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeData, clientId, isDirty]);

  /**
   * Reset form for new intake.
   */
  const reset = useCallback(() => {
    setIntakeData(initialIntakeData);
    setIsDirty(false);
    setSaveError(null);
  }, []);

  /**
   * Set subject.
   */
  const setSubject = useCallback((subject: IntakeSubject | undefined) => {
    setIntakeData((prev) => ({ ...prev, subject }));
    setIsDirty(true);
    setSaveError(null);
  }, []);

  return {
    intakeData,
    isDirty,
    isSaving,
    isSubmitting,
    saveError,
    updateField,
    updateContent,
    updateCategoryAnswers,
    save,
    submit,
    reset,
    setSubject,
  };
}
