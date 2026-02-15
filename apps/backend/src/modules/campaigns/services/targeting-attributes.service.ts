import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AudienceDescriptionService } from "./audience-description.service";
import { TargetingAttributeDto } from "../dto/campaign-targeting.dto";

/**
 * TargetingAttributesService handles HRIS attribute discovery for the targeting UI.
 *
 * This service extracts the attribute discovery logic from CampaignTargetingService,
 * providing focused responsibility for:
 * - Querying available organizational structure attributes (divisions, business units, departments, locations)
 * - Querying position attributes (job titles, job levels)
 * - Querying employment attributes (work modes, languages)
 * - Building TargetingAttributeDto arrays for UI population
 *
 * Used by CampaignTargetingService as a thin coordinator delegate.
 */
@Injectable()
export class TargetingAttributesService {
  private readonly logger = new Logger(TargetingAttributesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audienceDescriptionService: AudienceDescriptionService,
  ) {}

  /**
   * Get available targeting attributes for the organization.
   * Used to populate the targeting UI with available options.
   *
   * Returns attributes categorized by:
   * - Organization Structure: divisions, business units, departments, locations
   * - Position: job titles, job levels
   * - Employment: work modes, tenure
   * - Compliance: compliance roles
   * - Employee Preferences: primary languages
   * - Hierarchy: include subordinates toggle
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
}
