/**
 * ChatbotInquiry entity interfaces matching Prisma ChatbotInquiry model.
 * Used for tracking escalated chatbot conversations sent to compliance team.
 */

import { InquiryPriority, InquiryStatus } from "@prisma/client";

/**
 * Message in conversation history.
 * Stored as JSON in ChatbotInquiry.conversationHistory.
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * ChatbotInquiry represents an escalated conversation from the chatbot.
 * Created when chatbot cannot confidently answer and user requests human help.
 *
 * Workflow:
 * 1. User asks question chatbot can't answer (confidence < 50%)
 * 2. Chatbot offers escalation via EscalateSkill
 * 3. User accepts escalation
 * 4. Inquiry created with conversation context
 * 5. Compliance team sees inquiry in queue
 * 6. Compliance team responds (resolution stored)
 */
export interface ChatbotInquiry {
  id: string;
  organizationId: string;
  sessionId: string;
  conversationId: string | null;
  userId: string | null;
  userEmail: string | null;
  question: string;
  conversationHistory: ConversationMessage[] | null;
  category: string | null;
  priority: InquiryPriority;
  status: InquiryStatus;
  assignedToId: string | null;
  assignedAt: Date | null;
  resolvedAt: Date | null;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ChatbotInquiry with assignee details for queue display.
 */
export interface ChatbotInquiryWithAssignee extends ChatbotInquiry {
  assignedTo?: {
    id: string;
    email: string;
    name: string;
  } | null;
}

// Re-export enums from Prisma for convenience
export { InquiryPriority, InquiryStatus };
