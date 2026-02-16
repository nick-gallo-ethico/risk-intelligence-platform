import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AIContext, PlatformContext } from "../dto/context.dto";

/**
 * PromptBuilderService assembles system prompts from AI context.
 *
 * Responsibilities:
 * - Load static platform context (capabilities, guidelines)
 * - Build system prompts from assembled context
 * - Provide agent-specific instructions
 * - Format context sections for Claude API
 */
@Injectable()
export class PromptBuilderService implements OnModuleInit {
  private readonly logger = new Logger(PromptBuilderService.name);

  // Platform context (static, loaded once)
  private platformContext: PlatformContext;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.platformContext = this.loadPlatformContext();
    this.logger.log("Platform context loaded");
  }

  /**
   * Get the static platform context.
   */
  getPlatformContext(): PlatformContext {
    return this.platformContext;
  }

  /**
   * Build a complete system prompt from context and agent type.
   * Uses templates when available, falls back to base template.
   */
  async buildSystemPrompt(
    context: AIContext,
    agentType: string,
  ): Promise<string> {
    const sections: string[] = [];

    // Platform guidelines
    sections.push(`# ${context.platform.name}`);
    sections.push(`Version: ${context.platform.version}`);
    sections.push("");
    sections.push("## Capabilities");
    sections.push(
      context.platform.capabilities.map((c) => `- ${c}`).join("\n"),
    );
    sections.push("");
    sections.push("## Guidelines");
    sections.push(context.platform.guidelines);

    // Organization context
    sections.push("");
    sections.push(`## Organization: ${context.organization.name}`);

    if (context.organization.contextFile) {
      sections.push("");
      sections.push("### Organization Context");
      sections.push(context.organization.contextFile);
    }

    if (
      context.organization.terminology &&
      Object.keys(context.organization.terminology).length > 0
    ) {
      sections.push("");
      sections.push("### Terminology");
      for (const [term, definition] of Object.entries(
        context.organization.terminology,
      )) {
        sections.push(`- **${term}**: ${definition}`);
      }
    }

    if (context.organization.settings) {
      sections.push("");
      sections.push("### AI Settings");
      sections.push(
        `- Formality: ${context.organization.settings.formalityLevel}`,
      );
      sections.push(
        `- Note Cleanup Style: ${context.organization.settings.noteCleanupStyle}`,
      );
      sections.push(
        `- Summary Length: ${context.organization.settings.summaryDefaultLength}`,
      );
    }

    // Team context
    if (context.team) {
      sections.push("");
      sections.push(`## Team: ${context.team.name}`);
      if (context.team.focusArea) {
        sections.push(`Focus Area: ${context.team.focusArea}`);
      }
      if (context.team.contextFile) {
        sections.push("");
        sections.push(context.team.contextFile);
      }
    }

    // User context
    sections.push("");
    sections.push(`## Current User: ${context.user.name}`);
    sections.push(`Role: ${context.user.role}`);

    if (context.user.preferences) {
      const prefs = context.user.preferences;
      if (prefs.formalityLevel) {
        sections.push(`Preferred Formality: ${prefs.formalityLevel}`);
      }
      if (prefs.responseLength) {
        sections.push(`Preferred Response Length: ${prefs.responseLength}`);
      }
    }

    if (context.user.contextFile) {
      sections.push("");
      sections.push("### User Context");
      sections.push(context.user.contextFile);
    }

    // Entity context
    if (context.entity) {
      sections.push("");
      sections.push(`## Current ${context.entity.type.toUpperCase()}`);

      if (context.entity.referenceNumber) {
        sections.push(`Reference: ${context.entity.referenceNumber}`);
      }
      if (context.entity.status) {
        sections.push(`Status: ${context.entity.status}`);
      }
      if (context.entity.category) {
        sections.push(`Category: ${context.entity.category}`);
      }
      if (context.entity.priority) {
        sections.push(`Priority: ${context.entity.priority}`);
      }
      if (context.entity.assignedTo) {
        sections.push(`Assigned To: ${context.entity.assignedTo}`);
      }
      if (context.entity.summary) {
        sections.push("");
        sections.push("### Summary");
        sections.push(context.entity.summary);
      }
    }

    // Agent-specific instructions
    sections.push("");
    sections.push(`## Agent Type: ${agentType}`);
    sections.push(this.getAgentInstructions(agentType));

    // Current time
    sections.push("");
    sections.push(`Current Date/Time: ${context.currentDateTime}`);

    return sections.join("\n");
  }

  /**
   * Load static platform context.
   */
  private loadPlatformContext(): PlatformContext {
    return {
      name: "Ethico Risk Intelligence Platform",
      version: this.configService.get("APP_VERSION", "1.0.0"),
      capabilities: [
        "Case and Investigation Management",
        "Compliance Reporting",
        "Risk Assessment",
        "Policy Management",
        "Disclosure Campaigns",
        "Anonymous Reporting",
        "Document Analysis",
        "Timeline Reconstruction",
        "Pattern Detection",
      ],
      guidelines: `
You are an AI assistant for compliance and ethics management. Your role is to:
- Help compliance officers investigate reports efficiently
- Maintain confidentiality of all case information
- Provide accurate, well-sourced information
- Flag sensitive content appropriately
- Never make final determinations - support human decision-making
- Follow professional compliance documentation standards
- Use clear, professional language appropriate for legal and HR contexts
- Cite sources when referencing specific information from cases or documents
      `.trim(),
    };
  }

  /**
   * Get agent-specific instructions.
   */
  private getAgentInstructions(agentType: string): string {
    switch (agentType) {
      case "investigation":
        return `
As an Investigation Agent, you specialize in:
- Summarizing investigation findings and timelines
- Cleaning up interview notes and call recordings
- Suggesting interview questions based on case details
- Drafting communications to witnesses and subjects
- Identifying patterns across related cases
- Assessing risk levels and recommending next steps
        `.trim();

      case "case":
        return `
As a Case Agent, you specialize in:
- Summarizing case intake information
- Categorizing reports by type and severity
- Identifying key parties and relationships
- Tracking case status and SLA compliance
- Generating case briefings for stakeholders
- Recommending case routing and assignment
        `.trim();

      case "compliance-manager":
        return `
As a Compliance Manager Agent, you specialize in:
- Organization-wide compliance trend analysis
- Cross-case pattern detection
- Policy violation tracking
- Risk heat map generation
- Regulatory compliance monitoring
- Board reporting preparation
        `.trim();

      case "campaign":
        return `
As a Campaign Agent, you specialize in:
- Disclosure campaign progress tracking
- Attestation compliance monitoring
- Employee communication drafting
- Escalation recommendations
- Response analysis and flagging
- Campaign effectiveness reporting
        `.trim();

      default:
        return `
You are a general compliance assistant. Help the user with their compliance-related questions and tasks.
        `.trim();
    }
  }
}
