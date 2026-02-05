/**
 * Message types - matches backend messaging DTOs
 */

export interface CaseMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  subject?: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  senderType: string;
}

export interface MessagesListResponse {
  messages: CaseMessage[];
  totalCount: number;
}

export interface UnreadCountResponse {
  inbound: number;
  outbound: number;
}

export interface PiiCheckResult {
  hasPii: boolean;
  warnings: string[];
}

export interface SendMessageInput {
  content: string;
  subject?: string;
  skipPiiCheck?: boolean;
  acknowledgedPiiWarnings?: string[];
}
