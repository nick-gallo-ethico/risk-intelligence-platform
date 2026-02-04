import { apiClient } from './api';

// ===========================================
// Type Definitions for Checklist State
// ===========================================

/**
 * Status of a checklist item.
 */
export type ItemStatus = 'pending' | 'completed' | 'skipped';

/**
 * Status of a checklist section.
 */
export type SectionStatus = 'pending' | 'in_progress' | 'completed';

/**
 * State of a single checklist item.
 * Stored in itemStates JSON field keyed by item ID.
 */
export interface ChecklistItemState {
  status: ItemStatus;
  completedAt?: string;
  completedById?: string;
  completedByName?: string;
  completionNotes?: string;
  attachmentIds?: string[];
  linkedInterviewIds?: string[];
}

/**
 * State of a checklist section.
 * Stored in sectionStates JSON field keyed by section ID.
 */
export interface SectionState {
  status: SectionStatus;
  completedItems: number;
  totalItems: number;
}

/**
 * Custom item added by an investigator.
 * Stored in customItems JSON array.
 */
export interface CustomItem {
  id: string;
  sectionId: string;
  text: string;
  order: number;
  required: boolean;
  evidenceRequired: boolean;
  addedById: string;
  addedByName: string;
  addedAt: string;
}

/**
 * Record of a skipped item with reason.
 * Stored in skippedItems JSON array.
 */
export interface SkippedItem {
  itemId: string;
  reason: string;
  skippedById: string;
  skippedByName: string;
  skippedAt: string;
}

/**
 * Template section information for response.
 */
export interface TemplateSection {
  id: string;
  name: string;
  order: number;
  items: TemplateItem[];
}

/**
 * Template item information for response.
 */
export interface TemplateItem {
  id: string;
  text: string;
  order: number;
  required: boolean;
  evidenceRequired: boolean;
  guidance?: string;
  dependencies?: string[];
}

/**
 * Full checklist progress response with template details.
 */
export interface ChecklistProgress {
  id: string;
  investigationId: string;
  templateId: string;
  templateVersion: number;
  template: {
    name: string;
    sections: TemplateSection[];
  };
  itemStates: Record<string, ChecklistItemState>;
  sectionStates: Record<string, SectionState>;
  customItems: CustomItem[];
  skippedItems: SkippedItem[];
  totalItems: number;
  completedItems: number;
  skippedCount: number;
  customCount: number;
  progressPercent: number;
  startedAt?: string;
  completedAt?: string;
  lastActivityAt?: string;
}

// ===========================================
// API Functions
// ===========================================

/**
 * Get checklist progress for an investigation.
 */
export async function getChecklistProgress(
  investigationId: string
): Promise<ChecklistProgress | null> {
  try {
    return await apiClient.get<ChecklistProgress>(
      `/investigation-checklists/by-investigation/${investigationId}`
    );
  } catch (error: unknown) {
    // Return null if no checklist found (404)
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
      (error as { response: { status: number } }).response.status === 404
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * Apply a template to an investigation, creating checklist progress.
 */
export async function applyTemplate(
  investigationId: string,
  templateId: string
): Promise<ChecklistProgress> {
  return apiClient.post<ChecklistProgress>('/investigation-checklists/apply', {
    investigationId,
    templateId,
  });
}

/**
 * Complete a checklist item with optional notes and attachments.
 */
export async function completeItem(
  investigationId: string,
  itemId: string,
  data?: {
    completionNotes?: string;
    attachmentIds?: string[];
    linkedInterviewIds?: string[];
  }
): Promise<ChecklistProgress> {
  return apiClient.post<ChecklistProgress>(
    `/investigation-checklists/${investigationId}/items/${itemId}/complete`,
    data || {}
  );
}

/**
 * Skip a checklist item with a reason.
 */
export async function skipItem(
  investigationId: string,
  itemId: string,
  reason: string
): Promise<ChecklistProgress> {
  return apiClient.post<ChecklistProgress>(
    `/investigation-checklists/${investigationId}/items/${itemId}/skip`,
    { reason }
  );
}

/**
 * Uncomplete a checklist item (revert completion status).
 */
export async function uncompleteItem(
  investigationId: string,
  itemId: string
): Promise<ChecklistProgress> {
  return apiClient.post<ChecklistProgress>(
    `/investigation-checklists/${investigationId}/items/${itemId}/uncomplete`,
    {}
  );
}

/**
 * Add a custom item to a section.
 */
export async function addCustomItem(
  investigationId: string,
  sectionId: string,
  text: string,
  options?: {
    required?: boolean;
    evidenceRequired?: boolean;
  }
): Promise<ChecklistProgress> {
  return apiClient.post<ChecklistProgress>(
    `/investigation-checklists/${investigationId}/custom-items`,
    {
      sectionId,
      text,
      required: options?.required ?? false,
      evidenceRequired: options?.evidenceRequired ?? false,
    }
  );
}

/**
 * Delete checklist progress for an investigation.
 */
export async function deleteChecklist(investigationId: string): Promise<void> {
  return apiClient.delete<void>(`/investigation-checklists/${investigationId}`);
}
