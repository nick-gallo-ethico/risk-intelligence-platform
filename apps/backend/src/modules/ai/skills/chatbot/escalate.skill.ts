import { z } from "zod";
import {
  SkillDefinition,
  SkillScope,
  SkillContext,
  SkillResult,
} from "../skill.types";
import { EscalationService } from "../../../chatbot/services/escalation.service";
import { ConversationMessage } from "../../../chatbot/entities/chatbot-inquiry.entity";

/**
 * Input schema for escalate skill.
 */
export const escalateInputSchema = z.object({
  question: z
    .string()
    .min(1)
    .max(2000)
    .describe("The question or topic to escalate to compliance team"),
  sessionId: z.string().describe("Chatbot session ID for linking conversation"),
  userEmail: z
    .string()
    .email()
    .optional()
    .describe("Optional email for compliance team to respond"),
  conversationId: z
    .string()
    .optional()
    .describe("AI conversation ID for context"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        timestamp: z.coerce.date(),
      }),
    )
    .optional()
    .describe("Recent conversation messages for context"),
});

export type EscalateInput = z.infer<typeof escalateInputSchema>;

/**
 * Output from escalate skill.
 */
export interface EscalateOutput {
  success: boolean;
  inquiryId?: string;
  message: string;
  estimatedResponseTime?: string;
}

/**
 * Create the escalate skill.
 * Allows users to escalate questions to compliance team for human response.
 *
 * Used when:
 * - Chatbot confidence is low (<50%)
 * - User explicitly requests human help
 * - Question involves complex policy interpretation
 *
 * The skill creates a ChatbotInquiry record that appears in the compliance
 * team's queue. The team can then assign, investigate, and respond.
 *
 * @param escalationService - Escalation service for creating inquiries
 * @returns Escalate skill definition
 */
export function escalateSkill(
  escalationService: EscalationService,
): SkillDefinition<EscalateInput, EscalateOutput> {
  return {
    id: "escalate",
    name: "Escalate to Compliance Team",
    description:
      "Create an inquiry for the compliance team to answer. Used when chatbot cannot confidently answer or user requests human assistance.",
    scope: SkillScope.PLATFORM,
    requiredPermissions: [], // Available to all users
    entityTypes: ["chatbot", "employee-chatbot"],

    inputSchema: escalateInputSchema,

    async execute(
      input: EscalateInput,
      context: SkillContext,
    ): Promise<SkillResult<EscalateOutput>> {
      try {
        const inquiry = await escalationService.createInquiry({
          organizationId: context.organizationId,
          sessionId: input.sessionId,
          conversationId: input.conversationId,
          userId: context.userId.startsWith("anonymous:")
            ? undefined
            : context.userId,
          userEmail: input.userEmail,
          question: input.question,
          conversationHistory: input.conversationHistory as
            | ConversationMessage[]
            | undefined,
        });

        return {
          success: true,
          data: {
            success: true,
            inquiryId: inquiry.id,
            message:
              "Your question has been sent to the compliance team. They will review it and respond as soon as possible.",
            estimatedResponseTime: "within 1-2 business days",
          },
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message || "Failed to create escalation",
        };
      }
    },
  };
}
