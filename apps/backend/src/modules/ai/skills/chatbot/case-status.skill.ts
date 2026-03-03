import { z } from "zod";
import {
  SkillDefinition,
  SkillScope,
  SkillContext,
  SkillResult,
} from "../skill.types";
import {
  CaseStatusService,
  CaseStatusResult,
} from "../../../chatbot/services/case-status.service";

/**
 * Input schema for case status skill.
 * Access code format: XXX-XXXX-XXXX (12 alphanumeric characters)
 */
export const caseStatusInputSchema = z.object({
  accessCode: z
    .string()
    .min(10)
    .max(16)
    .describe("The anonymous access code (format: XXX-XXXX-XXXX)"),
  ipAddress: z
    .string()
    .optional()
    .describe("Client IP address for rate limiting"),
});

export type CaseStatusInput = z.infer<typeof caseStatusInputSchema>;

/**
 * Output from case status skill.
 * Provides minimal case information without sensitive details.
 */
export interface CaseStatusOutput {
  /** Whether a case was found */
  found: boolean;
  /** Case reference number (e.g., CASE-2026-0001) */
  referenceNumber?: string;
  /** Case status enum value */
  status?: string;
  /** Human-readable status label */
  statusLabel?: string;
  /** When the case was last updated */
  lastUpdated?: Date;
  /** Whether there are unread messages from investigators */
  hasNewMessages?: boolean;
  /** Error message if lookup failed */
  error?: string;
  /** Whether the IP is rate limited */
  rateLimited?: boolean;
  /** Number of attempts remaining before rate limit */
  attemptsRemaining?: number;
}

/**
 * Create the case status skill.
 * Allows anonymous users to check case status via access code.
 *
 * Security measures:
 * - Rate limited (5 attempts per IP per 15 min)
 * - Minimal data exposure (no sensitive details)
 * - Failed attempts logged for security monitoring
 * - IP addresses masked in logs
 *
 * Used by:
 * - EmployeeChatbotAgent (CHAT-07 requirement)
 * - Ethics Portal status check flow
 *
 * @param caseStatusService - Case status service with rate limiting
 * @returns CaseStatus skill definition
 */
export function caseStatusSkill(
  caseStatusService: CaseStatusService,
): SkillDefinition<CaseStatusInput, CaseStatusOutput> {
  return {
    id: "case-status",
    name: "Check Case Status",
    description:
      "Check the status of an ethics report using the anonymous access code. Rate limited for security.",
    scope: SkillScope.PLATFORM,
    requiredPermissions: [], // Available to anonymous users
    entityTypes: ["chatbot", "employee-chatbot"],

    inputSchema: caseStatusInputSchema,

    async execute(
      input: CaseStatusInput,
      context: SkillContext,
    ): Promise<SkillResult<CaseStatusOutput>> {
      try {
        // Use a default IP if not provided (socket connection should provide this)
        // In production, this comes from the WebSocket handshake or HTTP request
        const ipAddress = input.ipAddress || "unknown";

        const result: CaseStatusResult =
          await caseStatusService.lookupByAccessCode(
            input.accessCode,
            ipAddress,
          );

        if (!result.success) {
          // Skill executed successfully, but case lookup failed
          // This distinction matters: skill error vs lookup not found
          return {
            success: true,
            data: {
              found: false,
              error: result.error,
              rateLimited: result.locked,
              attemptsRemaining: result.attemptsRemaining,
            },
          };
        }

        return {
          success: true,
          data: {
            found: true,
            referenceNumber: result.case?.referenceNumber,
            status: result.case?.status,
            statusLabel: result.case?.statusLabel,
            lastUpdated: result.case?.lastUpdated,
            hasNewMessages: result.case?.hasNewMessages,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message || "Case status lookup failed",
        };
      }
    },
  };
}
