import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SegmentQueryBuilder } from "./targeting/segment-query.builder";
import {
  TargetingCriteriaDto,
  TargetingMode,
  SimpleTargetingDto,
  AdvancedTargetingDto,
  AudiencePreviewDto,
  AudienceEmployeePreviewDto,
  TargetingAttributeDto,
  TargetingValidationResultDto,
} from "./dto/campaign-targeting.dto";
import {
  SegmentCriteria,
  SegmentCondition,
  SegmentOperator,
  SegmentField,
  SegmentLogic,
} from "./dto/segment-criteria.dto";
import { Prisma, AssignmentStatus } from "@prisma/client";

/**
 * CampaignTargetingService provides enhanced "mom test" friendly segment building
 * for campaign audience targeting (RS.50 specification).
 *
 * Features:
 * - Simple mode: checkbox-based department/location selection
 * - Advanced mode: tenure, hierarchy depth, job titles, custom attributes
 * - Audience preview with count and employee sample
 * - Human-readable criteria descriptions
 * - Subordinate inclusion (walks org hierarchy)
 * - HRIS attribute discovery for UI population
 */
@Injectable()
export class CampaignTargetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly segmentQueryBuilder: SegmentQueryBuilder,
  ) {}

  /**
   * Preview audience for targeting criteria without saving.
   * Returns count and paginated sample of matching employees.
   */
  async previewAudience(
    criteria: TargetingCriteriaDto,
    organizationId: string,
    options?: {
      page?: number;
      pageSize?: number;
    },
  ): Promise<AudiencePreviewDto> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    // Build where clause from criteria
    const where = await this.buildWhereClause(criteria, organizationId);

    // Execute count and paginated select in parallel
    const [totalCount, employees] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          department: true,
          location: true,
        },
        skip,
        take: pageSize,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
    ]);

    // Transform to preview DTOs
    const employeePreviews: AudienceEmployeePreviewDto[] = employees.map(
      (emp) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department ?? undefined,
        location: emp.location ?? undefined,
        email: emp.email,
        jobTitle: emp.jobTitle ?? undefined,
      }),
    );

    // Build human-readable description
    const criteriaDescription = await this.buildCriteriaDescription(
      criteria,
      organizationId,
    );

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      totalCount,
      employees: employeePreviews,
      criteriaDescription,
      totalPages,
      currentPage: page,
    };
  }

  /**
   * Build human-readable description of targeting criteria.
   * Examples: "Everyone in [Finance, Procurement]", "US locations only", "90+ days tenure"
   */
  async buildCriteriaDescription(
    criteria: TargetingCriteriaDto,
    organizationId: string,
  ): Promise<string> {
    const parts: string[] = [];

    if (criteria.mode === TargetingMode.ALL) {
      return "All active employees";
    }

    if (criteria.mode === TargetingMode.SIMPLE && criteria.simple) {
      const simpleParts = await this.describeSimpleCriteria(
        criteria.simple,
        organizationId,
      );
      parts.push(...simpleParts);
    }

    if (criteria.mode === TargetingMode.ADVANCED && criteria.advanced) {
      const advancedParts = this.describeAdvancedCriteria(criteria.advanced);
      parts.push(...advancedParts);
    }

    if (parts.length === 0) {
      return "All active employees";
    }

    return parts.join(", ");
  }

  /**
   * Describe simple targeting criteria in natural language.
   */
  private async describeSimpleCriteria(
    simple: SimpleTargetingDto,
    organizationId: string,
  ): Promise<string[]> {
    const parts: string[] = [];

    // Fetch names for IDs to make description readable
    if (simple.departments && simple.departments.length > 0) {
      const departments = await this.prisma.department.findMany({
        where: { id: { in: simple.departments }, organizationId },
        select: { name: true },
      });
      const names = departments.map((d) => d.name);
      if (names.length === 1) {
        parts.push(`${names[0]} department`);
      } else if (names.length <= 3) {
        parts.push(`${names.join(", ")} departments`);
      } else {
        parts.push(`${names.length} selected departments`);
      }
    }

    if (simple.businessUnits && simple.businessUnits.length > 0) {
      const units = await this.prisma.businessUnit.findMany({
        where: { id: { in: simple.businessUnits }, organizationId },
        select: { name: true },
      });
      const names = units.map((u) => u.name);
      if (names.length === 1) {
        parts.push(`${names[0]} business unit`);
      } else if (names.length <= 3) {
        parts.push(`${names.join(", ")} business units`);
      } else {
        parts.push(`${names.length} selected business units`);
      }
    }

    if (simple.divisions && simple.divisions.length > 0) {
      const divisions = await this.prisma.division.findMany({
        where: { id: { in: simple.divisions }, organizationId },
        select: { name: true },
      });
      const names = divisions.map((d) => d.name);
      if (names.length === 1) {
        parts.push(`${names[0]} division`);
      } else {
        parts.push(`${names.length} selected divisions`);
      }
    }

    if (simple.locations && simple.locations.length > 0) {
      const locations = await this.prisma.location.findMany({
        where: { id: { in: simple.locations }, organizationId },
        select: { name: true },
      });
      const names = locations.map((l) => l.name);
      if (names.length === 1) {
        parts.push(`${names[0]} location`);
      } else if (names.length <= 3) {
        parts.push(`${names.join(", ")} locations`);
      } else {
        parts.push(`${names.length} selected locations`);
      }
    }

    if (simple.includeSubordinates) {
      parts.push("including all subordinates");
    }

    return parts;
  }

  /**
   * Describe advanced targeting criteria in natural language.
   */
  private describeAdvancedCriteria(advanced: AdvancedTargetingDto): string[] {
    const parts: string[] = [];

    if (advanced.jobTitles && advanced.jobTitles.length > 0) {
      if (advanced.jobTitles.length <= 3) {
        parts.push(`job titles containing ${advanced.jobTitles.join(", ")}`);
      } else {
        parts.push(`${advanced.jobTitles.length} selected job titles`);
      }
    }

    if (advanced.managerHierarchyDepth !== undefined) {
      if (advanced.managerHierarchyDepth === 1) {
        parts.push("managers only");
      } else if (advanced.managerHierarchyDepth > 1) {
        parts.push(`managers with ${advanced.managerHierarchyDepth}+ reports`);
      }
    }

    if (advanced.tenureMinDays !== undefined) {
      parts.push(`${advanced.tenureMinDays}+ days tenure`);
    }

    if (advanced.tenureMaxDays !== undefined) {
      parts.push(`less than ${advanced.tenureMaxDays} days tenure`);
    }

    if (advanced.complianceRoles && advanced.complianceRoles.length > 0) {
      parts.push(`compliance roles: ${advanced.complianceRoles.join(", ")}`);
    }

    if (advanced.jobLevels && advanced.jobLevels.length > 0) {
      parts.push(`levels: ${advanced.jobLevels.join(", ")}`);
    }

    if (advanced.primaryLanguages && advanced.primaryLanguages.length > 0) {
      parts.push(`languages: ${advanced.primaryLanguages.join(", ")}`);
    }

    if (advanced.workModes && advanced.workModes.length > 0) {
      parts.push(`${advanced.workModes.join("/")} workers`);
    }

    if (
      advanced.previousCampaignResponses &&
      advanced.previousCampaignResponses.length > 0
    ) {
      parts.push(`${advanced.previousCampaignResponses.length} campaign history filters`);
    }

    if (advanced.exclusions && advanced.exclusions.length > 0) {
      parts.push(`excluding ${advanced.exclusions.length} employees`);
    }

    if (advanced.customAttributes && Object.keys(advanced.customAttributes).length > 0) {
      parts.push(`${Object.keys(advanced.customAttributes).length} custom attribute filters`);
    }

    return parts;
  }

  /**
   * Get all employee IDs matching targeting criteria.
   * Used when launching a campaign.
   */
  async getTargetEmployeeIds(
    criteria: TargetingCriteriaDto,
    organizationId: string,
  ): Promise<string[]> {
    const where = await this.buildWhereClause(criteria, organizationId);

    const employees = await this.prisma.employee.findMany({
      where,
      select: { id: true },
    });

    return employees.map((e) => e.id);
  }

  /**
   * Validate targeting criteria.
   * Checks that referenced IDs exist and warns if criteria matches 0 employees.
   */
  async validateCriteria(
    criteria: TargetingCriteriaDto,
    organizationId: string,
  ): Promise<TargetingValidationResultDto> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Mode-specific validation
    if (criteria.mode === TargetingMode.SIMPLE && !criteria.simple) {
      errors.push("Simple targeting mode requires simple criteria");
    }

    if (criteria.mode === TargetingMode.ADVANCED && !criteria.advanced) {
      errors.push("Advanced targeting mode requires advanced criteria");
    }

    // Validate simple criteria references
    if (criteria.simple) {
      await this.validateSimpleCriteria(criteria.simple, organizationId, errors);
    }

    // Validate advanced criteria
    if (criteria.advanced) {
      this.validateAdvancedCriteria(criteria.advanced, errors, warnings);
    }

    // Get estimated count
    let estimatedCount: number | undefined;
    if (errors.length === 0) {
      try {
        const where = await this.buildWhereClause(criteria, organizationId);
        estimatedCount = await this.prisma.employee.count({ where });

        if (estimatedCount === 0) {
          warnings.push("Criteria matches 0 employees");
        }
      } catch {
        errors.push("Failed to evaluate criteria");
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      estimatedCount,
    };
  }

  /**
   * Validate simple criteria - check that referenced entities exist.
   */
  private async validateSimpleCriteria(
    simple: SimpleTargetingDto,
    organizationId: string,
    errors: string[],
  ): Promise<void> {
    // Validate departments
    if (simple.departments && simple.departments.length > 0) {
      const deptCount = await this.prisma.department.count({
        where: { id: { in: simple.departments }, organizationId },
      });
      if (deptCount !== simple.departments.length) {
        errors.push(
          `${simple.departments.length - deptCount} department(s) not found`,
        );
      }
    }

    // Validate business units
    if (simple.businessUnits && simple.businessUnits.length > 0) {
      const buCount = await this.prisma.businessUnit.count({
        where: { id: { in: simple.businessUnits }, organizationId },
      });
      if (buCount !== simple.businessUnits.length) {
        errors.push(
          `${simple.businessUnits.length - buCount} business unit(s) not found`,
        );
      }
    }

    // Validate divisions
    if (simple.divisions && simple.divisions.length > 0) {
      const divCount = await this.prisma.division.count({
        where: { id: { in: simple.divisions }, organizationId },
      });
      if (divCount !== simple.divisions.length) {
        errors.push(`${simple.divisions.length - divCount} division(s) not found`);
      }
    }

    // Validate locations
    if (simple.locations && simple.locations.length > 0) {
      const locCount = await this.prisma.location.count({
        where: { id: { in: simple.locations }, organizationId },
      });
      if (locCount !== simple.locations.length) {
        errors.push(`${simple.locations.length - locCount} location(s) not found`);
      }
    }
  }

  /**
   * Validate advanced criteria.
   */
  private validateAdvancedCriteria(
    advanced: AdvancedTargetingDto,
    errors: string[],
    warnings: string[],
  ): void {
    // Tenure validation
    if (
      advanced.tenureMinDays !== undefined &&
      advanced.tenureMaxDays !== undefined &&
      advanced.tenureMinDays > advanced.tenureMaxDays
    ) {
      errors.push("Minimum tenure cannot be greater than maximum tenure");
    }

    // Manager hierarchy depth
    if (
      advanced.managerHierarchyDepth !== undefined &&
      advanced.managerHierarchyDepth > 10
    ) {
      warnings.push("Manager hierarchy depth > 10 may have performance impact");
    }

    // Exclusions warning
    if (advanced.exclusions && advanced.exclusions.length > 100) {
      warnings.push("Large exclusion list (100+) may impact performance");
    }
  }

  /**
   * Get available targeting attributes for the organization.
   * Used to populate the targeting UI with available options.
   */
  async getAvailableAttributes(
    organizationId: string,
  ): Promise<TargetingAttributeDto[]> {
    const attributes: TargetingAttributeDto[] = [];

    // Organization Structure attributes
    const [divisions, businessUnits, departments, locations] = await Promise.all([
      this.prisma.division.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.businessUnit.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.department.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.location.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    attributes.push({
      key: "divisionId",
      label: "Division",
      type: "multiselect",
      options: divisions.map((d) => ({ value: d.id, label: d.name })),
      category: "Organization Structure",
    });

    attributes.push({
      key: "businessUnitId",
      label: "Business Unit",
      type: "multiselect",
      options: businessUnits.map((b) => ({ value: b.id, label: b.name })),
      category: "Organization Structure",
    });

    attributes.push({
      key: "departmentId",
      label: "Department",
      type: "multiselect",
      options: departments.map((d) => ({ value: d.id, label: d.name })),
      category: "Organization Structure",
    });

    attributes.push({
      key: "locationId",
      label: "Location",
      type: "multiselect",
      options: locations.map((l) => ({ value: l.id, label: l.name })),
      category: "Organization Structure",
    });

    // Position attributes
    const jobTitles = await this.prisma.employee.groupBy({
      by: ["jobTitle"],
      where: { organizationId, employmentStatus: "ACTIVE" },
      orderBy: { jobTitle: "asc" },
    });

    attributes.push({
      key: "jobTitle",
      label: "Job Title",
      type: "multiselect",
      options: jobTitles
        .filter((jt) => jt.jobTitle)
        .map((jt) => ({ value: jt.jobTitle, label: jt.jobTitle })),
      category: "Position",
    });

    // Job level (static options from enum)
    attributes.push({
      key: "jobLevel",
      label: "Job Level",
      type: "multiselect",
      options: [
        { value: "IC", label: "Individual Contributor" },
        { value: "MANAGER", label: "Manager" },
        { value: "SENIOR_MANAGER", label: "Senior Manager" },
        { value: "DIRECTOR", label: "Director" },
        { value: "VP", label: "Vice President" },
        { value: "SVP", label: "Senior Vice President" },
        { value: "C_LEVEL", label: "C-Level" },
      ],
      category: "Position",
    });

    // Employment attributes
    attributes.push({
      key: "workMode",
      label: "Work Mode",
      type: "multiselect",
      options: [
        { value: "ONSITE", label: "On-site" },
        { value: "REMOTE", label: "Remote" },
        { value: "HYBRID", label: "Hybrid" },
      ],
      category: "Employment",
    });

    // Compliance role
    attributes.push({
      key: "complianceRole",
      label: "Compliance Role",
      type: "multiselect",
      options: [
        { value: "CCO", label: "Chief Compliance Officer" },
        { value: "COMPLIANCE_OFFICER", label: "Compliance Officer" },
        { value: "INVESTIGATOR", label: "Investigator" },
        { value: "TRIAGE_LEAD", label: "Triage Lead" },
        { value: "HR_PARTNER", label: "HR Partner" },
        { value: "LEGAL_COUNSEL", label: "Legal Counsel" },
      ],
      category: "Compliance",
    });

    // Tenure (numeric)
    attributes.push({
      key: "tenure",
      label: "Tenure (days)",
      type: "number",
      category: "Employment",
    });

    // Language
    const languages = await this.prisma.employee.groupBy({
      by: ["primaryLanguage"],
      where: { organizationId, employmentStatus: "ACTIVE" },
      orderBy: { primaryLanguage: "asc" },
    });

    attributes.push({
      key: "primaryLanguage",
      label: "Primary Language",
      type: "multiselect",
      options: languages.map((l) => ({
        value: l.primaryLanguage,
        label: this.getLanguageLabel(l.primaryLanguage),
      })),
      category: "Employee Preferences",
    });

    // Include subordinates (boolean)
    attributes.push({
      key: "includeSubordinates",
      label: "Include Subordinates",
      type: "boolean",
      category: "Hierarchy",
    });

    return attributes;
  }

  /**
   * Build Prisma where clause from targeting criteria.
   */
  private async buildWhereClause(
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
   */
  private async buildSimpleConditions(
    simple: SimpleTargetingDto,
    organizationId: string,
  ): Promise<Prisma.EmployeeWhereInput[]> {
    const conditions: Prisma.EmployeeWhereInput[] = [];

    // Department filter
    if (simple.departments && simple.departments.length > 0) {
      conditions.push({ departmentId: { in: simple.departments } });
    }

    // Business unit filter
    if (simple.businessUnits && simple.businessUnits.length > 0) {
      conditions.push({ businessUnitId: { in: simple.businessUnits } });
    }

    // Division filter
    if (simple.divisions && simple.divisions.length > 0) {
      conditions.push({ divisionId: { in: simple.divisions } });
    }

    // Location filter
    if (simple.locations && simple.locations.length > 0) {
      conditions.push({ locationId: { in: simple.locations } });
    }

    // Handle includeSubordinates - expand to include all reports
    if (simple.includeSubordinates) {
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
    }

    return conditions;
  }

  /**
   * Build conditions for advanced targeting mode.
   */
  private async buildAdvancedConditions(
    advanced: AdvancedTargetingDto,
    organizationId: string,
  ): Promise<Prisma.EmployeeWhereInput[]> {
    const conditions: Prisma.EmployeeWhereInput[] = [];

    // Job titles (case-insensitive contains)
    if (advanced.jobTitles && advanced.jobTitles.length > 0) {
      const titleConditions: Prisma.EmployeeWhereInput[] = advanced.jobTitles.map(
        (title) => ({
          jobTitle: { contains: title, mode: "insensitive" as const },
        }),
      );
      conditions.push({ OR: titleConditions });
    }

    // Manager hierarchy depth (must have at least N direct reports)
    if (
      advanced.managerHierarchyDepth !== undefined &&
      advanced.managerHierarchyDepth > 0
    ) {
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
        conditions.push({ id: { in: Array.from(managerIds) } });
      } else {
        // No managers found - this will match 0 employees
        conditions.push({ id: { equals: "no-match" } });
      }
    }

    // Tenure filters
    const now = new Date();
    if (advanced.tenureMinDays !== undefined) {
      const maxHireDate = new Date(now);
      maxHireDate.setDate(maxHireDate.getDate() - advanced.tenureMinDays);
      conditions.push({ hireDate: { lte: maxHireDate } });
    }

    if (advanced.tenureMaxDays !== undefined) {
      const minHireDate = new Date(now);
      minHireDate.setDate(minHireDate.getDate() - advanced.tenureMaxDays);
      conditions.push({ hireDate: { gte: minHireDate } });
    }

    // Compliance roles
    if (advanced.complianceRoles && advanced.complianceRoles.length > 0) {
      conditions.push({ complianceRole: { in: advanced.complianceRoles as never[] } });
    }

    // Job levels
    if (advanced.jobLevels && advanced.jobLevels.length > 0) {
      conditions.push({ jobLevel: { in: advanced.jobLevels as never[] } });
    }

    // Primary languages
    if (advanced.primaryLanguages && advanced.primaryLanguages.length > 0) {
      conditions.push({ primaryLanguage: { in: advanced.primaryLanguages } });
    }

    // Work modes
    if (advanced.workModes && advanced.workModes.length > 0) {
      conditions.push({ workMode: { in: advanced.workModes as never[] } });
    }

    // Previous campaign responses
    if (
      advanced.previousCampaignResponses &&
      advanced.previousCampaignResponses.length > 0
    ) {
      const campaignFilters = advanced.previousCampaignResponses.map((pcr) => ({
        campaignAssignments: {
          some: {
            campaignId: pcr.campaignId,
            status: pcr.status as AssignmentStatus,
          },
        },
      }));
      conditions.push(...campaignFilters);
    }

    // Exclusions
    if (advanced.exclusions && advanced.exclusions.length > 0) {
      conditions.push({ id: { notIn: advanced.exclusions } });
    }

    return conditions;
  }

  /**
   * Get all subordinates of given manager IDs recursively (up to maxDepth).
   */
  private async getAllSubordinates(
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
   * Convert targeting criteria to legacy SegmentCriteria format.
   * For interoperability with existing SegmentQueryBuilder.
   */
  convertToSegmentCriteria(criteria: TargetingCriteriaDto): SegmentCriteria {
    if (criteria.mode === TargetingMode.ALL) {
      return {
        logic: SegmentLogic.AND,
        conditions: [],
      };
    }

    const conditions: SegmentCondition[] = [];

    if (criteria.mode === TargetingMode.SIMPLE && criteria.simple) {
      if (criteria.simple.departments && criteria.simple.departments.length > 0) {
        conditions.push({
          field: SegmentField.DEPARTMENT_ID,
          operator: SegmentOperator.IN,
          value: criteria.simple.departments,
        });
      }

      if (criteria.simple.businessUnits && criteria.simple.businessUnits.length > 0) {
        conditions.push({
          field: SegmentField.BUSINESS_UNIT_ID,
          operator: SegmentOperator.IN,
          value: criteria.simple.businessUnits,
        });
      }

      if (criteria.simple.divisions && criteria.simple.divisions.length > 0) {
        conditions.push({
          field: SegmentField.DIVISION_ID,
          operator: SegmentOperator.IN,
          value: criteria.simple.divisions,
        });
      }

      if (criteria.simple.locations && criteria.simple.locations.length > 0) {
        conditions.push({
          field: SegmentField.LOCATION_ID,
          operator: SegmentOperator.IN,
          value: criteria.simple.locations,
        });
      }
    }

    if (criteria.mode === TargetingMode.ADVANCED && criteria.advanced) {
      if (criteria.advanced.jobLevels && criteria.advanced.jobLevels.length > 0) {
        conditions.push({
          field: SegmentField.JOB_LEVEL,
          operator: SegmentOperator.IN,
          value: criteria.advanced.jobLevels,
        });
      }

      if (criteria.advanced.workModes && criteria.advanced.workModes.length > 0) {
        conditions.push({
          field: SegmentField.WORK_MODE,
          operator: SegmentOperator.IN,
          value: criteria.advanced.workModes,
        });
      }

      if (criteria.advanced.primaryLanguages && criteria.advanced.primaryLanguages.length > 0) {
        conditions.push({
          field: SegmentField.PRIMARY_LANGUAGE,
          operator: SegmentOperator.IN,
          value: criteria.advanced.primaryLanguages,
        });
      }

      if (criteria.advanced.tenureMinDays !== undefined) {
        const maxHireDate = new Date();
        maxHireDate.setDate(maxHireDate.getDate() - criteria.advanced.tenureMinDays);
        conditions.push({
          field: SegmentField.HIRE_DATE,
          operator: SegmentOperator.LESS_THAN_OR_EQUALS,
          value: maxHireDate.toISOString(),
        });
      }

      if (criteria.advanced.tenureMaxDays !== undefined) {
        const minHireDate = new Date();
        minHireDate.setDate(minHireDate.getDate() - criteria.advanced.tenureMaxDays);
        conditions.push({
          field: SegmentField.HIRE_DATE,
          operator: SegmentOperator.GREATER_THAN_OR_EQUALS,
          value: minHireDate.toISOString(),
        });
      }
    }

    return {
      logic: SegmentLogic.AND,
      conditions,
    };
  }

  /**
   * Get human-readable language label from ISO code.
   */
  private getLanguageLabel(code: string): string {
    const languageMap: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      pt: "Portuguese",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      ar: "Arabic",
      hi: "Hindi",
      it: "Italian",
      nl: "Dutch",
      ru: "Russian",
      pl: "Polish",
      he: "Hebrew",
    };
    return languageMap[code] || code.toUpperCase();
  }
}
