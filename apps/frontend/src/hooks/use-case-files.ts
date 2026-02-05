'use client';

/**
 * useCaseFiles Hook
 *
 * Hook for fetching and managing case file attachments.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentsApi } from '@/lib/attachments-api';
import type { AttachmentListResponse, Attachment } from '@/types/attachment';

/**
 * Query key factory for case files queries.
 */
const caseFilesKeys = {
  all: ['case-files'] as const,
  list: (caseId: string) => [...caseFilesKeys.all, 'list', caseId] as const,
};

/**
 * Hook for fetching files attached to a case.
 *
 * @param caseId - The case ID to fetch files for
 * @returns Query result with attachments data
 */
export function useCaseFiles(caseId: string | undefined) {
  return useQuery<AttachmentListResponse>({
    queryKey: caseFilesKeys.list(caseId!),
    queryFn: () => attachmentsApi.getForEntity('CASE', caseId!),
    enabled: !!caseId,
    staleTime: 60 * 1000, // Consider stale after 1 minute
  });
}

/**
 * Hook for deleting a case file attachment.
 *
 * Automatically invalidates the files list on success.
 *
 * @param caseId - The case ID the file belongs to
 * @returns Mutation for deleting files
 */
export function useDeleteCaseFile(caseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (fileId) => attachmentsApi.delete(fileId),
    onSuccess: () => {
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: caseFilesKeys.list(caseId) });
      }
    },
  });
}

/**
 * Hook to invalidate case files cache (useful after upload).
 */
export function useInvalidateCaseFiles() {
  const queryClient = useQueryClient();

  return (caseId: string) => {
    queryClient.invalidateQueries({ queryKey: caseFilesKeys.list(caseId) });
  };
}
