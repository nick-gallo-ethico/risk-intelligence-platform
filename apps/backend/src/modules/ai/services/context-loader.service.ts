import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LoadContextDto,
  AIContext,
  OrganizationContext,
  UserContext,
  SaveContextFileDto,
} from "../dto/context.dto";
import { ContextCacheService } from "./context-cache.service";
import { HierarchyLoaderService } from "./hierarchy-loader.service";
import { PromptBuilderService } from "./prompt-builder.service";

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
 * Architecture:
 * This is a thin coordinator service that delegates to focused sub-services:
 * - ContextCacheService: Cache operations for each context level
 * - HierarchyLoaderService: Database loading for org/team/user/entity context
 * - PromptBuilderService: System prompt assembly from context
 *
 * Key features:
 * - Hierarchical context assembly for AI calls
 * - CLAUDE.md-like context files at org/team/user levels
 * - Entity-specific context loaders for case, investigation, campaign
 * - Caching with different TTLs per context level
 * - System prompt building from assembled context
 */
@Injectable()
export class ContextLoaderService {
  private readonly logger = new Logger(ContextLoaderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextCache: ContextCacheService,
    private readonly hierarchyLoader: HierarchyLoaderService,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  /**
   * Load complete context hierarchy for an AI call.
   * Assembles context from all levels in parallel for performance.
   */
  async loadContext(params: LoadContextDto): Promise<AIContext> {
    let orgContext: OrganizationContext;
    let userContext: UserContext;
    let teamContext = null;
    let entityContext = null;

    try {
      [orgContext, userContext, teamContext, entityContext] = await Promise.all(
        [
          this.hierarchyLoader
            .loadOrganizationContext(params.organizationId)
            .catch((err) => {
              this.logger.error(
                `Failed to load org context for ${params.organizationId}: ${err.message}`,
              );
              return this.hierarchyLoader.getFallbackOrgContext(
                params.organizationId,
              );
            }),
          this.hierarchyLoader
            .loadUserContext(params.userId, params.organizationId)
            .catch((err) => {
              this.logger.error(
                `Failed to load user context for ${params.userId}: ${err.message}`,
              );
              return this.hierarchyLoader.getFallbackUserContext(params.userId);
            }),
          params.teamId
            ? this.hierarchyLoader
                .loadTeamContext(params.teamId, params.organizationId)
                .catch((err) => {
                  this.logger.error(
                    `Failed to load team context for ${params.teamId}: ${err.message}`,
                  );
                  return null;
                })
            : null,
          params.entityType && params.entityId
            ? this.hierarchyLoader
                .loadEntityContext(
                  params.entityType,
                  params.entityId,
                  params.organizationId,
                )
                .catch((err) => {
                  this.logger.error(
                    `Failed to load entity context for ${params.entityType}:${params.entityId}: ${err.message}`,
                  );
                  return null;
                })
            : null,
        ],
      );
    } catch (err) {
      // If even Promise.all fails, use minimal fallbacks
      this.logger.error(`Context loading failed entirely: ${err}`);
      orgContext = this.hierarchyLoader.getFallbackOrgContext(
        params.organizationId,
      );
      userContext = this.hierarchyLoader.getFallbackUserContext(params.userId);
    }

    return {
      platform: this.promptBuilder.getPlatformContext(),
      organization: orgContext,
      team: teamContext || undefined,
      user: userContext,
      entity: entityContext || undefined,
      currentDateTime: new Date().toISOString(),
    };
  }

  /**
   * Build a complete system prompt from context and agent type.
   */
  async buildSystemPrompt(
    context: AIContext,
    agentType: string,
  ): Promise<string> {
    return this.promptBuilder.buildSystemPrompt(context, agentType);
  }

  /**
   * Save a context file for organization, team, or user.
   * Upserts existing files with same name.
   */
  async saveContextFile(params: SaveContextFileDto): Promise<{ id: string }> {
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
    await this.contextCache.invalidate({
      organizationId: params.organizationId,
      teamId: params.teamId,
      userId: params.userId,
    });

    return { id: contextFile.id };
  }

  /**
   * Get context file for editing.
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
   */
  async invalidateCache(params: {
    organizationId?: string;
    teamId?: string;
    userId?: string;
  }): Promise<void> {
    await this.contextCache.invalidate(params);
  }
}
