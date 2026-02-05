import { Injectable } from "@nestjs/common";
import { MigrationSourceType } from "@prisma/client";
import {
  BaseMigrationConnector,
  FieldMapping,
  MigrationTargetEntity,
} from "./base.connector";

/**
 * Known NAVEX EthicsPoint column names
 * Based on typical EthicsPoint export formats
 */
const NAVEX_COLUMNS = [
  "Case Number",
  "Case ID",
  "Case Type",
  "Incident Type",
  "Issue Type",
  "Case Status",
  "Status",
  "Date Reported",
  "Date Created",
  "Date Closed",
  "Incident Date",
  "Reporter Type",
  "Anonymous",
  "Location",
  "Facility",
  "Site",
  "Department",
  "Business Unit",
  "Description",
  "Narrative",
  "Summary",
  "Resolution",
  "Outcome",
  "Assigned To",
  "Investigator",
  "Priority",
  "Severity",
  "Category",
  "Subcategory",
  "Country",
  "State",
  "City",
  "Subject Name",
  "Accused Name",
  "Reporter Name",
  "Reporter Email",
  "Employee ID",
];

/**
 * NAVEX category mappings to platform categories
 */
const NAVEX_CATEGORY_MAPPINGS: Record<string, string> = {
  Harassment: "Harassment",
  "Sexual Harassment": "Harassment",
  Discrimination: "Discrimination",
  "Racial Discrimination": "Discrimination",
  "Age Discrimination": "Discrimination",
  "Gender Discrimination": "Discrimination",
  Fraud: "Fraud",
  "Financial Fraud": "Fraud",
  Theft: "Theft",
  "Conflict of Interest": "Conflict of Interest",
  COI: "Conflict of Interest",
  "Ethics Violation": "Ethics Violation",
  "Code of Conduct": "Ethics Violation",
  Safety: "Safety Concern",
  "Workplace Safety": "Safety Concern",
  "Safety Concern": "Safety Concern",
  Retaliation: "Retaliation",
  "Substance Abuse": "Substance Abuse",
  "Drug/Alcohol": "Substance Abuse",
  Violence: "Workplace Violence",
  "Workplace Violence": "Workplace Violence",
  Bullying: "Bullying",
  "Hostile Work Environment": "Hostile Work Environment",
  Corruption: "Corruption",
  Bribery: "Bribery",
  "FCPA Violation": "Bribery",
  "Privacy Violation": "Privacy Violation",
  "Data Breach": "Privacy Violation",
  "Regulatory Violation": "Regulatory Violation",
  Compliance: "Regulatory Violation",
  Other: "Other",
  Unknown: "Other",
  General: "Other",
};

/**
 * NAVEX status mappings to platform status
 */
const NAVEX_STATUS_MAPPINGS: Record<string, string> = {
  Open: "OPEN",
  open: "OPEN",
  New: "NEW",
  new: "NEW",
  Received: "NEW",
  received: "NEW",
  "In Progress": "IN_PROGRESS",
  "in progress": "IN_PROGRESS",
  Active: "IN_PROGRESS",
  active: "IN_PROGRESS",
  Investigating: "IN_PROGRESS",
  investigating: "IN_PROGRESS",
  "Under Investigation": "IN_PROGRESS",
  Pending: "PENDING",
  pending: "PENDING",
  "Pending Response": "PENDING_RESPONSE",
  "Awaiting Response": "PENDING_RESPONSE",
  "Awaiting Information": "PENDING_RESPONSE",
  Closed: "CLOSED",
  closed: "CLOSED",
  Resolved: "CLOSED",
  resolved: "CLOSED",
  Complete: "CLOSED",
  Completed: "CLOSED",
  completed: "CLOSED",
  Dismissed: "DISMISSED",
  dismissed: "DISMISSED",
  "No Action Required": "DISMISSED",
};

/**
 * NAVEX severity mappings to platform severity
 */
