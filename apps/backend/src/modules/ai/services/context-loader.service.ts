import { Injectable, Logger, Inject, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LoadContextDto,
  AIContext,
  PlatformContext,
  OrganizationContext,
  TeamContext,
  UserContext,
  EntityContext,
  SaveContextFileDto,
} from "../dto/context.dto";

/**
 * ContextLoaderService assembles AI context from multiple hierarchy levels.
 *
 * Context hierarchy (broadest to most specific):
 * 1. Platform - Static, defined in code (capabilities, guidelines)
 * 2. Organization - CLAUDE.md-like context files, terminology, settings
 * 3. Team - Team-specific context (optional)
 * 4. User - User preferences and personal context
 * 5. Entity - Current case/investigation/campaign context
 *
 * Context is cached for performance with appropriate TTLs per level.
 *
 * Key features:
 * - Hierarchical context assembly for AI calls
 * - CLAUDE.md-like context files at org/team/user levels
 * - Entity-specific context loaders for case, investigation, campaign
 * - Caching with different TTLs per context level
 * - System prompt building from assembled context
 */
@Injectable()
export class ContextLoaderService implements OnModuleInit {
  private readonly logger = new Logger(ContextLoaderService.name);

  // Cache TTLs in seconds
  private readonly platformCacheTtl = 3600; // 1 hour
  private readonly orgCacheTtl = 300; // 5 minutes
  private readonly userCacheTtl = 300; // 5 minutes
  private readonly entityCacheTtl = 60; // 1 minute (entities change more often)

  // Platform context (static, loaded once)
  private platformContext: PlatformContext;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  onModuleInit() {
    this.platformContext = this.loadPlatformContext();
    this.logger.log("Platform context loaded");
  }

  /**
   * Load complete context hierarchy for an AI call.
   * Assembles context from all levels in parallel for performance.
   *
   * @param params - Context loading parameters
   * @returns Complete AIContext with all hierarchy levels
   */
  async loadContext(params: LoadContextDto): Promise<AIContext> {
    // Wrap context loading in try-catch to ensure individual failures don't crash everything
    // Each loader already returns fallback context on not-found, but this catches other errors
    let orgContext: OrganizationContext;
    let userContext: UserContext;
    let teamContext: TeamContext | null = null;
    let entityContext: EntityContext | null = null;

    try {
      [orgContext, userContext, teamContext, entityContext] = await Promise.all(
        [
          this.loadOrganizationContext(params.organizationId).catch((err) => {
            this.logger.error(
              `Failed to load org context for ${params.organizationId}: ${err.message}`,
            );
            return this.getFallbackOrgContext(params.organizationId);
          }),
          this.loadUserContext(params.userId, params.organizationId).catch(
            (err) => {
              this.logger.error(
                `Failed to load user context for ${params.userId}: ${err.message}`,
              );
              return this.getFallbackUserContext(params.userId);
            },
          ),
          params.teamId
            ? this.loadTeamContext(params.teamId, params.organizationId).catch(
                (err) => {
                  this.logger.error(
                    `Failed to load team context for ${params.teamId}: ${err.message}`,
                  );
                  return null;
                },
              )
            : null,
          params.entityType && params.entityId
            ? this.loadEntityContext(
                params.entityType,
                params.entityId,
                params.organizationId,
              ).catch((err) => {
                this.logger.error(
                  `Failed to load entity context for ${params.entityType}:${params.entityId}: ${err.message}`,
                );
                return null;
              })
            : null,
        ],
      );
    } catch (err) {
      // If even Promise.all fails somehow, use minimal fallbacks
      this.logger.error(`Context loading failed entirely: ${err}`);
      orgContext = this.getFallbackOrgContext(params.organizationId);
      userContext = this.getFallbackUserContext(params.userId);
    }

    return {
      platform: this.platformContext,
      organization: orgContext,
      team: teamContext || undefined,
      user: userContext,
      entity: entityContext || undefined,
      currentDateTime: new Date().toISOString(),
    };
  }

  /**
   * Get fallback organization context for use when loading fails.
   */
  private getFallbackOrgContext(orgId: string): OrganizationContext {
    return {
      id: orgId,
      name: "Unknown Organization",
      categories: [],
      settings: {
        aiEnabled: true,
        formalityLevel: "professional" as const,
        noteCleanupStyle: "light" as const,
        summaryDefaultLength: "standard" as const,
      },
    };
  }

