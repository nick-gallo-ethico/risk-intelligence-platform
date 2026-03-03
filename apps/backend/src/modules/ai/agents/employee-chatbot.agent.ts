import { BaseAgent, AgentConfig, AgentContext } from "./base.agent";
import { ProviderRegistryService } from "../services/provider-registry.service";
import { ContextLoaderService } from "../services/context-loader.service";
import { ConversationService } from "../services/conversation.service";
import { SkillRegistry } from "../skills/skill.registry";
import { AiRateLimiterService } from "../services/rate-limiter.service";
import { ActionCatalog } from "../actions/action.catalog";
import { ActionExecutorService } from "../actions/action-executor.service";

/**
 * Agent configuration for employee chatbot.
 * Provides policy Q&A, case status checks, disclosure guidance, and escalation.
 */
const CHATBOT_AGENT_CONFIG: AgentConfig = {
  id: "employee-chatbot",
  name: "Employee Portal Assistant",
  description:
    "AI assistant for policy questions, case status checks, disclosure guidance, and compliance inquiries.",
  entityTypes: ["chatbot"], // Virtual entity type for chatbot context
  defaultSkills: [
    "faq-match", // Priority 1: Curated FAQ answers (44-04)
    "policy-search", // Priority 2: RAG-based policy search (44-04)
    "case-status", // Access code lookup (44-06)
    "disclosure-guide", // Disclosure form guidance
  ],
  systemPromptTemplate: "employee-chatbot",
};

/**
 * EmployeeChatbotAgent is specialized for employee self-service interactions.
 *
 * Capabilities:
 * - Answer policy questions with citations
 * - Check case status via anonymous access code
 * - Guide users through disclosure forms
 * - Escalate complex inquiries to compliance team
 *
 * Confidence tiers:
 * - HIGH (>85%): Direct answer with source citation
 * - MEDIUM (50-85%): Answer with clarifying questions
 * - LOW (<50%): Offer escalation to compliance team
 *
 * This agent operates in two modes:
 * - Anonymous (Ethics Portal): Limited context, session-based tracking
 * - Authenticated (Employee Portal): Full user context and preferences
 */
export class EmployeeChatbotAgent extends BaseAgent {
  constructor(
    providerRegistry: ProviderRegistryService,
    contextLoader: ContextLoaderService,
    conversationService: ConversationService,
    skillRegistry: SkillRegistry,
    rateLimiter: AiRateLimiterService,
    actionCatalog?: ActionCatalog,
    actionExecutor?: ActionExecutorService,
  ) {
    super(
      CHATBOT_AGENT_CONFIG,
      providerRegistry,
      contextLoader,
      conversationService,
      skillRegistry,
      rateLimiter,
      actionCatalog, // Chatbot doesn't execute actions but accepts for registry consistency
      actionExecutor,
    );
  }

  /**
   * Get context-aware suggested prompts for the chatbot.
   * Prompts vary based on anonymous vs authenticated context.
   *
   * @param context - Agent context
   * @returns Array of suggested prompt strings
   */
  getSuggestedPrompts(context: AgentContext): string[] {
    const basePrompts: string[] = [
      "What is the gift policy limit?",
      "Do I need to disclose a conflict of interest?",
      "How do I submit an ethics report?",
      "What is our anti-harassment policy?",
    ];

    // Anonymous users (from Ethics Portal)
    if (context.userRole === "ANONYMOUS") {
      return [
        ...basePrompts,
        "Check the status of my report",
        "How do I contact the ethics team?",
      ];
    }

    // Authenticated users get personalized prompts
    return [
      ...basePrompts,
      "What disclosures do I need to complete?",
      "Show me my pending attestations",
      "Talk to the compliance team",
    ];
  }

  /**
   * Get additional skills specific to chatbot operations.
   * These supplement the defaultSkills defined in config.
   */
  protected getAdditionalSkills(): string[] {
    return [
      // Skills that may be added in future phases
      // 'attestation-status',
      // 'policy-translation',
    ];
  }

  /**
   * Override initialize to handle anonymous sessions.
   * Anonymous users don't have a userId, so we use sessionId instead.
   */
  async initialize(context: AgentContext): Promise<void> {
    // For anonymous users, userId will be in format 'anonymous:{sessionId}'
    // This is handled by ChatbotGateway before reaching the agent
    await super.initialize(context);
  }
}
