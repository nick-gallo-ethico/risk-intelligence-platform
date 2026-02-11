/**
 * ReportFieldRegistryService - Dynamic field discovery for report designer
 *
 * Provides comprehensive field catalogs for all reportable entity types.
 * Fields include:
 * - Static fields from Prisma schema (hardcoded but comprehensive)
 * - Dynamic custom properties per tenant from CustomPropertyDefinition
 * - Relationship traversal (e.g., case.category.name)
 * - Field metadata: label, type, group, filterable, sortable, groupable, aggregatable
 *
 * This is separate from QueryToPrismaService which is a security whitelist for AI queries.
 * The FieldRegistry is for the UI field picker in the report designer.
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ReportFieldDto, ReportFieldGroupDto } from "./dto/report.dto";
import {
  ReportEntityType,
  ReportFieldType,
} from "./entities/saved-report.entity";

/**
 * Internal field definition with full metadata
 */
interface FieldDefinition {
  id: string;
  label: string;
  type: ReportFieldType;
  group: string;
  prismaField: string;
  filterable: boolean;
  sortable: boolean;
  groupable: boolean;
  aggregatable: boolean;
  enumValues?: string[];
  isComputed?: boolean;
  isCustomProperty?: boolean;
  joinPath?: string;
}

/**
 * Static field registries for each entity type
 */
