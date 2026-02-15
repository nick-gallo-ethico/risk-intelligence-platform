import { Injectable, Logger } from "@nestjs/common";
import { Prisma, AssignmentStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  TargetingCriteriaDto,
  TargetingMode,
  SimpleTargetingDto,
  AdvancedTargetingDto,
} from "../dto/campaign-targeting.dto";

/**
 * AudienceQueryService handles Prisma where clause building for campaign audience targeting.
 *
 * This service extracts the query-building logic from CampaignTargetingService,
 * providing focused responsibility for:
 * - Building where clauses from targeting criteria
 * - Simple mode filters (departments, locations, business units, divisions)
 * - Advanced mode filters (tenure, hierarchy, job titles, compliance roles)
 * - Subordinate hierarchy traversal
 *
 * Used by CampaignTargetingService as a thin coordinator delegate.
 */
@Injectable()
export class AudienceQueryService {
  private readonly logger = new Logger(AudienceQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build Prisma where clause from targeting criteria.
   * Main entry point for audience query building.
   */
  async buildWhereClause(
    criteria: TargetingCriteriaDto,
    organizationId: string,
  ): Promise<Prisma.EmployeeWhereInput> {
    const baseWhere: Prisma.EmployeeWhereInput = {
      organizationId,
      employmentStatus: "ACTIVE",
    };

    if (criteria.mode === TargetingMode.ALL) {
      return baseWhere;
    }

    const conditions: Prisma.EmployeeWhereInput[] = [baseWhere];

    if (criteria.mode === TargetingMode.SIMPLE && criteria.simple) {
      const simpleConditions = await this.buildSimpleConditions(
        criteria.simple,
        organizationId,
      );
      conditions.push(...simpleConditions);
    }

    if (criteria.mode === TargetingMode.ADVANCED && criteria.advanced) {
      const advancedConditions = await this.buildAdvancedConditions(
        criteria.advanced,
        organizationId,
      );
      conditions.push(...advancedConditions);
    }

    if (conditions.length === 1) {
      return baseWhere;
    }

    return { AND: conditions };
  }

  /**
   * Build conditions for simple targeting mode.
   * Handles departments, business units, divisions, locations, and subordinate inclusion.
   */
  async buildSimpleConditions(
    simple: SimpleTargetingDto,
    organizationId: string,
  ): Promise<Prisma.EmployeeWhereInput[]> {
    const conditions: Prisma.EmployeeWhereInput[] = [];

    // Department filter
    if (simple.departments && simple.departments.length > 0) {
      conditions.push(this.buildDepartmentFilter(simple.departments));
    }

    // Business unit filter
    if (simple.businessUnits && simple.businessUnits.length > 0) {
      conditions.push(this.buildBusinessUnitFilter(simple.businessUnits));
    }

    // Division filter
    if (simple.divisions && simple.divisions.length > 0) {
      conditions.push(this.buildDivisionFilter(simple.divisions));
    }

    // Location filter
    if (simple.locations && simple.locations.length > 0) {
      conditions.push(this.buildLocationFilter(simple.locations));
    }

    // Handle includeSubordinates - expand to include all reports
    if (simple.includeSubordinates) {
      return this.expandWithSubordinates(conditions, organizationId);
    }

    return conditions;
  }

  /**
   * Build department IN clause filter.
   */
  buildDepartmentFilter(departmentIds: string[]): Prisma.EmployeeWhereInput {
    return { departmentId: { in: departmentIds } };
  }

  /**
   * Build business unit IN clause filter.
   */
  buildBusinessUnitFilter(
    businessUnitIds: string[],
  ): Prisma.EmployeeWhereInput {
    return { businessUnitId: { in: businessUnitIds } };
  }

  /**
   * Build division IN clause filter.
   */
  buildDivisionFilter(divisionIds: string[]): Prisma.EmployeeWhereInput {
    return { divisionId: { in: divisionIds } };
  }

  /**
   * Build location IN clause filter.
   */
  buildLocationFilter(locationIds: string[]): Prisma.EmployeeWhereInput {
    return { locationId: { in: locationIds } };
  }

  /**
   * Expand conditions to include subordinates of matched employees.
   * Returns modified conditions that include all matched employees AND their subordinates.
   */
  private async expandWithSubordinates(
    conditions: Prisma.EmployeeWhereInput[],
    organizationId: string,
  ): Promise<Prisma.EmployeeWhereInput[]> {
    // Get all matched employees first, then expand to include their subordinates
    const baseConditions = conditions.length > 0 ? { AND: conditions } : {};
    const matchedEmployees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        employmentStatus: "ACTIVE",
        ...baseConditions,
      },
      select: { id: true },
    });

    if (matchedEmployees.length > 0) {
      const managerIds = matchedEmployees.map((e) => e.id);

      // Get all subordinates recursively (up to 10 levels)
      const allSubordinateIds = await this.getAllSubordinates(
        managerIds,
        organizationId,
      );

      // Include both original matched employees and their subordinates
      const allIds = [...managerIds, ...allSubordinateIds];

      // Replace conditions with ID-based filter
      return [{ id: { in: allIds } }];
    }

    return conditions;
  }

  /**
   * Build conditions for advanced targeting mode.
   * Handles job titles, hierarchy depth, tenure, compliance roles, job levels, etc.
   */
  async buildAdvancedConditions(
    advanced: AdvancedTargetingDto,
    organizationId: string,
  ): Promise<Prisma.EmployeeWhereInput[]> {
    const conditions: Prisma.EmployeeWhereInput[] = [];

    // Job titles (case-insensitive contains)
    if (advanced.jobTitles && advanced.jobTitles.length > 0) {
      conditions.push(this.buildJobTitleFilter(advanced.jobTitles));
    }

    // Manager hierarchy depth (must have at least N direct reports)
    if (
      advanced.managerHierarchyDepth !== undefined &&
      advanced.managerHierarchyDepth > 0
    ) {
      const hierarchyCondition =
        await this.buildHierarchyDepthFilter(organizationId);
      conditions.push(hierarchyCondition);
    }

    // Tenure filters
    if (advanced.tenureMinDays !== undefined) {
      conditions.push(this.buildTenureMinFilter(advanced.tenureMinDays));
    }

    if (advanced.tenureMaxDays !== undefined) {
      conditions.push(this.buildTenureMaxFilter(advanced.tenureMaxDays));
    }

    // Compliance roles
    if (advanced.complianceRoles && advanced.complianceRoles.length > 0) {
      conditions.push(this.buildComplianceRoleFilter(advanced.complianceRoles));
    }

    // Job levels
    if (advanced.jobLevels && advanced.jobLevels.length > 0) {
      conditions.push(this.buildJobLevelFilter(advanced.jobLevels));
    }

    // Primary languages
    if (advanced.primaryLanguages && advanced.primaryLanguages.length > 0) {
      conditions.push(
        this.buildPrimaryLanguageFilter(advanced.primaryLanguages),
      );
    }

    // Work modes
    if (advanced.workModes && advanced.workModes.length > 0) {
      conditions.push(this.buildWorkModeFilter(advanced.workModes));
    }

    // Previous campaign responses
    if (
      advanced.previousCampaignResponses &&
      advanced.previousCampaignResponses.length > 0
    ) {
      const campaignFilters = this.buildPreviousCampaignFilters(
        advanced.previousCampaignResponses,
      );
      conditions.push(...campaignFilters);
    }

    // Exclusions
    if (advanced.exclusions && advanced.exclusions.length > 0) {
      conditions.push(this.buildExclusionFilter(advanced.exclusions));
    }

    return conditions;
  }

  /**
   * Build job title filter (case-insensitive contains).
   */
  buildJobTitleFilter(titles: string[]): Prisma.EmployeeWhereInput {
    const titleConditions: Prisma.EmployeeWhereInput[] = titles.map(
      (title) => ({
        jobTitle: { contains: title, mode: "insensitive" as const },
      }),
    );
    return { OR: titleConditions };
  }

  /**
   * Build hierarchy depth filter.
   * Returns employees who are managers (have subordinates).
   */
  async buildHierarchyDepthFilter(
    organizationId: string,
  ): Promise<Prisma.EmployeeWhereInput> {
    // Find employees who are managers (have subordinates)
    const managers = await this.prisma.employee.findMany({
      where: {
        organizationId,
        employmentStatus: "ACTIVE",
      },
      select: { id: true, managerId: true },
    });

    // Build manager set (employees who have reports)
    const managerIds = new Set<string>();
    for (const emp of managers) {
      if (emp.managerId) {
        managerIds.add(emp.managerId);
      }
    }

    if (managerIds.size > 0) {
      return { id: { in: Array.from(managerIds) } };
    }

    // No managers found - this will match 0 employees
    return { id: { equals: "no-match" } };
  }

  /**
   * Build minimum tenure filter.
   * Employees hired at least X days ago.
   */
  buildTenureMinFilter(minDays: number): Prisma.EmployeeWhereInput {
    const maxHireDate = new Date();
    maxHireDate.setDate(maxHireDate.getDate() - minDays);
    return { hireDate: { lte: maxHireDate } };
  }

  /**
   * Build maximum tenure filter.
   * Employees hired no more than X days ago.
   */
  buildTenureMaxFilter(maxDays: number): Prisma.EmployeeWhereInput {
    const minHireDate = new Date();
    minHireDate.setDate(minHireDate.getDate() - maxDays);
    return { hireDate: { gte: minHireDate } };
  }

  /**
   * Build compliance role filter.
   */
  buildComplianceRoleFilter(roles: string[]): Prisma.EmployeeWhereInput {
    return { complianceRole: { in: roles as never[] } };
  }

  /**
   * Build job level filter.
   */
  buildJobLevelFilter(levels: string[]): Prisma.EmployeeWhereInput {
    return { jobLevel: { in: levels as never[] } };
  }

  /**
   * Build primary language filter.
   */
  buildPrimaryLanguageFilter(languages: string[]): Prisma.EmployeeWhereInput {
    return { primaryLanguage: { in: languages } };
  }

  /**
   * Build work mode filter.
   */
  buildWorkModeFilter(modes: string[]): Prisma.EmployeeWhereInput {
    return { workMode: { in: modes as never[] } };
  }

  /**
   * Build previous campaign response filters.
   */
  buildPreviousCampaignFilters(
    responses: { campaignId: string; status: string }[],
  ): Prisma.EmployeeWhereInput[] {
    return responses.map((pcr) => ({
      campaignAssignments: {
        some: {
          campaignId: pcr.campaignId,
          status: pcr.status as AssignmentStatus,
        },
      },
    }));
  }

  /**
   * Build exclusion filter.
   */
  buildExclusionFilter(excludeIds: string[]): Prisma.EmployeeWhereInput {
    return { id: { notIn: excludeIds } };
  }

  /**
   * Get all subordinates of given manager IDs recursively (up to maxDepth).
   * Walks the org hierarchy to find all direct and indirect reports.
   */
  async getAllSubordinates(
    managerIds: string[],
    organizationId: string,
    maxDepth: number = 10,
  ): Promise<string[]> {
    const allSubordinates = new Set<string>();
    let currentLevel = managerIds;

    for (let depth = 0; depth < maxDepth && currentLevel.length > 0; depth++) {
      const subordinates = await this.prisma.employee.findMany({
        where: {
          organizationId,
          employmentStatus: "ACTIVE",
          managerId: { in: currentLevel },
        },
        select: { id: true },
      });

      const newSubordinateIds: string[] = [];
      for (const sub of subordinates) {
        if (!allSubordinates.has(sub.id)) {
          allSubordinates.add(sub.id);
          newSubordinateIds.push(sub.id);
        }
      }

      currentLevel = newSubordinateIds;
    }

    return Array.from(allSubordinates);
  }

  /**
   * Build subordinate filter for a specific manager.
   * Finds all employees reporting (directly or indirectly) to the given manager.
   */
  async buildSubordinateFilter(
    managerId: string,
    organizationId: string,
  ): Promise<Prisma.EmployeeWhereInput> {
    const subordinateIds = await this.getAllSubordinates(
      [managerId],
      organizationId,
    );

    if (subordinateIds.length === 0) {
      return { id: { equals: "no-match" } };
    }

    return { id: { in: subordinateIds } };
  }

  /**
   * Resolve custom attribute path to Prisma field.
   * Handles both standard employee fields and custom HRIS attributes.
   */
  resolveAttributePath(attribute: string): string | null {
    const standardFields: Record<string, string> = {
      department: "departmentId",
      businessUnit: "businessUnitId",
      division: "divisionId",
      location: "locationId",
      jobTitle: "jobTitle",
      jobLevel: "jobLevel",
      complianceRole: "complianceRole",
      workMode: "workMode",
      primaryLanguage: "primaryLanguage",
      hireDate: "hireDate",
      manager: "managerId",
      employmentStatus: "employmentStatus",
      employmentType: "employmentType",
    };

    return standardFields[attribute] || null;
  }

  /**
   * Build custom attribute filter.
   * Supports various operators for HRIS custom attributes.
   */
  buildCustomAttributeFilter(
    attribute: string,
    operator: string,
    value: unknown,
  ): Prisma.EmployeeWhereInput | null {
    const prismaField = this.resolveAttributePath(attribute);
    if (!prismaField) {
      this.logger.warn(`Unknown attribute: ${attribute}`);
      return null;
    }

    switch (operator) {
      case "equals":
        return { [prismaField]: value };
      case "not_equals":
        return { [prismaField]: { not: value } };
      case "in":
        return {
          [prismaField]: { in: Array.isArray(value) ? value : [value] },
        };
      case "not_in":
        return {
          [prismaField]: { notIn: Array.isArray(value) ? value : [value] },
        };
      case "contains":
        return {
          [prismaField]: { contains: value as string, mode: "insensitive" },
        };
      case "starts_with":
        return {
          [prismaField]: { startsWith: value as string, mode: "insensitive" },
        };
      case "ends_with":
        return {
          [prismaField]: { endsWith: value as string, mode: "insensitive" },
        };
      case "greater_than":
        return { [prismaField]: { gt: value } };
      case "greater_than_or_equals":
        return { [prismaField]: { gte: value } };
      case "less_than":
        return { [prismaField]: { lt: value } };
      case "less_than_or_equals":
        return { [prismaField]: { lte: value } };
      case "is_null":
        return { [prismaField]: null };
      case "is_not_null":
        return { [prismaField]: { not: null } };
      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return null;
    }
  }
}
