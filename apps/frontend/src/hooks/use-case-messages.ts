'use client';

/**
 * useCaseMessages Hook
 *
 * Hook for managing case messaging with reporters.
 *
 * Features:
 * - Fetch messages for a case
 * - Send messages with cache invalidation
 * - Track unread counts
 * - PII checking before send
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '@/lib/messages-api';
import type {
  CaseMessage,
  MessagesListResponse,
  UnreadCountResponse,
  PiiCheckResult,
  SendMessageInput,
} from '@/types/message';

/**
 * Query key factory for messages queries.
 */
const messagesKeys = {
  all: ['messages'] as const,
  list: (caseId: string) => [...messagesKeys.all, 'list', caseId] as const,
  unread: (caseId: string) => [...messagesKeys.all, 'unread', caseId] as const,
};

/**
 * Hook for fetching messages for a case.
 *
 * @param caseId - The case ID to fetch messages for
 * @returns Query result with messages data
 */
export function useCaseMessages(caseId: string | undefined) {
  return useQuery<MessagesListResponse>({
    queryKey: messagesKeys.list(caseId!),
    queryFn: () => messagesApi.getForCase(caseId!),
    enabled: !!caseId,
    staleTime: 30 * 1000, // Consider stale after 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute for new messages
  });
}

/**
 * Hook for sending a message to the reporter.
 *
 * Automatically invalidates the messages list on success.
 *
 * @param caseId - The case ID to send message for
 * @returns Mutation for sending messages
 */
export function useSendMessage(caseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<CaseMessage, Error, SendMessageInput>({
    mutationFn: (input) => {
      if (!caseId) {
        throw new Error('Case ID is required');
      }
      return messagesApi.send(caseId, input);
    },
    onSuccess: () => {
      // Invalidate messages list to show the new message
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: messagesKeys.list(caseId) });
        queryClient.invalidateQueries({ queryKey: messagesKeys.unread(caseId) });
      }
    },
  });
}

/**
 * Hook for fetching unread message counts for a case.
 *
 * @param caseId - The case ID to fetch unread counts for
 * @returns Query result with unread counts
 */
export function useUnreadCount(caseId: string | undefined) {
  return useQuery<UnreadCountResponse>({
    queryKey: messagesKeys.unread(caseId!),
    queryFn: () => messagesApi.getUnreadCount(caseId!),
    enabled: !!caseId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Hook for checking PII in message content.
 *
 * @returns Mutation for PII checking
 */
export function useCheckPii() {
  return useMutation<PiiCheckResult, Error, string>({
    mutationFn: (content) => messagesApi.checkPii(content),
  });
}