const ENTITY_FIELD_REGISTRIES: Record<string, FieldDefinition[]> = {
  // ==========================================
  // CASES - Primary compliance work container
  // ==========================================
  cases: [
    // Case Details
    {
      id: "id",
      label: "Case ID",
      type: "uuid",
      group: "Case Details",
      prismaField: "id",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "referenceNumber",
      label: "Reference Number",
      type: "string",
      group: "Case Details",
      prismaField: "referenceNumber",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "status",
      label: "Status",
      type: "enum",
      group: "Case Details",
      prismaField: "status",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["NEW", "IN_PROGRESS", "PENDING", "CLOSED", "MERGED"],
    },
    {
      id: "outcome",
      label: "Outcome",
      type: "enum",
      group: "Case Details",
      prismaField: "outcome",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "SUBSTANTIATED",
        "UNSUBSTANTIATED",
        "INCONCLUSIVE",
        "NO_ACTION_REQUIRED",
        "REFERRED",
      ],
    },
    {
      id: "pipelineStage",
      label: "Pipeline Stage",
      type: "string",
      group: "Case Details",
      prismaField: "pipelineStage",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "severity",
      label: "Severity",
      type: "enum",
      group: "Case Details",
      prismaField: "severity",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    {
      id: "caseType",
      label: "Case Type",
      type: "enum",
      group: "Case Details",
      prismaField: "caseType",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "REPORT",
        "REQUEST_INFO",
        "QUESTION",
        "COMPLIMENT",
        "FOLLOW_UP",
      ],
    },
    {
      id: "sourceChannel",
      label: "Source Channel",
      type: "enum",
      group: "Case Details",
      prismaField: "sourceChannel",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "PHONE",
        "WEB_FORM",
        "EMAIL",
        "CHATBOT",
        "PROXY",
        "IMPORTED",
      ],
    },
    {
      id: "tags",
      label: "Tags",
      type: "string",
      group: "Case Details",
      prismaField: "tags",
      filterable: true,
      sortable: false,
      groupable: false,
      aggregatable: false,
    },

    // Classification
    {
      id: "primaryCategoryId",
      label: "Primary Category ID",
      type: "uuid",
      group: "Classification",
      prismaField: "primaryCategoryId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "primaryCategoryName",
      label: "Primary Category",
      type: "string",
      group: "Classification",
      prismaField: "primaryCategory.name",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      joinPath: "primaryCategory",
    },
    {
      id: "secondaryCategoryId",
      label: "Secondary Category ID",
      type: "uuid",
      group: "Classification",
      prismaField: "secondaryCategoryId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "secondaryCategoryName",
      label: "Secondary Category",
      type: "string",
      group: "Classification",
      prismaField: "secondaryCategory.name",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      joinPath: "secondaryCategory",
    },

    // Assignment
    {
      id: "createdById",
      label: "Created By ID",
      type: "uuid",
      group: "Assignment",
      prismaField: "createdById",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "createdByName",
      label: "Created By",
      type: "string",
      group: "Assignment",
      prismaField: "createdBy.firstName",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      joinPath: "createdBy",
    },
    {
      id: "intakeOperatorId",
      label: "Intake Operator ID",
      type: "uuid",
      group: "Assignment",
      prismaField: "intakeOperatorId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "intakeOperatorName",
      label: "Intake Operator",
      type: "string",
      group: "Assignment",
      prismaField: "intakeOperator.firstName",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      joinPath: "intakeOperator",
    },

    // Reporter
    {
      id: "reporterType",
      label: "Reporter Type",
      type: "enum",
      group: "Reporter",
      prismaField: "reporterType",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["ANONYMOUS", "CONFIDENTIAL", "IDENTIFIED"],
    },
    {
      id: "reporterAnonymous",
      label: "Is Anonymous",
      type: "boolean",
      group: "Reporter",
      prismaField: "reporterAnonymous",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "reporterRelationship",
      label: "Reporter Relationship",
      type: "enum",
      group: "Reporter",
      prismaField: "reporterRelationship",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "EMPLOYEE",
        "FORMER_EMPLOYEE",
        "CONTRACTOR",
        "VENDOR",
        "CUSTOMER",
        "OTHER",
      ],
    },

    // Location
    {
      id: "locationCity",
      label: "City",
      type: "string",
      group: "Location",
      prismaField: "locationCity",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "locationState",
      label: "State/Province",
      type: "string",
      group: "Location",
      prismaField: "locationState",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "locationCountry",
      label: "Country",
      type: "string",
      group: "Location",
      prismaField: "locationCountry",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },

    // Timestamps
    {
      id: "createdAt",
      label: "Created At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "createdAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "updatedAt",
      label: "Updated At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "updatedAt",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "intakeTimestamp",
      label: "Intake Time",
      type: "datetime",
      group: "Timestamps",
      prismaField: "intakeTimestamp",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "outcomeAt",
      label: "Outcome At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "outcomeAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "releasedAt",
      label: "Released At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "releasedAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },

    // Metrics (computed)
    {
      id: "daysOpen",
      label: "Days Open",
      type: "number",
      group: "Metrics",
      prismaField: "daysOpen",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: true,
      isComputed: true,
    },

    // AI Fields
    {
      id: "aiSummary",
      label: "AI Summary",
      type: "string",
      group: "AI",
      prismaField: "aiSummary",
      filterable: false,
      sortable: false,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "aiConfidenceScore",
      label: "AI Confidence",
      type: "number",
      group: "AI",
      prismaField: "aiConfidenceScore",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: true,
    },
  ],

  // ==========================================
  // RIUS - Risk Intelligence Units (immutable inputs)
  // ==========================================
  rius: [
    // RIU Details
    {
      id: "id",
      label: "RIU ID",
      type: "uuid",
      group: "RIU Details",
      prismaField: "id",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "referenceNumber",
      label: "Reference Number",
      type: "string",
      group: "RIU Details",
      prismaField: "referenceNumber",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "type",
      label: "RIU Type",
      type: "enum",
      group: "RIU Details",
      prismaField: "type",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "HOTLINE_REPORT",
        "WEB_FORM_SUBMISSION",
        "DISCLOSURE_RESPONSE",
        "EMAIL_INTAKE",
        "CHATBOT_TRANSCRIPT",
      ],
    },
    {
      id: "status",
      label: "Status",
      type: "enum",
      group: "RIU Details",
      prismaField: "status",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["PENDING_QA", "IN_QA", "RELEASED", "REJECTED"],
    },
    {
      id: "severity",
      label: "Severity",
      type: "enum",
      group: "RIU Details",
      prismaField: "severity",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },

    // Source
    {
      id: "sourceChannel",
      label: "Source Channel",
      type: "enum",
      group: "Source",
      prismaField: "sourceChannel",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["PHONE", "WEB_FORM", "EMAIL", "CHATBOT", "PROXY"],
    },
    {
      id: "campaignId",
      label: "Campaign ID",
      type: "uuid",
      group: "Source",
      prismaField: "campaignId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },

    // Classification
    {
      id: "categoryId",
      label: "Category ID",
      type: "uuid",
      group: "Classification",
      prismaField: "categoryId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "categoryName",
      label: "Category",
      type: "string",
      group: "Classification",
      prismaField: "category.name",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      joinPath: "category",
    },

    // Reporter
    {
      id: "reporterType",
      label: "Reporter Type",
      type: "enum",
      group: "Reporter",
      prismaField: "reporterType",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["ANONYMOUS", "CONFIDENTIAL", "IDENTIFIED"],
    },

    // Location
    {
      id: "locationCity",
      label: "City",
      type: "string",
      group: "Location",
      prismaField: "locationCity",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "locationState",
      label: "State/Province",
      type: "string",
      group: "Location",
      prismaField: "locationState",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "locationCountry",
      label: "Country",
      type: "string",
      group: "Location",
      prismaField: "locationCountry",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },

    // Timestamps
    {
      id: "createdAt",
      label: "Created At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "createdAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },

    // AI Fields
    {
      id: "aiSummary",
      label: "AI Summary",
      type: "string",
      group: "AI",
      prismaField: "aiSummary",
      filterable: false,
      sortable: false,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "aiRiskScore",
      label: "AI Risk Score",
      type: "number",
      group: "AI",
      prismaField: "aiRiskScore",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: true,
    },
    {
      id: "aiLanguageDetected",
      label: "Language Detected",
      type: "string",
      group: "AI",
      prismaField: "aiLanguageDetected",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
  ],

  // ==========================================
  // PERSONS - Individuals in the system
  // ==========================================
  persons: [
    // Person Details
    {
      id: "id",
      label: "Person ID",
      type: "uuid",
      group: "Person Details",
      prismaField: "id",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "type",
      label: "Person Type",
      type: "enum",
      group: "Person Details",
      prismaField: "type",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "EMPLOYEE",
        "SUBJECT",
        "WITNESS",
        "EXTERNAL_CONTACT",
        "UNKNOWN",
      ],
    },
    {
      id: "source",
      label: "Source",
      type: "enum",
      group: "Person Details",
      prismaField: "source",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["HRIS", "MANUAL", "INTAKE", "DISCLOSURE"],
    },
    {
      id: "status",
      label: "Status",
      type: "enum",
      group: "Person Details",
      prismaField: "status",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["ACTIVE", "INACTIVE", "TERMINATED", "MERGED"],
    },

    // Employment
    {
      id: "employeeId",
      label: "Employee ID",
      type: "string",
      group: "Employment",
      prismaField: "employeeId",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "jobTitle",
      label: "Job Title",
      type: "string",
      group: "Employment",
      prismaField: "jobTitle",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "employmentStatus",
      label: "Employment Status",
      type: "string",
      group: "Employment",
      prismaField: "employmentStatus",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },

    // Organization
    {
      id: "businessUnitId",
      label: "Business Unit ID",
      type: "uuid",
      group: "Organization",
      prismaField: "businessUnitId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "businessUnitName",
      label: "Business Unit",
      type: "string",
      group: "Organization",
      prismaField: "businessUnitName",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "locationId",
      label: "Location ID",
      type: "uuid",
      group: "Organization",
      prismaField: "locationId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "locationName",
      label: "Location",
      type: "string",
      group: "Organization",
      prismaField: "locationName",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "managerId",
      label: "Manager ID",
      type: "uuid",
      group: "Organization",
      prismaField: "managerId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "managerName",
      label: "Manager",
      type: "string",
      group: "Organization",
      prismaField: "managerName",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },

    // Timestamps
    {
      id: "createdAt",
      label: "Created At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "createdAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "updatedAt",
      label: "Updated At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "updatedAt",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
  ],

  // ==========================================
  // CAMPAIGNS - Disclosure/attestation campaigns
  // ==========================================
  campaigns: [
    // Campaign Details
    {
      id: "id",
      label: "Campaign ID",
      type: "uuid",
      group: "Campaign Details",
      prismaField: "id",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "name",
      label: "Name",
      type: "string",
      group: "Campaign Details",
      prismaField: "name",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "type",
      label: "Campaign Type",
      type: "enum",
      group: "Campaign Details",
      prismaField: "type",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["DISCLOSURE", "ATTESTATION", "SURVEY"],
    },
    {
      id: "status",
      label: "Status",
      type: "enum",
      group: "Campaign Details",
      prismaField: "status",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "DRAFT",
        "SCHEDULED",
        "ACTIVE",
        "PAUSED",
        "COMPLETED",
        "CANCELLED",
      ],
    },
    {
      id: "version",
      label: "Version",
      type: "number",
      group: "Campaign Details",
      prismaField: "version",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },

    // Schedule
    {
      id: "launchAt",
      label: "Scheduled Launch",
      type: "datetime",
      group: "Schedule",
      prismaField: "launchAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "launchedAt",
      label: "Actual Launch",
      type: "datetime",
      group: "Schedule",
      prismaField: "launchedAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "dueDate",
      label: "Due Date",
      type: "datetime",
      group: "Schedule",
      prismaField: "dueDate",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "expiresAt",
      label: "Expiration",
      type: "datetime",
      group: "Schedule",
      prismaField: "expiresAt",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },

    // Audience
    {
      id: "audienceMode",
      label: "Audience Mode",
      type: "enum",
      group: "Audience",
      prismaField: "audienceMode",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["ALL", "SEGMENT", "MANUAL"],
    },
    {
      id: "totalAssignments",
      label: "Total Assignments",
      type: "number",
      group: "Audience",
      prismaField: "totalAssignments",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: true,
    },

    // Progress
    {
      id: "completedAssignments",
      label: "Completed",
      type: "number",
      group: "Progress",
      prismaField: "completedAssignments",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: true,
    },
    {
      id: "overdueAssignments",
      label: "Overdue",
      type: "number",
      group: "Progress",
      prismaField: "overdueAssignments",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: true,
    },
    {
      id: "completionPercentage",
      label: "Completion %",
      type: "number",
      group: "Progress",
      prismaField: "completionPercentage",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: true,
    },

    // Timestamps
    {
      id: "createdAt",
      label: "Created At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "createdAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "updatedAt",
      label: "Updated At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "updatedAt",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
  ],

  // ==========================================
  // POLICIES - Policy documents
  // ==========================================
  policies: [
    // Policy Details
    {
      id: "id",
      label: "Policy ID",
      type: "uuid",
      group: "Policy Details",
      prismaField: "id",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "title",
      label: "Title",
      type: "string",
      group: "Policy Details",
      prismaField: "title",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "slug",
      label: "Slug",
      type: "string",
      group: "Policy Details",
      prismaField: "slug",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "policyType",
      label: "Policy Type",
      type: "enum",
      group: "Policy Details",
      prismaField: "policyType",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["POLICY", "PROCEDURE", "GUIDELINE", "STANDARD"],
    },
    {
      id: "category",
      label: "Category",
      type: "string",
      group: "Policy Details",
      prismaField: "category",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "status",
      label: "Status",
      type: "enum",
      group: "Policy Details",
      prismaField: "status",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "DRAFT",
        "PENDING_REVIEW",
        "APPROVED",
        "PUBLISHED",
        "RETIRED",
      ],
    },

    // Version
    {
      id: "currentVersion",
      label: "Current Version",
      type: "number",
      group: "Version",
      prismaField: "currentVersion",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },

    // Ownership
    {
      id: "ownerId",
      label: "Owner ID",
      type: "uuid",
      group: "Ownership",
      prismaField: "ownerId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "ownerName",
      label: "Owner",
      type: "string",
      group: "Ownership",
      prismaField: "owner.firstName",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      joinPath: "owner",
    },

    // Dates
    {
      id: "effectiveDate",
      label: "Effective Date",
      type: "date",
      group: "Dates",
      prismaField: "effectiveDate",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "reviewDate",
      label: "Review Date",
      type: "date",
      group: "Dates",
      prismaField: "reviewDate",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "retiredAt",
      label: "Retired At",
      type: "datetime",
      group: "Dates",
      prismaField: "retiredAt",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },

    // Timestamps
    {
      id: "createdAt",
      label: "Created At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "createdAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "updatedAt",
      label: "Updated At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "updatedAt",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
  ],

  // ==========================================
  // DISCLOSURES - Disclosure form submissions
  // ==========================================
  disclosures: [
    // Disclosure Details
    {
      id: "id",
      label: "Disclosure ID",
      type: "uuid",
      group: "Disclosure Details",
      prismaField: "id",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "disclosureType",
      label: "Disclosure Type",
      type: "enum",
      group: "Disclosure Details",
      prismaField: "disclosureType",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "CONFLICT_OF_INTEREST",
        "GIFT",
        "ENTERTAINMENT",
        "OUTSIDE_ACTIVITY",
        "FINANCIAL_INTEREST",
      ],
    },
    {
      id: "status",
      label: "Status",
      type: "enum",
      group: "Disclosure Details",
      prismaField: "status",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "REQUIRES_ACTION",
      ],
    },

    // Review
    {
      id: "riskLevel",
      label: "Risk Level",
      type: "enum",
      group: "Review",
      prismaField: "riskLevel",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["LOW", "MEDIUM", "HIGH"],
    },
    {
      id: "reviewedAt",
      label: "Reviewed At",
      type: "datetime",
      group: "Review",
      prismaField: "reviewedAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },

    // Submitter (from RIU extension)
    {
      id: "submittedByEmployeeId",
      label: "Submitter Employee ID",
      type: "uuid",
      group: "Submitter",
      prismaField: "submittedByEmployeeId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },

    // Timestamps
    {
      id: "submittedAt",
      label: "Submitted At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "submittedAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "createdAt",
      label: "Created At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "createdAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "updatedAt",
      label: "Updated At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "updatedAt",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
  ],

  // ==========================================
  // INVESTIGATIONS - Formal investigations
  // ==========================================
  investigations: [
    // Investigation Details
    {
      id: "id",
      label: "Investigation ID",
      type: "uuid",
      group: "Investigation Details",
      prismaField: "id",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "investigationNumber",
      label: "Investigation #",
      type: "number",
      group: "Investigation Details",
      prismaField: "investigationNumber",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
    {
      id: "caseId",
      label: "Case ID",
      type: "uuid",
      group: "Investigation Details",
      prismaField: "caseId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "investigationType",
      label: "Investigation Type",
      type: "enum",
      group: "Investigation Details",
      prismaField: "investigationType",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["FULL", "PRELIMINARY", "EXPEDITED", "FOLLOW_UP"],
    },
    {
      id: "status",
      label: "Status",
      type: "enum",
      group: "Investigation Details",
      prismaField: "status",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "NEW",
        "IN_PROGRESS",
        "PENDING_REVIEW",
        "ON_HOLD",
        "COMPLETED",
        "CANCELLED",
      ],
    },
    {
      id: "outcome",
      label: "Outcome",
      type: "enum",
      group: "Investigation Details",
      prismaField: "outcome",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "SUBSTANTIATED",
        "UNSUBSTANTIATED",
        "INCONCLUSIVE",
        "PARTIALLY_SUBSTANTIATED",
        "REFERRED",
      ],
    },

    // Assignment
    {
      id: "primaryInvestigatorId",
      label: "Primary Investigator ID",
      type: "uuid",
      group: "Assignment",
      prismaField: "primaryInvestigatorId",
      filterable: true,
      sortable: false,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "primaryInvestigatorName",
      label: "Primary Investigator",
      type: "string",
      group: "Assignment",
      prismaField: "primaryInvestigator.firstName",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      joinPath: "primaryInvestigator",
    },
    {
      id: "department",
      label: "Department",
      type: "enum",
      group: "Assignment",
      prismaField: "department",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: [
        "COMPLIANCE",
        "HR",
        "LEGAL",
        "INTERNAL_AUDIT",
        "SECURITY",
        "OTHER",
      ],
    },

    // Timeline
    {
      id: "dueDate",
      label: "Due Date",
      type: "date",
      group: "Timeline",
      prismaField: "dueDate",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "slaStatus",
      label: "SLA Status",
      type: "enum",
      group: "Timeline",
      prismaField: "slaStatus",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
      enumValues: ["ON_TRACK", "AT_RISK", "OVERDUE"],
    },
    {
      id: "closedAt",
      label: "Closed At",
      type: "datetime",
      group: "Timeline",
      prismaField: "closedAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },

    // Timestamps
    {
      id: "createdAt",
      label: "Created At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "createdAt",
      filterable: true,
      sortable: true,
      groupable: true,
      aggregatable: false,
    },
    {
      id: "updatedAt",
      label: "Updated At",
      type: "datetime",
      group: "Timestamps",
      prismaField: "updatedAt",
      filterable: true,
      sortable: true,
      groupable: false,
      aggregatable: false,
    },
  ],
};

/**
 * Map CustomPropertyDefinition entityType to report entity type
 */
const CUSTOM_PROPERTY_ENTITY_MAP: Record<string, string> = {
  CASE: "cases",
  INVESTIGATION: "investigations",
  PERSON: "persons",
  RIU: "rius",
};

/**
 * Map PropertyDataType to ReportFieldType
 */
const PROPERTY_TYPE_MAP: Record<string, ReportFieldType> = {
  TEXT: "string",
  NUMBER: "number",
  DATE: "date",
  DATETIME: "datetime",
  SELECT: "enum",
  MULTI_SELECT: "enum",
  BOOLEAN: "boolean",
  URL: "string",
  EMAIL: "string",
  PHONE: "string",
};

@Injectable()
export class ReportFieldRegistryService {
  private readonly logger = new Logger(ReportFieldRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all available fields for an entity type, including custom properties.
   *
   * @param entityType The entity type (cases, rius, persons, etc.)
   * @param organizationId The tenant organization ID
   * @returns Array of field definitions
   */
  async getFieldsForEntityType(
    entityType: ReportEntityType,
    organizationId: string,
  ): Promise<ReportFieldDto[]> {
    // Get static fields
    const staticFields = this.getStaticFields(entityType);

    // Get custom properties
    const customFields = await this.getCustomPropertyFields(
      entityType,
      organizationId,
    );

    return [...staticFields, ...customFields];
  }

  /**
   * Get fields organized into groups for UI display.
   *
   * @param entityType The entity type
   * @param organizationId The tenant organization ID
   * @returns Array of field groups with their fields
   */
  async getFieldGroups(
    entityType: ReportEntityType,
    organizationId: string,
  ): Promise<ReportFieldGroupDto[]> {
    const fields = await this.getFieldsForEntityType(
      entityType,
      organizationId,
    );

    // Group fields by their group name
    const groupMap = new Map<string, ReportFieldDto[]>();

    for (const field of fields) {
      const groupName = field.group;
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, []);
      }
      groupMap.get(groupName)!.push(field);
    }

    // Convert to array and sort groups
    const groups: ReportFieldGroupDto[] = [];
    for (const [groupName, groupFields] of groupMap) {
      groups.push({
        groupName,
        fields: groupFields,
      });
    }

    // Sort groups in a logical order
    const groupOrder = [
      "Case Details",
      "RIU Details",
      "Person Details",
      "Campaign Details",
      "Policy Details",
      "Disclosure Details",
      "Investigation Details",
      "Classification",
      "Source",
      "Assignment",
      "Reporter",
      "Employment",
      "Organization",
      "Location",
      "Ownership",
      "Schedule",
      "Audience",
      "Progress",
      "Review",
      "Submitter",
      "Version",
      "Timeline",
      "Dates",
      "Timestamps",
      "Metrics",
      "AI",
      "Custom Properties",
    ];

    groups.sort((a, b) => {
      const aIndex = groupOrder.indexOf(a.groupName);
      const bIndex = groupOrder.indexOf(b.groupName);
      if (aIndex === -1 && bIndex === -1)
        return a.groupName.localeCompare(b.groupName);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return groups;
  }

  /**
   * Get static fields for an entity type from the hardcoded registry.
   */
  private getStaticFields(entityType: ReportEntityType): ReportFieldDto[] {
    const registry = ENTITY_FIELD_REGISTRIES[entityType];
    if (!registry) {
      this.logger.warn(
        `No field registry found for entity type: ${entityType}`,
      );
      return [];
    }

    return registry.map((def) => this.fieldDefinitionToDto(def));
  }

  /**
   * Get custom property fields from the database for this tenant.
   */
  private async getCustomPropertyFields(
    entityType: ReportEntityType,
    organizationId: string,
  ): Promise<ReportFieldDto[]> {
    // Find the CustomPropertyDefinition entityType that maps to this report entity type
    let customPropertyEntityType: string | undefined;
    for (const [propEntityType, reportEntityType] of Object.entries(
      CUSTOM_PROPERTY_ENTITY_MAP,
    )) {
      if (reportEntityType === entityType) {
        customPropertyEntityType = propEntityType;
        break;
      }
    }

    if (!customPropertyEntityType) {
      // No custom property support for this entity type
      return [];
    }

    try {
      const customProperties =
        await this.prisma.customPropertyDefinition.findMany({
          where: {
            organizationId,
            entityType: customPropertyEntityType as any,
            isActive: true,
          },
          orderBy: [{ groupName: "asc" }, { displayOrder: "asc" }],
        });

      return customProperties.map((prop) => ({
        id: `custom_${prop.key}`,
        label: prop.name,
        type: PROPERTY_TYPE_MAP[prop.dataType] || "string",
        group: prop.groupName || "Custom Properties",
        prismaField: `customFields.${prop.key}`,
        filterable: true,
        sortable: prop.dataType !== "MULTI_SELECT",
        groupable: ["SELECT", "BOOLEAN"].includes(prop.dataType),
        aggregatable: prop.dataType === "NUMBER",
        enumValues: prop.options
          ? (prop.options as any)?.options?.map((o: any) => o.value || o)
          : undefined,
        isCustomProperty: true,
      }));
    } catch (error) {
      this.logger.error(
        `Error fetching custom properties for ${entityType}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Convert internal field definition to DTO.
   */
  private fieldDefinitionToDto(def: FieldDefinition): ReportFieldDto {
    return {
      id: def.id,
      label: def.label,
      type: def.type,
      group: def.group,
      prismaField: def.prismaField,
      filterable: def.filterable,
      sortable: def.sortable,
      groupable: def.groupable,
      aggregatable: def.aggregatable,
      enumValues: def.enumValues,
      isComputed: def.isComputed,
      isCustomProperty: def.isCustomProperty,
      joinPath: def.joinPath,
    };
  }

  /**
   * Get all supported entity types.
   */
  getSupportedEntityTypes(): ReportEntityType[] {
    return Object.keys(ENTITY_FIELD_REGISTRIES) as ReportEntityType[];
  }

  /**
   * Get field count for an entity type (including custom properties).
   */
  async getFieldCount(
    entityType: ReportEntityType,
    organizationId: string,
  ): Promise<number> {
    const fields = await this.getFieldsForEntityType(
      entityType,
      organizationId,
    );
    return fields.length;
  }

  /**
   * Validate that a list of field IDs are valid for an entity type.
   */
  async validateFields(
    entityType: ReportEntityType,
    organizationId: string,
    fieldIds: string[],
  ): Promise<{ valid: boolean; invalidFields: string[] }> {
    const fields = await this.getFieldsForEntityType(
      entityType,
      organizationId,
    );
    const validFieldIds = new Set(fields.map((f) => f.id));

    const invalidFields = fieldIds.filter((id) => !validFieldIds.has(id));

    return {
      valid: invalidFields.length === 0,
      invalidFields,
    };
  }

  /**
   * Get a single field definition by ID.
   */
  async getFieldById(
    entityType: ReportEntityType,
    organizationId: string,
    fieldId: string,
  ): Promise<ReportFieldDto | undefined> {
    const fields = await this.getFieldsForEntityType(
      entityType,
      organizationId,
    );
    return fields.find((f) => f.id === fieldId);
  }
}