const NAVEX_SEVERITY_MAPPINGS: Record<string, string> = {
  High: "HIGH",
  high: "HIGH",
  Critical: "HIGH",
  critical: "HIGH",
  Urgent: "HIGH",
  urgent: "HIGH",
  "3": "HIGH",
  Medium: "MEDIUM",
  medium: "MEDIUM",
  Moderate: "MEDIUM",
  moderate: "MEDIUM",
  Normal: "MEDIUM",
  normal: "MEDIUM",
  "2": "MEDIUM",
  Low: "LOW",
  low: "LOW",
  Minor: "LOW",
  minor: "LOW",
  "1": "LOW",
};

/**
 * NAVEX EthicsPoint connector
 * Parses exports from NAVEX Global's EthicsPoint system
 */
@Injectable()
export class NavexConnector extends BaseMigrationConnector {
  readonly sourceType = MigrationSourceType.NAVEX;

  /**
   * Calculate confidence that headers match NAVEX format
   */
  protected calculateConfidence(headers: string[]): number {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

    // Count matches against known NAVEX columns
    const matchCount = NAVEX_COLUMNS.filter((col) =>
      normalizedHeaders.some(
        (h) =>
          h === col.toLowerCase() ||
          h.includes(col.toLowerCase()) ||
          col.toLowerCase().includes(h),
      ),
    ).length;

    // NAVEX files typically have specific identifying columns
    const hasNavexIdentifiers =
      normalizedHeaders.some(
        (h) => h.includes("case number") || h.includes("case id"),
      ) &&
      normalizedHeaders.some(
        (h) =>
          h.includes("case type") ||
          h.includes("incident type") ||
          h.includes("issue type"),
      );

    // Base confidence from column matches
    const baseConfidence = matchCount / Math.min(headers.length, 15);

    // Boost confidence if NAVEX identifiers are present
    const confidence = hasNavexIdentifiers
      ? Math.min(baseConfidence + 0.3, 1.0)
      : baseConfidence;

    return confidence;
  }

  /**
   * Get suggested field mappings for NAVEX exports
   */
  getSuggestedMappings(): FieldMapping[] {
    return [
      // Case identifiers
      {
        sourceField: "Case Number",
        targetField: "referenceNumber",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Unique case identifier from EthicsPoint",
      },
      {
        sourceField: "Case ID",
        targetField: "referenceNumber",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Alternate case identifier field",
      },

      // Classification
      {
        sourceField: "Case Type",
        targetField: "categoryName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: NAVEX_CATEGORY_MAPPINGS },
        description: "Case classification/category",
      },
      {
        sourceField: "Incident Type",
        targetField: "categoryName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: NAVEX_CATEGORY_MAPPINGS },
        description: "Incident type classification",
      },
      {
        sourceField: "Issue Type",
        targetField: "categoryName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: NAVEX_CATEGORY_MAPPINGS },
        description: "Issue type classification",
      },
      {
        sourceField: "Category",
        targetField: "categoryName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: NAVEX_CATEGORY_MAPPINGS },
        description: "Primary category",
      },
      {
        sourceField: "Subcategory",
        targetField: "secondaryCategoryName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        description: "Secondary category",
      },

      // Status
      {
        sourceField: "Case Status",
        targetField: "status",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "mapValue", mappings: NAVEX_STATUS_MAPPINGS },
        description: "Current case status",
      },
      {
        sourceField: "Status",
        targetField: "status",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "mapValue", mappings: NAVEX_STATUS_MAPPINGS },
        description: "Current status",
      },

