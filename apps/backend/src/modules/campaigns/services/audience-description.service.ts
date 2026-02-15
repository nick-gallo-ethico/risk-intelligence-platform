import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  TargetingCriteriaDto,
  TargetingMode,
  SimpleTargetingDto,
  AdvancedTargetingDto,
} from "../dto/campaign-targeting.dto";

/**
 * AudienceDescriptionService handles human-readable description generation
 * for campaign audience targeting criteria.
 *
 * This service extracts the description-building logic from CampaignTargetingService,
 * providing focused responsibility for:
 * - Building human-readable criteria descriptions
 * - Simple mode descriptions (departments, locations, business units)
 * - Advanced mode descriptions (tenure, hierarchy, job titles)
 * - Name resolution from IDs to display names
 *
 * Used by CampaignTargetingService as a thin coordinator delegate.
 */
@Injectable()
export class AudienceDescriptionService {
  private readonly logger = new Logger(AudienceDescriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build human-readable description of targeting criteria.
   * Main entry point for description generation.
   *
   * @example
   * "Everyone in Finance and Legal departments, US locations only, 90+ days tenure"
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
  async describeSimpleCriteria(
    simple: SimpleTargetingDto,
    organizationId: string,
  ): Promise<string[]> {
    const parts: string[] = [];

    // Describe departments
    if (simple.departments && simple.departments.length > 0) {
      const description = await this.describeDepartmentFilter(
        simple.departments,
        organizationId,
      );
      if (description) {
        parts.push(description);
      }
    }

    // Describe business units
    if (simple.businessUnits && simple.businessUnits.length > 0) {
      const description = await this.describeBusinessUnitFilter(
        simple.businessUnits,
        organizationId,
      );
      if (description) {
        parts.push(description);
      }
    }

    // Describe divisions
    if (simple.divisions && simple.divisions.length > 0) {
      const description = await this.describeDivisionFilter(
        simple.divisions,
        organizationId,
      );
      if (description) {
        parts.push(description);
      }
    }

    // Describe locations
    if (simple.locations && simple.locations.length > 0) {
      const description = await this.describeLocationFilter(
        simple.locations,
        organizationId,
      );
      if (description) {
        parts.push(description);
      }
    }

    // Include subordinates flag
    if (simple.includeSubordinates) {
      parts.push("including all subordinates");
    }

    return parts;
  }

  /**
   * Describe advanced targeting criteria in natural language.
   */
  describeAdvancedCriteria(advanced: AdvancedTargetingDto): string[] {
    const parts: string[] = [];

    // Job titles
    if (advanced.jobTitles && advanced.jobTitles.length > 0) {
      parts.push(this.describeJobTitleFilter(advanced.jobTitles));
    }

    // Manager hierarchy
    if (advanced.managerHierarchyDepth !== undefined) {
      parts.push(this.describeHierarchyFilter(advanced.managerHierarchyDepth));
    }

    // Tenure
    if (
      advanced.tenureMinDays !== undefined ||
      advanced.tenureMaxDays !== undefined
    ) {
      parts.push(
        this.describeTenureFilter(
          advanced.tenureMinDays,
          advanced.tenureMaxDays,
        ),
      );
    }

    // Compliance roles
    if (advanced.complianceRoles && advanced.complianceRoles.length > 0) {
      parts.push(`compliance roles: ${advanced.complianceRoles.join(", ")}`);
    }

    // Job levels
    if (advanced.jobLevels && advanced.jobLevels.length > 0) {
      parts.push(`levels: ${advanced.jobLevels.join(", ")}`);
    }

    // Primary languages
    if (advanced.primaryLanguages && advanced.primaryLanguages.length > 0) {
      parts.push(`languages: ${advanced.primaryLanguages.join(", ")}`);
    }

    // Work modes
    if (advanced.workModes && advanced.workModes.length > 0) {
      parts.push(`${advanced.workModes.join("/")} workers`);
    }

    // Previous campaign responses
    if (
      advanced.previousCampaignResponses &&
      advanced.previousCampaignResponses.length > 0
    ) {
      parts.push(
        `${advanced.previousCampaignResponses.length} campaign history filters`,
      );
    }

    // Exclusions
    if (advanced.exclusions && advanced.exclusions.length > 0) {
      parts.push(`excluding ${advanced.exclusions.length} employees`);
    }

    // Custom attributes
    if (
      advanced.customAttributes &&
      Object.keys(advanced.customAttributes).length > 0
    ) {
      parts.push(
        `${Object.keys(advanced.customAttributes).length} custom attribute filters`,
      );
    }

    return parts;
  }

  /**
   * Describe department filter with resolved names.
   * @example "Finance, HR, Legal departments"
   */
  async describeDepartmentFilter(
    departmentIds: string[],
    organizationId: string,
  ): Promise<string | null> {
    const names = await this.resolveDepartmentNames(
      departmentIds,
      organizationId,
    );
    if (names.length === 0) {
      return null;
    }

    if (names.length === 1) {
      return `${names[0]} department`;
    } else if (names.length <= 3) {
      return `${names.join(", ")} departments`;
    } else {
      return `${names.length} selected departments`;
    }
  }

  /**
   * Describe business unit filter with resolved names.
   * @example "Healthcare, Tech business units"
   */
  async describeBusinessUnitFilter(
    businessUnitIds: string[],
    organizationId: string,
  ): Promise<string | null> {
    const names = await this.resolveBusinessUnitNames(
      businessUnitIds,
      organizationId,
    );
    if (names.length === 0) {
      return null;
    }

    if (names.length === 1) {
      return `${names[0]} business unit`;
    } else if (names.length <= 3) {
      return `${names.join(", ")} business units`;
    } else {
      return `${names.length} selected business units`;
    }
  }

  /**
   * Describe division filter with resolved names.
   * @example "North America division"
   */
  async describeDivisionFilter(
    divisionIds: string[],
    organizationId: string,
  ): Promise<string | null> {
    const names = await this.resolveDivisionNames(divisionIds, organizationId);
    if (names.length === 0) {
      return null;
    }

    if (names.length === 1) {
      return `${names[0]} division`;
    } else {
      return `${names.length} selected divisions`;
    }
  }

  /**
   * Describe location filter with resolved names.
   * @example "US, UK, Germany locations"
   */
  async describeLocationFilter(
    locationIds: string[],
    organizationId: string,
  ): Promise<string | null> {
    const names = await this.resolveLocationNames(locationIds, organizationId);
    if (names.length === 0) {
      return null;
    }

    if (names.length === 1) {
      return `${names[0]} location`;
    } else if (names.length <= 3) {
      return `${names.join(", ")} locations`;
    } else {
      return `${names.length} selected locations`;
    }
  }

  /**
   * Describe job title filter.
   * @example "job titles containing Manager, Director, VP"
   */
  describeJobTitleFilter(titles: string[]): string {
    if (titles.length <= 3) {
      return `job titles containing ${titles.join(", ")}`;
    } else {
      return `${titles.length} selected job titles`;
    }
  }

  /**
   * Describe hierarchy depth filter.
   * @example "managers only" or "managers with 2+ reports"
   */
  describeHierarchyFilter(depth: number): string {
    if (depth === 1) {
      return "managers only";
    } else if (depth > 1) {
      return `managers with ${depth}+ reports`;
    }
    return "all employees";
  }

  /**
   * Describe tenure filter.
   * @example "90+ days tenure" or "between 30-90 days tenure"
   */
  describeTenureFilter(minDays?: number, maxDays?: number): string {
    if (minDays !== undefined && maxDays !== undefined) {
      return `between ${minDays}-${maxDays} days tenure`;
    } else if (minDays !== undefined) {
      return `${minDays}+ days tenure`;
    } else if (maxDays !== undefined) {
      return `less than ${maxDays} days tenure`;
    }
    return "";
  }

  // ============================================
  // Name Resolution Methods
  // ============================================

  /**
   * Resolve department IDs to display names.
   */
  async resolveDepartmentNames(
    departmentIds: string[],
    organizationId: string,
  ): Promise<string[]> {
    const departments = await this.prisma.department.findMany({
      where: { id: { in: departmentIds }, organizationId },
      select: { name: true },
    });
    return departments.map((d) => d.name);
  }

  /**
   * Resolve business unit IDs to display names.
   */
  async resolveBusinessUnitNames(
    businessUnitIds: string[],
    organizationId: string,
  ): Promise<string[]> {
    const units = await this.prisma.businessUnit.findMany({
      where: { id: { in: businessUnitIds }, organizationId },
      select: { name: true },
    });
    return units.map((u) => u.name);
  }

  /**
   * Resolve division IDs to display names.
   */
  async resolveDivisionNames(
    divisionIds: string[],
    organizationId: string,
  ): Promise<string[]> {
    const divisions = await this.prisma.division.findMany({
      where: { id: { in: divisionIds }, organizationId },
      select: { name: true },
    });
    return divisions.map((d) => d.name);
  }

  /**
   * Resolve location IDs to display names.
   */
  async resolveLocationNames(
    locationIds: string[],
    organizationId: string,
  ): Promise<string[]> {
    const locations = await this.prisma.location.findMany({
      where: { id: { in: locationIds }, organizationId },
      select: { name: true },
    });
    return locations.map((l) => l.name);
  }

  /**
   * Get human-readable language label from ISO code.
   */
  getLanguageLabel(code: string): string {
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
