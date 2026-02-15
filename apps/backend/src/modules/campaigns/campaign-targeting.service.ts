import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SegmentQueryBuilder } from "./targeting/segment-query.builder";
import { AudienceQueryService } from "./services/audience-query.service";
import { AudienceDescriptionService } from "./services/audience-description.service";
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

/**
 * CampaignTargetingService provides enhanced "mom test" friendly segment building
 * for campaign audience targeting (RS.50 specification).
 *
 * This is a thin coordinator that delegates to:
 * - AudienceQueryService: Prisma where clause building
 * - AudienceDescriptionService: Human-readable criteria descriptions
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
  private readonly logger = new Logger(CampaignTargetingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly segmentQueryBuilder: SegmentQueryBuilder,
    private readonly audienceQueryService: AudienceQueryService,
    private readonly audienceDescriptionService: AudienceDescriptionService,
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

    // Delegate where clause building to AudienceQueryService
    const where = await this.audienceQueryService.buildWhereClause(
      criteria,
      organizationId,
    );

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

    // Delegate description building to AudienceDescriptionService
    const criteriaDescription =
      await this.audienceDescriptionService.buildCriteriaDescription(
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
   * Get all employee IDs matching targeting criteria.
   * Used when launching a campaign.
   */
  async getTargetEmployeeIds(
    criteria: TargetingCriteriaDto,
    organizationId: string,
  ): Promise<string[]> {
    const where = await this.audienceQueryService.buildWhereClause(
      criteria,
      organizationId,
    );

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
      await this.validateSimpleCriteria(
        criteria.simple,
        organizationId,
        errors,
      );
    }

    // Validate advanced criteria
    if (criteria.advanced) {
      this.validateAdvancedCriteria(criteria.advanced, errors, warnings);
    }

    // Get estimated count
    let estimatedCount: number | undefined;
    if (errors.length === 0) {
      try {
        const where = await this.audienceQueryService.buildWhereClause(
          criteria,
          organizationId,
        );
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
        errors.push(
          `${simple.divisions.length - divCount} division(s) not found`,
        );
      }
    }

    // Validate locations
    if (simple.locations && simple.locations.length > 0) {
      const locCount = await this.prisma.location.count({
        where: { id: { in: simple.locations }, organizationId },
      });
      if (locCount !== simple.locations.length) {
        errors.push(
          `${simple.locations.length - locCount} location(s) not found`,
        );
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
    const [divisions, businessUnits, departments, locations] =
      await Promise.all([
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
        label: this.audienceDescriptionService.getLanguageLabel(
          l.primaryLanguage,
        ),
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
      if (
        criteria.simple.departments &&
        criteria.simple.departments.length > 0
      ) {
        conditions.push({
          field: SegmentField.DEPARTMENT_ID,
          operator: SegmentOperator.IN,
          value: criteria.simple.departments,
        });
      }

      if (
        criteria.simple.businessUnits &&
        criteria.simple.businessUnits.length > 0
      ) {
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
      if (
        criteria.advanced.jobLevels &&
        criteria.advanced.jobLevels.length > 0
      ) {
        conditions.push({
          field: SegmentField.JOB_LEVEL,
          operator: SegmentOperator.IN,
          value: criteria.advanced.jobLevels,
        });
      }

      if (
        criteria.advanced.workModes &&
        criteria.advanced.workModes.length > 0
      ) {
        conditions.push({
          field: SegmentField.WORK_MODE,
          operator: SegmentOperator.IN,
          value: criteria.advanced.workModes,
        });
      }

      if (
        criteria.advanced.primaryLanguages &&
        criteria.advanced.primaryLanguages.length > 0
      ) {
        conditions.push({
          field: SegmentField.PRIMARY_LANGUAGE,
          operator: SegmentOperator.IN,
          value: criteria.advanced.primaryLanguages,
        });
      }

      if (criteria.advanced.tenureMinDays !== undefined) {
        const maxHireDate = new Date();
        maxHireDate.setDate(
          maxHireDate.getDate() - criteria.advanced.tenureMinDays,
        );
        conditions.push({
          field: SegmentField.HIRE_DATE,
          operator: SegmentOperator.LESS_THAN_OR_EQUALS,
          value: maxHireDate.toISOString(),
        });
      }

      if (criteria.advanced.tenureMaxDays !== undefined) {
        const minHireDate = new Date();
        minHireDate.setDate(
          minHireDate.getDate() - criteria.advanced.tenureMaxDays,
        );
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
}