      // Severity
      {
        sourceField: "Priority",
        targetField: "severity",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: NAVEX_SEVERITY_MAPPINGS },
        description: "Case priority/severity",
      },
      {
        sourceField: "Severity",
        targetField: "severity",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "mapValue", mappings: NAVEX_SEVERITY_MAPPINGS },
        description: "Case severity level",
      },

      // Dates
      {
        sourceField: "Date Reported",
        targetField: "intakeTimestamp",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "parseDate", format: "MM/dd/yyyy" },
        description: "Date the report was received",
      },
      {
        sourceField: "Date Created",
        targetField: "createdAt",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseDate", format: "MM/dd/yyyy" },
        description: "Date the case was created",
      },
      {
        sourceField: "Date Closed",
        targetField: "closedAt",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseDate", format: "MM/dd/yyyy" },
        description: "Date the case was closed",
      },
      {
        sourceField: "Incident Date",
        targetField: "incidentDate",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseDate", format: "MM/dd/yyyy" },
        description: "Date the incident occurred",
      },

      // Reporter information
      {
        sourceField: "Anonymous",
        targetField: "isAnonymous",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "parseBoolean" },
        description: "Whether reporter is anonymous",
      },
      {
        sourceField: "Reporter Type",
        targetField: "reporterType",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: false,
        description: "Type of reporter",
      },
      {
        sourceField: "Reporter Name",
        targetField: "reporterName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Name of reporter (if not anonymous)",
      },
      {
        sourceField: "Reporter Email",
        targetField: "reporterEmail",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "extractEmail" },
        description: "Reporter email address",
      },

      // Content
      {
        sourceField: "Description",
        targetField: "details",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Report description/narrative",
      },
      {
        sourceField: "Narrative",
        targetField: "details",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: true,
        transform: { type: "trim" },
        description: "Report narrative",
      },
      {
        sourceField: "Summary",
        targetField: "summary",
        targetEntity: "RIU" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Case summary",
      },
      {
        sourceField: "Resolution",
        targetField: "outcome",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Case resolution/outcome",
      },
      {
        sourceField: "Outcome",
        targetField: "outcome",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Case outcome",
      },

      // Location
      {
        sourceField: "Location",
        targetField: "locationName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Location name",
      },
      {
        sourceField: "Facility",
        targetField: "locationName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Facility name",
      },
      {
        sourceField: "Site",
        targetField: "locationName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Site name",
      },
      {
        sourceField: "City",
        targetField: "locationCity",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "City",
      },
      {
        sourceField: "State",
        targetField: "locationState",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "State/Province",
      },
      {
        sourceField: "Country",
        targetField: "locationCountry",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Country",
      },
      {
        sourceField: "Department",
        targetField: "businessUnitName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Department/Business unit",
      },
      {
        sourceField: "Business Unit",
        targetField: "businessUnitName",
        targetEntity: "Case" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Business unit",
      },

      // Person/Subject
      {
        sourceField: "Subject Name",
        targetField: "name",
        targetEntity: "Person" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Subject/accused person name",
      },
      {
        sourceField: "Accused Name",
        targetField: "name",
        targetEntity: "Person" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Accused person name",
      },
      {
        sourceField: "Employee ID",
        targetField: "employeeId",
        targetEntity: "Person" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Employee ID",
      },

      // Assignment
      {
        sourceField: "Assigned To",
        targetField: "primaryInvestigatorName",
        targetEntity: "Investigation" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Assigned investigator",
      },
      {
        sourceField: "Investigator",
        targetField: "primaryInvestigatorName",
        targetEntity: "Investigation" as MigrationTargetEntity,
        isRequired: false,
        transform: { type: "trim" },
        description: "Primary investigator",
      },
    ];
  }

  /**
   * Get category mapping for custom transform
   */
  getCategoryMappings(): Record<string, string> {
    return NAVEX_CATEGORY_MAPPINGS;
  }

  /**
   * Get status mapping for custom transform
   */
  getStatusMappings(): Record<string, string> {
    return NAVEX_STATUS_MAPPINGS;
  }

  /**
   * Get severity mapping for custom transform
   */
  getSeverityMappings(): Record<string, string> {
    return NAVEX_SEVERITY_MAPPINGS;
  }
}
