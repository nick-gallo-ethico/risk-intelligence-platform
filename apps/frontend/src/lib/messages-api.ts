/**
 * Messages API client
 *
 * Handles case messaging operations for investigator-reporter communication.
 */
import { apiClient } from './api';
import type {
  CaseMessage,
  MessagesListResponse,
  UnreadCountResponse,
  PiiCheckResult,
  SendMessageInput,
} from '@/types/message';

export const messagesApi = {
  /**
   * Get all messages for a case
   */
  getForCase: (caseId: string): Promise<MessagesListResponse> => {
    return apiClient.get<MessagesListResponse>(`/case-messages/${caseId}`);
  },

  /**
   * Send a message to the reporter
   */
  send: (
    caseId: string,
    input: SendMessageInput
  ): Promise<CaseMessage> => {
    return apiClient.post<CaseMessage>(`/case-messages/${caseId}/send`, input);
  },

  /**
   * Get unread message counts for a case
   */
  getUnreadCount: (caseId: string): Promise<UnreadCountResponse> => {
    return apiClient.get<UnreadCountResponse>(`/case-messages/${caseId}/unread-count`);
  },

  /**
   * Check content for PII before sending
   */
  checkPii: (content: string): Promise<PiiCheckResult> => {
    return apiClient.post<PiiCheckResult>('/case-messages/check-pii', { content });
  },
};
