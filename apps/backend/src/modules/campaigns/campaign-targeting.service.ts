import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SegmentQueryBuilder } from "./targeting/segment-query.builder";
import { AudienceQueryService } from "./services/audience-query.service";
import { AudienceDescriptionService } from "./services/audience-description.service";
import { TargetingAttributesService } from "./services/targeting-attributes.service";
import { SegmentConverterService } from "./services/segment-converter.service";
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
import { SegmentCriteria } from "./dto/segment-criteria.dto";

/**
 * CampaignTargetingService provides enhanced "mom test" friendly segment building
 * for campaign audience targeting (RS.50 specification).
 *
 * This is a thin coordinator that delegates to:
 * - AudienceQueryService: Prisma where clause building
 * - AudienceDescriptionService: Human-readable criteria descriptions
 * - TargetingAttributesService: HRIS attribute discovery for UI
 * - SegmentConverterService: TargetingCriteria to SegmentCriteria conversion
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
    private readonly targetingAttributesService: TargetingAttributesService,
    private readonly segmentConverterService: SegmentConverterService,
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
   * Delegates to TargetingAttributesService.
   */
  async getAvailableAttributes(
    organizationId: string,
  ): Promise<TargetingAttributeDto[]> {
    return this.targetingAttributesService.getAvailableAttributes(
      organizationId,
    );
  }

  /**
   * Convert targeting criteria to legacy SegmentCriteria format.
   * Delegates to SegmentConverterService.
   */
  convertToSegmentCriteria(criteria: TargetingCriteriaDto): SegmentCriteria {
    return this.segmentConverterService.convertToSegmentCriteria(criteria);
  }
}
