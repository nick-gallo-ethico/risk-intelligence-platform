import { apiClient } from './api';

/**
 * Note types matching backend enum
 */
export type NoteType = 'GENERAL' | 'INTERVIEW' | 'EVIDENCE' | 'FINDING' | 'RECOMMENDATION';

/**
 * Note visibility levels matching backend enum
 */
export type NoteVisibility = 'PRIVATE' | 'TEAM' | 'ALL';

/**
 * Investigation note author information
 */
export interface NoteAuthor {
  id: string;
  name: string;
  email: string;
}

/**
 * Investigation note entity
 */
export interface InvestigationNote {
  id: string;
  investigationId: string;
  organizationId: string;
  content: string;
  contentPlainText?: string;
  noteType: NoteType;
  visibility: NoteVisibility;
  author: NoteAuthor;
  authorName: string;
  isEdited: boolean;
  editedAt?: string;
  editCount: number;
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
  aiSummary?: string;
  aiSummaryGeneratedAt?: string;
  aiModelVersion?: string;
  createdAt: string;
  updatedAt: string;
  investigation: {
    id: string;
    investigationNumber: number;
  };
}

/**
 * Paginated response for notes list
 */
export interface NotesListResponse {
  items: InvestigationNote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Parameters for listing notes
 */
export interface ListNotesParams {
  noteType?: NoteType;
  authorId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Input for creating a new note
 */
export interface CreateNoteInput {
  content: string;
  noteType: NoteType;
  visibility?: NoteVisibility;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
}

/**
 * Input for updating a note
 */
export interface UpdateNoteInput {
  content?: string;
  noteType?: NoteType;
  visibility?: NoteVisibility;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    size?: number;
    mimeType?: string;
  }>;
}

/**
 * Investigation notes API client
 */
export const investigationNotesApi = {
  /**
   * Get a list of notes for an investigation
   */
  list: async (investigationId: string, params?: ListNotesParams): Promise<NotesListResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.noteType) searchParams.set('noteType', params.noteType);
    if (params?.authorId) searchParams.set('authorId', params.authorId);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    const url = `/investigations/${investigationId}/notes${query ? `?${query}` : ''}`;

    return apiClient.get<NotesListResponse>(url);
  },

  /**
   * Get a single note by ID
   */
  getById: async (investigationId: string, noteId: string): Promise<InvestigationNote> => {
    return apiClient.get<InvestigationNote>(`/investigations/${investigationId}/notes/${noteId}`);
  },

  /**
   * Create a new note
   */
  create: async (investigationId: string, data: CreateNoteInput): Promise<InvestigationNote> => {
    return apiClient.post<InvestigationNote>(`/investigations/${investigationId}/notes`, data);
  },

  /**
   * Update an existing note
   */
  update: async (
    investigationId: string,
    noteId: string,
    data: UpdateNoteInput
  ): Promise<InvestigationNote> => {
    return apiClient.patch<InvestigationNote>(
      `/investigations/${investigationId}/notes/${noteId}`,
      data
    );
  },

  /**
   * Delete a note
   */
  delete: async (investigationId: string, noteId: string): Promise<void> => {
    return apiClient.delete(`/investigations/${investigationId}/notes/${noteId}`);
  },
};

export default investigationNotesApi;
