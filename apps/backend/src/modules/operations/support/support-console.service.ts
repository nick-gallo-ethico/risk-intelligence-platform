/**
 * SupportConsoleService
 *
 * Provides debug access for support staff via impersonation.
 * All operations require active impersonation session per CONTEXT.md.
 *
 * FEATURES:
 * - Tenant search by name, domain, or ID
 * - Error log viewing with filtering
 * - Tenant configuration inspection
 * - Job queue status monitoring
 * - Search index status checking
 *
 * SECURITY MODEL:
 * - All tenant-specific operations require active impersonation
 * - All actions are logged via impersonation audit trail
 * - Read-only access (no mutations to tenant data)
 *
 * @see CONTEXT.md for Support team requirements
 * @see impersonation.service.ts for session management
 */

import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AuditActionCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ImpersonationService } from "../impersonation/impersonation.service";
import {
  TenantSearchDto,
  ErrorLogFiltersDto,
  JobQueueStatusResponse,
  SearchIndexStatusResponse,
} from "./dto/support.dto";

/**
 * Support action types for audit logging
 */
const SupportActions = {
  VIEW_TENANT_DETAILS: "VIEW_TENANT_DETAILS",
  VIEW_ERROR_LOGS: "VIEW_ERROR_LOGS",
  VIEW_CONFIG: "VIEW_CONFIG",
  VIEW_JOB_QUEUES: "VIEW_JOB_QUEUES",
  VIEW_SEARCH_INDEX: "VIEW_SEARCH_INDEX",
} as const;

/**
 * Response for tenant search
 */
export interface TenantSearchResult {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  _count: {
    users: number;
    cases: number;
  };
}

/**
 * Response for tenant configuration
 */
export interface TenantConfigResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    settings: unknown;
    defaultLanguage: string;
  } | null;
  ssoConfig: {
    id: string;
    ssoProvider: string | null;
    ssoEnabled: boolean;
    jitProvisioningEnabled: boolean;
  } | null;
  featureFlags: Array<{
    id: string;
    featureKey: string;
    usageCount: number;
    lastUsedAt: Date;
  }>;
  domains: Array<{
    id: string;
    domain: string;
    verified: boolean;
  }>;
}

@Injectable()
export class SupportConsoleService {
  private readonly logger = new Logger(SupportConsoleService.name);