  /**
   * Get fallback user context for use when loading fails.
   */
  private getFallbackUserContext(userId: string): UserContext {
    return {
      id: userId,
      name: "Unknown User",
      role: "EMPLOYEE",
      preferences: undefined,
      contextFile: undefined,
    };
  }

  /**
   * Build a complete system prompt from context and agent type.
   * Uses templates when available, falls back to base template.
   *
   * @param context - Assembled AIContext
   * @param agentType - Type of agent (investigation, case, compliance-manager)
   * @returns System prompt string for AI call
   */
  async buildSystemPrompt(
    context: AIContext,
    agentType: string,
  ): Promise<string> {
    // Build system prompt from context
    // This is a basic implementation - can be enhanced with PromptService templates later
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
   * Save a context file for organization, team, or user.
   * Upserts existing files with same name.
   *
   * @param params - Context file save parameters
   * @returns Created/updated context file ID
   */
  async saveContextFile(params: SaveContextFileDto): Promise<{ id: string }> {
    // Determine scope
    const scope = params.userId ? "user" : params.teamId ? "team" : "org";

    // Upsert the context file
    const existing = await this.prisma.aiContextFile.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId || null,
        name: params.name,
      },
    });

    let contextFile;
    if (existing) {
      contextFile = await this.prisma.aiContextFile.update({
        where: { id: existing.id },
        data: {
          content: params.content,
          description: params.description,
          scope,
          teamId: params.teamId,
        },
      });
      this.logger.debug(`Updated context file ${contextFile.id}`);
    } else {
      contextFile = await this.prisma.aiContextFile.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          name: params.name,
          content: params.content,
          description: params.description,
          scope,
          teamId: params.teamId,
        },
      });
      this.logger.debug(`Created context file ${contextFile.id}`);
    }

    // Invalidate cache
    const cacheKey = params.userId
      ? `ai:context:user:${params.userId}`
      : params.teamId
        ? `ai:context:team:${params.teamId}`
        : `ai:context:org:${params.organizationId}`;
    await this.cacheManager.del(cacheKey);

    return { id: contextFile.id };
  }

  /**
   * Get context file for editing.
   *
   * @param params - Context file query parameters
   * @returns Context file data or null if not found
   */
  async getContextFile(params: {
    organizationId: string;
    userId?: string;
    name: string;
  }): Promise<{ id: string; content: string; description?: string } | null> {
    const file = await this.prisma.aiContextFile.findFirst({
      where: {
        organizationId: params.organizationId,
        userId: params.userId || null,
        name: params.name,
        isActive: true,
      },
    });

    if (!file) return null;

    return {
      id: file.id,
      content: file.content,
      description: file.description || undefined,
    };
  }

  /**
   * List context files for an organization.
   *
   * @param params - Query parameters
   * @returns List of context files
   */
  async listContextFiles(params: {
    organizationId: string;
    scope?: string;
    userId?: string;
    teamId?: string;
  }): Promise<
    Array<{
      id: string;
      name: string;
      scope: string;
      description?: string;
      updatedAt: Date;
    }>
  > {
    const files = await this.prisma.aiContextFile.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.scope && { scope: params.scope }),
        ...(params.userId && { userId: params.userId }),
        ...(params.teamId && { teamId: params.teamId }),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        scope: true,
        description: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    return files.map((f) => ({
      id: f.id,
      name: f.name,
      scope: f.scope,
      description: f.description || undefined,
      updatedAt: f.updatedAt,
    }));
  }

  /**
   * Delete a context file (soft delete - sets isActive to false).
   */
  async deleteContextFile(
    id: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await this.prisma.aiContextFile.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });

    return result.count > 0;
  }

  /**
   * Invalidate cached context for an organization, team, or user.
   * Call this when context-affecting data changes.
   */
  async invalidateCache(params: {
    organizationId?: string;
    teamId?: string;
    userId?: string;
  }): Promise<void> {
    if (params.userId) {
      await this.cacheManager.del(`ai:context:user:${params.userId}`);
    }
    if (params.teamId) {
      await this.cacheManager.del(`ai:context:team:${params.teamId}`);
    }
    if (params.organizationId) {
      await this.cacheManager.del(`ai:context:org:${params.organizationId}`);
    }
  }

  // =========================================================================
  // Private Methods - Context Loading
  // =========================================================================

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

  private async loadOrganizationContext(
    orgId: string,
  ): Promise<OrganizationContext> {
    const cacheKey = `ai:context:org:${orgId}`;

    // Check cache
    const cached = await this.cacheManager.get<OrganizationContext>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for org context ${orgId}`);
      return cached;
    }

    // Load from database
    const [org, contextFile, categories] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          settings: true,
        },
      }),
      this.prisma.aiContextFile.findFirst({
        where: {
          organizationId: orgId,
          userId: null,
          scope: "org",
          isActive: true,
        },
      }),
      this.prisma.category
        .findMany({
          where: { organizationId: orgId, isActive: true },
          select: { id: true, name: true, path: true },
          take: 100,
        })
        .then(
          (cats) =>
            cats.map((c) => ({
              id: c.id,
              name: c.name,
              path: c.path ?? undefined,
            })) as Array<{ id: string; name: string; path?: string }>,
        ),
    ]);

    if (!org) {
      // Return fallback context instead of throwing - allows AI to work even with "demo" org
      this.logger.warn(
        `Organization not found: ${orgId} - using fallback context`,
      );
      return {
        id: orgId,
        name: "Unknown Organization",
        categories: [],
        settings: {
          aiEnabled: true,
          formalityLevel: "professional" as const,
          noteCleanupStyle: "light" as const,
          summaryDefaultLength: "standard" as const,
        },
      };
    }

    const settings = org.settings as Record<string, unknown> | null;

    const context: OrganizationContext = {
      id: org.id,
      name: org.name,
      contextFile: contextFile?.content,
      terminology:
        (settings?.terminology as Record<string, string>) || undefined,
      categories,
      settings: {
        aiEnabled: (settings?.aiEnabled as boolean) ?? true,
        formalityLevel:
          (settings?.formalityLevel as "casual" | "professional" | "formal") ||
          "professional",
        noteCleanupStyle:
          (settings?.noteCleanupStyle as "light" | "full") || "light",
        summaryDefaultLength:
          (settings?.summaryDefaultLength as
            | "brief"
            | "standard"
            | "detailed") || "standard",
      },
    };

    // Cache
    await this.cacheManager.set(cacheKey, context, this.orgCacheTtl * 1000);
    this.logger.debug(`Cached org context for ${orgId}`);

    return context;
  }

  private async loadTeamContext(
    teamId: string,
    orgId: string,
  ): Promise<TeamContext> {
    const cacheKey = `ai:context:team:${teamId}`;

    const cached = await this.cacheManager.get<TeamContext>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for team context ${teamId}`);
      return cached;
    }

    const [team, contextFile] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, name: true, description: true },
      }),
      this.prisma.aiContextFile.findFirst({
        where: {
          organizationId: orgId,
          teamId,
          scope: "team",
          isActive: true,
        },
      }),
    ]);

    if (!team) {
      // Return fallback context instead of throwing
      this.logger.warn(`Team not found: ${teamId} - using fallback context`);
      return {
        id: teamId,
        name: "Unknown Team",
        contextFile: undefined,
        focusArea: undefined,
      };
    }

    const context: TeamContext = {
      id: team.id,
      name: team.name,
      contextFile: contextFile?.content,
      focusArea: team.description || undefined,
    };

    await this.cacheManager.set(cacheKey, context, this.orgCacheTtl * 1000);
    this.logger.debug(`Cached team context for ${teamId}`);

    return context;
  }

  private async loadUserContext(
    userId: string,
    orgId: string,
  ): Promise<UserContext> {
    const cacheKey = `ai:context:user:${userId}`;

    const cached = await this.cacheManager.get<UserContext>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user context ${userId}`);
      return cached;
    }

    const [user, contextFile] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      }),
      this.prisma.aiContextFile.findFirst({
        where: {
          organizationId: orgId,
          userId,
          scope: "user",
          isActive: true,
        },
      }),
    ]);

    if (!user) {
      // Return fallback context instead of throwing - allows AI to work with "demo" user
      this.logger.warn(`User not found: ${userId} - using fallback context`);
      return {
        id: userId,
        name: "Unknown User",
        role: "EMPLOYEE",
        preferences: undefined,
        contextFile: undefined,
      };
    }

    const context: UserContext = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      contextFile: contextFile?.content,
    };

    await this.cacheManager.set(cacheKey, context, this.userCacheTtl * 1000);
    this.logger.debug(`Cached user context for ${userId}`);

    return context;
  }

  private async loadEntityContext(
    entityType: string,
    entityId: string,
    orgId: string,
  ): Promise<EntityContext> {
    const cacheKey = `ai:context:entity:${entityType}:${entityId}`;

    const cached = await this.cacheManager.get<EntityContext>(cacheKey);
    if (cached) {
      this.logger.debug(
        `Cache hit for entity context ${entityType}:${entityId}`,
      );
      return cached;
    }

    let context: EntityContext;

    switch (entityType) {
      case "case":
        context = await this.loadCaseContext(entityId, orgId);
        break;
      case "investigation":
        context = await this.loadInvestigationContext(entityId, orgId);
        break;
      case "campaign":
        context = await this.loadCampaignContext(entityId, orgId);
        break;
      default:
        context = { type: entityType, id: entityId };
    }

    await this.cacheManager.set(cacheKey, context, this.entityCacheTtl * 1000);
    this.logger.debug(`Cached entity context for ${entityType}:${entityId}`);

    return context;
  }

  private async loadCaseContext(
    caseId: string,
    orgId: string,
  ): Promise<EntityContext> {
    const caseData = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId: orgId },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        caseType: true,
        severity: true,
        summary: true,
        createdAt: true,
        primaryCategory: { select: { name: true } },
      },
    });

    if (!caseData) {
      return { type: "case", id: caseId };
    }

    return {
      type: "case",
      id: caseData.id,
      referenceNumber: caseData.referenceNumber,
      status: caseData.status,
      caseType: caseData.caseType,
      category: caseData.primaryCategory?.name,
      priority: caseData.severity || undefined,
      summary: caseData.summary || undefined,
      createdAt: caseData.createdAt,
    };
  }

  private async loadInvestigationContext(
    investigationId: string,
    orgId: string,
  ): Promise<EntityContext> {
    const investigation = await this.prisma.investigation.findFirst({
      where: { id: investigationId, organizationId: orgId },
      select: {
        id: true,
        investigationNumber: true,
        status: true,
        slaStatus: true,
        findingsSummary: true,
        createdAt: true,
        case: {
          select: {
            id: true,
            referenceNumber: true,
            primaryCategory: { select: { name: true } },
          },
        },
        primaryInvestigator: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!investigation) {
      return { type: "investigation", id: investigationId };
    }

    // Build reference number from case reference + investigation number
    const referenceNumber = investigation.case
      ? `${investigation.case.referenceNumber}-INV${investigation.investigationNumber}`
      : `INV-${investigation.investigationNumber}`;

    return {
      type: "investigation",
      id: investigation.id,
      referenceNumber,
      status: investigation.status,
      priority: investigation.slaStatus || undefined,
      summary: investigation.findingsSummary || undefined,
      createdAt: investigation.createdAt,
      category: investigation.case?.primaryCategory?.name,
      caseId: investigation.case?.id,
      caseNumber: investigation.case?.referenceNumber,
      assignedTo: investigation.primaryInvestigator
        ? `${investigation.primaryInvestigator.firstName} ${investigation.primaryInvestigator.lastName}`
        : undefined,
    };
  }

  private async loadCampaignContext(
    campaignId: string,
    orgId: string,
  ): Promise<EntityContext> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        createdAt: true,
        launchAt: true,
        dueDate: true,
        totalAssignments: true,
        completedAssignments: true,
      },
    });

    if (!campaign) {
      return { type: "campaign", id: campaignId };
    }

    return {
      type: "campaign",
      id: campaign.id,
      referenceNumber: campaign.name,
      status: campaign.status,
      campaignType: campaign.type,
      createdAt: campaign.createdAt,
      launchDate: campaign.launchAt,
      dueDate: campaign.dueDate,
      totalAssignments: campaign.totalAssignments,
      completedAssignments: campaign.completedAssignments,
      completionRate:
        campaign.totalAssignments > 0
          ? Math.round(
              (campaign.completedAssignments / campaign.totalAssignments) * 100,
            )
          : 0,
    };
  }

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
