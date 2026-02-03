import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";

/**
 * Permission context for search queries.
 * Extracted from JWT/session.
 */
export interface PermissionContext {
  userId: string;
  organizationId: string;
  role: UserRole;
}

/**
 * PermissionFilterService builds Elasticsearch filter clauses based on user permissions.
 *
 * CRITICAL for security: Permission filters are injected at query time.
 * This ensures users can only see results they're authorized to access.
 *
 * Per CONTEXT.md:
 * - Search permissions filtered at query time (non-negotiable)
 * - Permission filters injected into ES query
 * - Only authorized results returned
 * - Counts reflect authorized results only
 */
@Injectable()
export class PermissionFilterService {
  private readonly logger = new Logger(PermissionFilterService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Build Elasticsearch filter clauses based on user permissions.
   *
   * Returns an array of ES filter clauses to add to the query.
   * Empty array means no additional filtering (full access).
   */
  async buildPermissionFilter(
    ctx: PermissionContext,
    entityType: string,
  ): Promise<Array<Record<string, unknown>>> {
    const filters: Array<Record<string, unknown>> = [];

    // System admins and compliance officers see everything in their org
    // No additional filtering needed (tenant isolation handled by index naming)
    if (
      ctx.role === UserRole.SYSTEM_ADMIN ||
      ctx.role === UserRole.COMPLIANCE_OFFICER
    ) {
      return filters;
    }

    // Triage leads can see all cases/rius for triage purposes
    if (ctx.role === UserRole.TRIAGE_LEAD) {
      return filters; // Full access within tenant
    }

    // Investigators only see cases/rius they're assigned to
    if (ctx.role === UserRole.INVESTIGATOR) {
      if (entityType === "cases") {
        // Get case IDs where user is assigned as primary investigator
        const investigations = await this.prisma.investigation.findMany({
          where: {
            organizationId: ctx.organizationId,
            primaryInvestigatorId: ctx.userId,
          },
          select: { caseId: true },
        });

        const caseIds = investigations.map((i) => i.caseId);

        if (caseIds.length > 0) {
          filters.push({
            terms: { _id: caseIds },
          });
        } else {
          // No assigned investigations - filter to impossible condition
          filters.push({
            term: { _id: "__no_access__" },
          });
        }
      } else if (entityType === "rius") {
        // Investigators can see RIUs linked to their assigned cases
        const investigations = await this.prisma.investigation.findMany({
          where: {
            organizationId: ctx.organizationId,
            primaryInvestigatorId: ctx.userId,
          },
          select: { caseId: true },
        });

        const caseIds = investigations.map((i) => i.caseId);

        if (caseIds.length > 0) {
          // Get RIU IDs associated with these cases
          const riuAssociations = await this.prisma.riuCaseAssociation.findMany({
            where: {
              caseId: { in: caseIds },
            },
            select: { riuId: true },
          });

          const riuIds = riuAssociations.map((a) => a.riuId);

          if (riuIds.length > 0) {
            filters.push({
              terms: { _id: riuIds },
            });
          } else {
            filters.push({
              term: { _id: "__no_access__" },
            });
          }
        } else {
          filters.push({
            term: { _id: "__no_access__" },
          });
        }
      }
    }

    // Employees and managers only see their own submissions
    if (ctx.role === UserRole.EMPLOYEE || ctx.role === UserRole.MANAGER) {
      filters.push({
        term: { createdById: ctx.userId },
      });
    }

    // Policy authors/reviewers: For policy search (future), allow full access
    // For case/riu search, restrict like employees
    if (
      ctx.role === UserRole.POLICY_AUTHOR ||
      ctx.role === UserRole.POLICY_REVIEWER
    ) {
      if (entityType === "cases" || entityType === "rius") {
        filters.push({
          term: { createdById: ctx.userId },
        });
      }
      // For policy searches, no additional filter (full access to policies)
    }

    // Department admins: Could scope by department in future
    // For now, treat like triage leads for search purposes
    if (ctx.role === UserRole.DEPARTMENT_ADMIN) {
      return filters; // Full access within tenant
    }

    return filters;
  }

  /**
   * Build a filter for a specific field visibility rule.
   * Used for sensitive fields that should be hidden from certain roles.
   */
  buildFieldVisibilityFilter(
    ctx: PermissionContext,
    _entityType: string,
  ): string[] {
    // Return list of fields that should be excluded from results
    const excludedFields: string[] = [];

    // Non-admins shouldn't see reporter contact info in search results
    if (ctx.role !== UserRole.SYSTEM_ADMIN) {
      excludedFields.push("reporterName", "reporterEmail", "reporterPhone");
    }

    return excludedFields;
  }
}
