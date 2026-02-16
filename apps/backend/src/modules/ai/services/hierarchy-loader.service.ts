import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  OrganizationContext,
  TeamContext,
  UserContext,
  EntityContext,
} from "../dto/context.dto";
import { ContextCacheService } from "./context-cache.service";

/**
 * HierarchyLoaderService loads context from database at each hierarchy level.
 *
 * Responsibilities:
 * - Load organization context with settings, categories, context files
 * - Load team context with focus area and team-level context files
 * - Load user context with role and preferences
 * - Load entity context (case, investigation, campaign)
 * - Provide fallback context when entities not found
 */
@Injectable()
export class HierarchyLoaderService {
  private readonly logger = new Logger(HierarchyLoaderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextCache: ContextCacheService,
  ) {}

  /**
   * Load organization context from database or cache.
   */
  async loadOrganizationContext(orgId: string): Promise<OrganizationContext> {
    // Check cache first
    const cached = await this.contextCache.getOrgContext(orgId);
    if (cached) return cached;

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
      // Return fallback context - allows AI to work even with "demo" org
      this.logger.warn(
        `Organization not found: ${orgId} - using fallback context`,
      );
      return this.getFallbackOrgContext(orgId);
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

    // Cache the context
    await this.contextCache.setOrgContext(orgId, context);

    return context;
  }

  /**
   * Load team context from database or cache.
   */
  async loadTeamContext(teamId: string, orgId: string): Promise<TeamContext> {
    // Check cache first
    const cached = await this.contextCache.getTeamContext(teamId);
    if (cached) return cached;

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
      // Return fallback context
      this.logger.warn(`Team not found: ${teamId} - using fallback context`);
      return this.getFallbackTeamContext(teamId);
    }

    const context: TeamContext = {
      id: team.id,
      name: team.name,
      contextFile: contextFile?.content,
      focusArea: team.description || undefined,
    };

    await this.contextCache.setTeamContext(teamId, context);

    return context;
  }

  /**
   * Load user context from database or cache.
   */
  async loadUserContext(userId: string, orgId: string): Promise<UserContext> {
    // Check cache first
    const cached = await this.contextCache.getUserContext(userId);
    if (cached) return cached;

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
      // Return fallback context - allows AI to work with "demo" user
      this.logger.warn(`User not found: ${userId} - using fallback context`);
      return this.getFallbackUserContext(userId);
    }

    const context: UserContext = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      contextFile: contextFile?.content,
    };

    await this.contextCache.setUserContext(userId, context);

    return context;
  }

  /**
   * Load entity context (case, investigation, campaign) from database or cache.
   */
  async loadEntityContext(
    entityType: string,
    entityId: string,
    orgId: string,
  ): Promise<EntityContext> {
    // Check cache first
    const cached = await this.contextCache.getEntityContext(
      entityType,
      entityId,
    );
    if (cached) return cached;

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

    await this.contextCache.setEntityContext(entityType, entityId, context);

    return context;
  }

  // Fallback context generators

  /**
   * Get fallback organization context.
   */
  getFallbackOrgContext(orgId: string): OrganizationContext {
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
   * Get fallback team context.
   */
  getFallbackTeamContext(teamId: string): TeamContext {
    return {
      id: teamId,
      name: "Unknown Team",
      contextFile: undefined,
      focusArea: undefined,
    };
  }

  /**
   * Get fallback user context.
   */
  getFallbackUserContext(userId: string): UserContext {
    return {
      id: userId,
      name: "Unknown User",
      role: "EMPLOYEE",
      preferences: undefined,
      contextFile: undefined,
    };
  }

  // Entity-specific loaders

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
}