  /** Reference to current impersonation context from request */
  private currentSessionId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly impersonationService: ImpersonationService,
  ) {}

  /**
   * Set the current session ID for logging.
   * Called by controller before service operations.
   *
   * @param sessionId - Active impersonation session ID
   */
  setSessionContext(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  /**
   * Search for tenants by name, domain, or ID.
   *
   * This is a cross-tenant operation that does NOT require impersonation.
   * Used to find which tenant to impersonate.
   *
   * @param dto - Search criteria
   * @returns List of matching tenants
   */
  async searchTenants(dto: TenantSearchDto): Promise<TenantSearchResult[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (dto.query) {
      where.OR = [
        { name: { contains: dto.query, mode: "insensitive" } },
        { slug: { contains: dto.query, mode: "insensitive" } },
        { id: dto.query },
      ];
    }

    // Filter by isActive if status is provided (status maps to isActive boolean)
    if (dto.status === "active") {
      where.isActive = true;
    } else if (dto.status === "inactive") {
      where.isActive = false;
    }

    const tenants = await this.prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        _count: { select: { users: true, cases: true } },
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    this.logger.debug(
      `Tenant search for "${dto.query}" returned ${tenants.length} results`,
    );

    return tenants;
  }

  /**
   * Get detailed tenant information.
   *
   * Requires active impersonation for the target organization.
   *
   * @param organizationId - Target organization ID
   * @returns Detailed tenant information
   */
  async getTenantDetails(organizationId: string) {
    await this.ensureImpersonating(organizationId);
    await this.logSupportAction(
      SupportActions.VIEW_TENANT_DETAILS,
      "Organization",
      organizationId,
    );

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            cases: true,
            rius: true,
            policies: true,
            campaigns: true,
          },
        },
        tenantSsoConfig: true,
      },
    });

    if (!org) {
      throw new NotFoundException("Organization not found");
    }

    return org;
  }

  /**
   * Get error logs for a tenant.
   *
   * Queries audit logs for debugging. Uses SECURITY category for error-related events.
   * Requires active impersonation.
   *
   * @param organizationId - Target organization ID
   * @param filters - Date range and level filters
   * @returns Audit log entries
   */
  async getErrorLogs(organizationId: string, filters: ErrorLogFiltersDto) {
    await this.ensureImpersonating(organizationId);
    await this.logSupportAction(
      SupportActions.VIEW_ERROR_LOGS,
      "Organization",
      organizationId,
    );

    // Build date filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateFilter: any = {};
    if (filters.startDate) {
      dateFilter.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      dateFilter.lte = new Date(filters.endDate);
    }

    // Map level to AuditActionCategory
    // error -> SECURITY (security events often indicate errors)
    // warn -> SYSTEM (system automated actions)
    // info -> ACCESS (view/access events)
    let actionCategory: AuditActionCategory | undefined;
    if (filters.level === "error") {
      actionCategory = AuditActionCategory.SECURITY;
    } else if (filters.level === "warn") {
      actionCategory = AuditActionCategory.SYSTEM;
    } else if (filters.level === "info") {
      actionCategory = AuditActionCategory.ACCESS;
    }

    // Use audit log to show activity
    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(actionCategory && { actionCategory }),
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit || 100,
    });

    this.logger.debug(
      `Retrieved ${logs.length} logs for org ${organizationId}`,
    );

    return logs;
  }

  /**
   * Get tenant configuration for debugging.
   *
   * Returns SSO config, settings, feature adoption, and verified domains.
   *
   * @param organizationId - Target organization ID
   * @returns Configuration details
   */
  async getTenantConfig(
    organizationId: string,
  ): Promise<TenantConfigResponse> {
    await this.ensureImpersonating(organizationId);
    await this.logSupportAction(
      SupportActions.VIEW_CONFIG,
      "Organization",
      organizationId,
    );

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        tenantSsoConfig: true,
      },
    });

    // Get feature adoption data
    const featureFlags = await this.prisma.featureAdoption.findMany({
      where: { organizationId },
      select: {
        id: true,
        featureKey: true,
        usageCount: true,
        lastUsedAt: true,
      },
    });

    // Get verified domains
    const domains = await this.prisma.tenantDomain.findMany({
      where: { organizationId },
      select: {
        id: true,
        domain: true,
        verified: true,
      },
    });

    this.logger.debug(`Retrieved config for org ${organizationId}`);

    return {
      organization: org
        ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
            isActive: org.isActive,
            settings: org.settings,
            defaultLanguage: org.defaultLanguage,
          }
        : null,
      ssoConfig: org?.tenantSsoConfig
        ? {
            id: org.tenantSsoConfig.id,
            ssoProvider: org.tenantSsoConfig.ssoProvider,
            ssoEnabled: org.tenantSsoConfig.ssoEnabled,
            jitProvisioningEnabled: org.tenantSsoConfig.jitProvisioningEnabled,
          }
        : null,
      featureFlags,
      domains,
    };
  }

  /**
   * Get job queue status for a tenant.
   *
   * Shows pending/processing jobs across various queues.
   *
   * @param organizationId - Target organization ID
   * @returns Job queue status
   */
  async getJobQueueStatus(
    organizationId: string,
  ): Promise<JobQueueStatusResponse> {
    await this.ensureImpersonating(organizationId);
    await this.logSupportAction(
      SupportActions.VIEW_JOB_QUEUES,
      "Organization",
      organizationId,
    );

    // Get pending export jobs
    const pendingExports = await this.prisma.exportJob.findMany({
      where: {
        organizationId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get pending migration jobs (use correct enum values)
    const pendingMigrations = await this.prisma.migrationJob.findMany({
      where: {
        organizationId,
        status: { in: ["PENDING", "VALIDATING", "MAPPING", "IMPORTING"] },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    this.logger.debug(
      `Job queue status: ${pendingExports.length} exports, ${pendingMigrations.length} migrations`,
    );

    return {
      exports: pendingExports,
      migrations: pendingMigrations,
    };
  }

  /**
   * Get search index status for a tenant.
   *
   * Compares database counts vs Elasticsearch counts to detect sync issues.
   *
   * @param organizationId - Target organization ID
   * @returns Index status comparison
   */
  async getSearchIndexStatus(
    organizationId: string,
  ): Promise<SearchIndexStatusResponse> {
    await this.ensureImpersonating(organizationId);
    await this.logSupportAction(
      SupportActions.VIEW_SEARCH_INDEX,
      "Organization",
      organizationId,
    );

    // Get database counts
    const [dbCases, dbRius] = await Promise.all([
      this.prisma.case.count({ where: { organizationId } }),
      this.prisma.riskIntelligenceUnit.count({ where: { organizationId } }),
    ]);

    // ES counts would come from SearchService injection
    // For now, return N/A - actual implementation would query Elasticsearch
    this.logger.debug(
      `Search index status: DB has ${dbCases} cases, ${dbRius} RIUs`,
    );

    return {
      database: { cases: dbCases, rius: dbRius },
      elasticsearch: { cases: "N/A", rius: "N/A" }, // Would query ES service
      lastIndexed: null, // Would track from indexing service
    };
  }

  /**
   * Ensure the operator is actively impersonating the target organization.
   *
   * @param organizationId - Expected target organization
   * @throws ForbiddenException if not impersonating or wrong target
   */
  private async ensureImpersonating(organizationId: string): Promise<void> {
    if (!this.currentSessionId) {
      throw new ForbiddenException(
        "Must be impersonating target organization (no session)",
      );
    }

    const ctx =
      await this.impersonationService.validateSession(this.currentSessionId);

    if (!ctx) {
      throw new ForbiddenException(
        "Must be impersonating target organization (invalid session)",
      );
    }

    if (ctx.targetOrganizationId !== organizationId) {
      throw new ForbiddenException(
        `Must be impersonating target organization (impersonating ${ctx.targetOrganizationId}, requested ${organizationId})`,
      );
    }
  }

  /**
   * Log a support action via impersonation audit.
   *
   * @param action - Action type
   * @param entityType - Entity type affected
   * @param entityId - Entity ID affected
   */
  private async logSupportAction(
    action: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    if (!this.currentSessionId) {
      this.logger.warn(`Support action ${action} not logged - no session`);
      return;
    }

    await this.impersonationService.logAction(
      this.currentSessionId,
      action,
      entityType,
      entityId,
    );
  }
}
